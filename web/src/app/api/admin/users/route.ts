import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, getDefaultTenant, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const role = (body.role as Role) || Role.CLIENT;
    const password = String(body.password || "demo1234");

    if (!name || (!email && !phone)) {
      return NextResponse.json({ error: "Nombre y email o celular" }, { status: 400 });
    }
    if (![Role.ADMIN, Role.EMPLOYEE, Role.CLIENT].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        memberships: { create: { tenantId: tenant.id, role } },
        ...(role === Role.EMPLOYEE
          ? {
              employeeProfiles: {
                create: {
                  tenantId: tenant.id,
                  title: body.title || "Empleado",
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email o celular ya existe" }, { status: 409 });
    }
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    const userId = String(body.userId || "");
    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId: tenant.id } },
    });
    if (!membership) return NextResponse.json({ error: "Usuario no del tenant" }, { status: 404 });

    if (body.active !== undefined) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: { active: Boolean(body.active) },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { active: Boolean(body.active) },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
