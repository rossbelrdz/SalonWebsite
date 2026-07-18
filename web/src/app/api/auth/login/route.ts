import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { decryptMfaSecret, verifyMfaToken } from "@/lib/mfa";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");
    const mfaToken = body.mfaToken ? String(body.mfaToken).trim() : "";
    const mfaPending = body.mfaPending ? String(body.mfaPending) : "";

    // Segundo paso: solo MFA
    if (mfaPending && mfaToken) {
      const user = await prisma.user.findFirst({
        where: { mfaPendingToken: mfaPending, active: true },
        include: { memberships: { where: { active: true }, take: 1 } },
      });
      if (!user?.mfaEnabled) {
        return NextResponse.json({ error: "Sesión MFA inválida" }, { status: 401 });
      }
      const secret = decryptMfaSecret(user.mfaSecretEnc);
      if (!secret || !verifyMfaToken(secret, mfaToken)) {
        return NextResponse.json({ error: "Código MFA incorrecto" }, { status: 401 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaPendingToken: null },
      });
      return finishLogin(user);
    }

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Completa correo/celular y contraseña" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
          { email: body.identifier?.trim() },
          { phone: body.identifier?.trim() },
        ],
        active: true,
      },
      include: {
        memberships: {
          where: { active: true },
          take: 1,
        },
      },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    if (user.mfaEnabled && user.mfaSecretEnc) {
      const pending = randomBytes(24).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaPendingToken: pending },
      });
      return NextResponse.json({
        ok: true,
        mfaRequired: true,
        mfaPending: pending,
      });
    }

    return finishLogin(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}

async function finishLogin(user: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isSuperAdmin: boolean;
  memberships: { tenantId: string; role: string }[];
}) {
  const membership = user.memberships[0];
  // Superadmin sin membership: asocia tenant demo para contexto de UI
  let tenantId: string | null = membership?.tenantId ?? null;
  const role = (membership?.role as "ADMIN" | "EMPLOYEE" | "CLIENT") ?? null;
  if (user.isSuperAdmin && !tenantId) {
    const slug = process.env.TENANT_SLUG || "demo";
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    tenantId = tenant?.id ?? null;
  }

  await setSessionCookie({
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin,
    tenantId,
    role,
  });

  let redirect = "/";
  if (user.isSuperAdmin) redirect = "/admin";
  else if (membership?.role === "ADMIN") redirect = "/admin";
  else if (membership?.role === "EMPLOYEE") redirect = "/empleado";
  else redirect = "/mis-citas";

  return NextResponse.json({ ok: true, redirect });
}
