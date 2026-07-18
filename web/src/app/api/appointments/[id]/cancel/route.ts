import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { refundAppointmentPayment } from "@/lib/payments";
import { notifyAppointmentCancelled } from "@/lib/notifications";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
    }

    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const isOwner = appt.clientUserId === session.userId;
    const isAdmin = session.isSuperAdmin || session.role === "ADMIN";
    const isEmployee = session.role === "EMPLOYEE";

    if (!isOwner && !isAdmin && !isEmployee) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    if (appt.status === AppointmentStatus.CANCELLED) {
      return NextResponse.json({ error: "Ya estaba cancelada" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason ? String(body.reason) : "Cancelada por usuario";

    let refundInfo: { refunded?: boolean; refundCents?: number } | null = null;
    if (appt.prepaid && appt.status === AppointmentStatus.PREPAID) {
      try {
        refundInfo = (await refundAppointmentPayment(id, reason)) as {
          refunded?: boolean;
          refundCents?: number;
        };
      } catch (e) {
        console.error("refund error", e);
        refundInfo = {
          refunded: false,
        };
      }
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    const by = isOwner ? "cliente" : isAdmin ? "admin" : "empleado";
    void notifyAppointmentCancelled(
      id,
      by,
      refundInfo?.refunded ? refundInfo.refundCents : undefined,
    ).catch(console.error);

    return NextResponse.json({ ok: true, refund: refundInfo });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al cancelar" }, { status: 500 });
  }
}
