import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultTenant, requireSession } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";
import { computeCommissions } from "@/lib/commissions";
import { currentQuincena, tenantTimezone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const tenant = await getDefaultTenant();
    const ok = await can(session, "staff.commissions.all", tenant.id);
    if (!ok) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const url = new URL(req.url);
    const tz = tenantTimezone(tenant.settings?.timezone);
    const q = currentQuincena(new Date(), tz);
    const from = url.searchParams.get("from") || q.from;
    const to = url.searchParams.get("to") || q.to;

    const rows = await computeCommissions({
      tenantId: tenant.id,
      from,
      to,
      timeZone: tz,
    });

    return NextResponse.json({ from, to, rows });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

/** Actualizar % de comisión de un empleado. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const tenant = await getDefaultTenant();
    const ok = await can(session, "staff.commissions.all", tenant.id);
    if (!ok) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const employeeId = String(body.employeeId || "");
    const pct = Number(body.commissionPct);
    if (!employeeId || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json(
        { error: "% inválido (0–100)" },
        { status: 400 },
      );
    }

    const emp = await prisma.employeeProfile.findFirst({
      where: { id: employeeId, tenantId: tenant.id },
    });
    if (!emp) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const updated = await prisma.employeeProfile.update({
      where: { id: emp.id },
      data: { commissionPct: Math.round(pct) },
    });

    return NextResponse.json({
      ok: true,
      employeeId: updated.id,
      commissionPct: updated.commissionPct,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
