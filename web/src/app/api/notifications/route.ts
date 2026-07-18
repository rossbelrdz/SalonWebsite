import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

/** Notificaciones in-app del usuario. */
export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const items = await prisma.notificationLog.findMany({
      where: {
        userId: session.userId,
        channel: "IN_APP",
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        eventType: n.eventType,
        subject: n.subject,
        body: n.body,
        status: n.status,
        createdAt: n.createdAt,
        sentAt: n.sentAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
