import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notifyReassignment } from "@/lib/notifications";

/** Admin propone reasignación a otro profesional (citas prepagadas u otras). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const proposedEmployeeId = String(body.proposedEmployeeId || "");
    const note = body.note ? String(body.note) : null;

    if (!proposedEmployeeId) {
      return NextResponse.json({ error: "Falta profesional propuesto" }, { status: 400 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!appt) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }
    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.COMPLETED
    ) {
      return NextResponse.json({ error: "Cita no reasignable" }, { status: 400 });
    }

    const link = await prisma.employeeService.findUnique({
      where: {
        employeeId_serviceId: {
          employeeId: proposedEmployeeId,
          serviceId: appt.serviceId,
        },
      },
    });
    if (!link) {
      return NextResponse.json(
        { error: "Ese profesional no ofrece este servicio" },
        { status: 400 },
      );
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        employeeId: proposedEmployeeId,
        id: { not: id },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.PENDING] },
        startsAt: { lt: appt.endsAt },
        endsAt: { gt: appt.startsAt },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "El profesional propuesto ya tiene cita en ese horario" },
        { status: 409 },
      );
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        proposedEmployeeId,
        reassignmentNote: note,
        reassignmentChoice: null,
        status: AppointmentStatus.REASSIGNMENT_PENDING,
      },
    });

    void notifyReassignment(id).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
