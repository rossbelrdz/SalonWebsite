import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, hashPassword, verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        passkeys: { select: { id: true, nickname: true, createdAt: true, lastUsedAt: true } },
        pushSubscriptions: { select: { id: true, createdAt: true, userAgent: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      notifyEmail: user.notifyEmail,
      notifyPush: user.notifyPush,
      notifyTelegram: user.notifyTelegram,
      notifyInApp: user.notifyInApp,
      mfaEnabled: user.mfaEnabled,
      telegramChatId: user.telegramChatId,
      passkeys: user.passkeys,
      pushCount: user.pushSubscriptions.length,
      hasPushConfigured: Boolean(
        process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      ),
      vapidPublicKey:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.section === "profile") {
      if (body.name) data.name = String(body.name).trim();
      if (body.email !== undefined) {
        const email = body.email ? String(body.email).trim().toLowerCase() : null;
        if (email) {
          const exists = await prisma.user.findFirst({
            where: { email, NOT: { id: session.userId } },
          });
          if (exists) {
            return NextResponse.json({ error: "Ese correo ya está en uso" }, { status: 409 });
          }
        }
        data.email = email;
      }
      if (body.phone !== undefined) {
        const phone = body.phone ? String(body.phone).trim() : null;
        if (phone) {
          const exists = await prisma.user.findFirst({
            where: { phone, NOT: { id: session.userId } },
          });
          if (exists) {
            return NextResponse.json({ error: "Ese celular ya está en uso" }, { status: 409 });
          }
        }
        data.phone = phone;
      }
    }

    if (body.section === "notifications") {
      if (body.notifyEmail !== undefined) data.notifyEmail = Boolean(body.notifyEmail);
      if (body.notifyPush !== undefined) data.notifyPush = Boolean(body.notifyPush);
      if (body.notifyTelegram !== undefined) data.notifyTelegram = Boolean(body.notifyTelegram);
      if (body.notifyInApp !== undefined) data.notifyInApp = Boolean(body.notifyInApp);
    }

    if (body.section === "password") {
      const current = String(body.currentPassword || "");
      const next = String(body.newPassword || "");
      if (next.length < 6) {
        return NextResponse.json({ error: "Nueva contraseña mínimo 6 caracteres" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      const ok = await verifyPassword(current, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
      }
      data.passwordHash = await hashPassword(next);
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data,
    });

    // refrescar cookie de sesión con nombre/email
    await setSessionCookie({
      userId: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      isSuperAdmin: updated.isSuperAdmin,
      tenantId: session.tenantId,
      role: session.role,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
