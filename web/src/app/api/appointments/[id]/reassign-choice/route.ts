import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import {
  AppointmentStatus,
  ReassignmentChoice,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { refundAppointmentPayment } from "@/lib/payments";
import { notifyReassignmentResolved } from "@/lib/notifications";

/**
 * Cliente elige una de 3 opciones:
 * ACCEPT_NEW | RESCHEDULE | CANCEL_REFUND
 */
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

    const body = await req.json();
    const choice = String(body.choice || "") as ReassignmentChoice;

    if (!["ACCEPT_NEW", "RESCHEDULE", "CANCEL_REFUND"].includes(choice)) {
      return NextResponse.json({ error: "Opción inválida" }, { status: 400 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!appt) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const isOwner = appt.clientUserId === session.userId;
    const isAdmin = session.isSuperAdmin || session.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    if (appt.status !== AppointmentStatus.REASSIGNMENT_PENDING) {
      return NextResponse.json(
        { error: "Esta cita no está en reasignación" },
        { status: 400 },
      );
    }

    if (choice === "ACCEPT_NEW") {
      if (!appt.proposedEmployeeId) {
        return NextResponse.json(
          { error: "No hay profesional propuesto" },
          { status: 400 },
        );
      }
      await prisma.appointment.update({
        where: { id },
        data: {
          employeeId: appt.proposedEmployeeId,
          proposedEmployeeId: null,
          reassignmentChoice: ReassignmentChoice.ACCEPT_NEW,
          status: appt.prepaid ? AppointmentStatus.PREPAID : AppointmentStatus.CONFIRMED,
          reassignmentNote: appt.reassignmentNote,
        },
      });
      void notifyReassignmentResolved(id, "accepted").catch(console.error);
      return NextResponse.json({ ok: true, choice });
    }

    if (choice === "CANCEL_REFUND") {
      let refund: unknown = null;
      if (appt.prepaid) {
        refund = await refundAppointmentPayment(id, "Cliente canceló tras reasignación");
      }
      await prisma.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: "Cliente eligió cancelar (reasignación)",
          reassignmentChoice: ReassignmentChoice.CANCEL_REFUND,
          proposedEmployeeId: null,
        },
      });
      void notifyReassignmentResolved(id, "cancelled").catch(console.error);
      return NextResponse.json({ ok: true, choice, refund });
    }

    // RESCHEDULE
    const date = String(body.date || "");
    const time = String(body.time || "");
    const employeeId = String(body.employeeId || appt.employeeId);
    if (!date || !time) {
      return NextResponse.json(
        { error: "Indica fecha y hora para reagendar" },
        { status: 400 },
      );
    }

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      return NextResponse.json({ error: "Fecha/hora inválida" }, { status: 400 });
    }
    const endsAt = addMinutes(startsAt, appt.service.durationMin);

    const conflict = await prisma.appointment.findFirst({
      where: {
        employeeId,
        id: { not: id },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.PENDING] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) {
      return NextResponse.json({ error: "Horario no disponible" }, { status: 409 });
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        employeeId,
        startsAt,
        endsAt,
        proposedEmployeeId: null,
        reassignmentChoice: ReassignmentChoice.RESCHEDULE,
        status: appt.prepaid ? AppointmentStatus.PREPAID : AppointmentStatus.CONFIRMED,
      },
    });

    void notifyReassignmentResolved(id, "rescheduled").catch(console.error);

    return NextResponse.json({ ok: true, choice });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al procesar opción" }, { status: 500 });
  }
}
