import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push";

export async function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const endpoint = String(body.endpoint || "");
    const p256dh = String(body.keys?.p256dh || body.p256dh || "");
    const auth = String(body.keys?.auth || body.auth || "");
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Suscripción incompleta" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.userId,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent") || null,
      },
      create: {
        userId: session.userId,
        endpoint,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent") || null,
      },
    });

    await prisma.user.update({
      where: { id: session.userId },
      data: { notifyPush: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    if (body.endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: session.userId, endpoint: String(body.endpoint) },
      });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId: session.userId } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
