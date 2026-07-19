import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultTenant, requireSession } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";

export const dynamic = "force-dynamic";

/** Marca una cita como COMPLETED (empleado propio o admin). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const tenant = await getDefaultTenant();
    const { id } = await ctx.params;

    const appt = await prisma.appointment.findFirst({
      where: { id, tenantId: tenant.id },
      include: { employee: true },
    });
    if (!appt) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.COMPLETED
    ) {
      return NextResponse.json(
        { error: "La cita no se puede completar" },
        { status: 400 },
      );
    }

    const viewAll = await can(session, "appointments.view.all", tenant.id);
    const isOwn =
      appt.employee.userId === session.userId ||
      (await (async () => {
        const profile = await prisma.employeeProfile.findFirst({
          where: { userId: session.userId, tenantId: tenant.id },
        });
        return profile?.id === appt.employeeId;
      })());

    if (!viewAll && !isOwn && !session.isSuperAdmin) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
