import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultTenant, hashPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { notifyAccountCreated } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const password = String(body.password || "");

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ error: "Correo o celular (al menos uno)" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Contraseña mínimo 6 caracteres" }, { status: 400 });
    }

    if (email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
      }
    }
    if (phone) {
      const exists = await prisma.user.findUnique({ where: { phone } });
      if (exists) {
        return NextResponse.json({ error: "Ese celular ya está registrado" }, { status: 409 });
      }
    }

    const tenant = await getDefaultTenant();
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        memberships: {
          create: {
            tenantId: tenant.id,
            role: Role.CLIENT,
          },
        },
      },
    });

    await setSessionCookie({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isSuperAdmin: false,
      tenantId: tenant.id,
      role: Role.CLIENT,
    });

    void notifyAccountCreated({
      tenantId: tenant.id,
      userId: user.id,
      name: user.name,
      email: user.email,
    }).catch(console.error);

    return NextResponse.json({ ok: true, redirect: "/mis-citas" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
  }
}
