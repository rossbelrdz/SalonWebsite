import { NextResponse } from "next/server";
import { AbsenceStatus, AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultTenant, requireRole, requireAdmin } from "@/lib/auth";
import { Role } from "@prisma/client";
import { notifyAbsenceRequested } from "@/lib/notifications";

/** Lista ausencias del tenant. */
export async function GET() {
  try {
    await requireRole([Role.ADMIN, Role.EMPLOYEE]);
    const tenant = await getDefaultTenant();
    const rows = await prisma.absenceRequest.findMany({
      where: { tenantId: tenant.id },
      include: {
        employee: { include: { user: true } },
        requester: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ items: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/** Empleado/admin solicita ausencia. Candado si hay prepagadas. */
export async function POST(req: Request) {
  try {
    const session = await requireRole([Role.ADMIN, Role.EMPLOYEE]);
    const tenant = await getDefaultTenant();
    const body = await req.json();

    const dateFrom = new Date(String(body.dateFrom));
    const dateTo = new Date(String(body.dateTo || body.dateFrom));
    const reason = String(body.reason || "").trim();

    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    let employeeId = body.employeeId ? String(body.employeeId) : null;
    if (!employeeId) {
      const profile = await prisma.employeeProfile.findFirst({
        where: { userId: session.userId, tenantId: tenant.id },
      });
      employeeId = profile?.id ?? null;
    }
    if (!employeeId) {
      return NextResponse.json({ error: "Perfil de empleado no encontrado" }, { status: 400 });
    }

    const endOfRange = new Date(dateTo);
    endOfRange.setHours(23, 59, 59, 999);

    const prepaidAppts = await prisma.appointment.findMany({
      where: {
        employeeId,
        prepaid: true,
        status: {
          in: [
            AppointmentStatus.PREPAID,
            AppointmentStatus.REASSIGNMENT_PENDING,
            AppointmentStatus.CONFIRMED,
          ],
        },
        startsAt: { gte: dateFrom, lte: endOfRange },
      },
    });

    const prepaidOnly = prepaidAppts.filter((a) => a.prepaid && a.status !== AppointmentStatus.CANCELLED);
    const blocked = prepaidOnly.length > 0;

    const row = await prisma.absenceRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId,
        requestedById: session.userId,
        dateFrom,
        dateTo,
        reason,
        status: blocked ? AbsenceStatus.BLOCKED : AbsenceStatus.PENDING,
        blockedByPrepaid: blocked,
        prepaidCount: prepaidOnly.length,
      },
    });

    void notifyAbsenceRequested(row.id).catch(console.error);

    return NextResponse.json({
      ok: true,
      absence: row,
      blocked,
      prepaidCount: prepaidOnly.length,
      message: blocked
        ? `Candado: hay ${prepaidOnly.length} cita(s) prepagada(s). Reasigna o resuelve antes de aprobar la ausencia.`
        : "Solicitud registrada",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/** Admin aprueba/rechaza (solo si no está bloqueada o ya se resolvieron prepagadas). */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body.id || "");
    const action = String(body.action || ""); // approve | reject | recheck

    const absence = await prisma.absenceRequest.findUnique({ where: { id } });
    if (!absence) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    if (action === "recheck" || action === "approve") {
      const endOfRange = new Date(absence.dateTo);
      endOfRange.setHours(23, 59, 59, 999);
      const prepaid = await prisma.appointment.count({
        where: {
          employeeId: absence.employeeId,
          prepaid: true,
          status: {
            in: [AppointmentStatus.PREPAID, AppointmentStatus.REASSIGNMENT_PENDING],
          },
          startsAt: { gte: absence.dateFrom, lte: endOfRange },
        },
      });

      if (prepaid > 0) {
        await prisma.absenceRequest.update({
          where: { id },
          data: {
            status: AbsenceStatus.BLOCKED,
            blockedByPrepaid: true,
            prepaidCount: prepaid,
          },
        });
        return NextResponse.json({
          ok: false,
          blocked: true,
          prepaidCount: prepaid,
          error: "Aún hay citas prepagadas sin resolver",
        }, { status: 409 });
      }

      if (action === "approve") {
        await prisma.absenceRequest.update({
          where: { id },
          data: {
            status: AbsenceStatus.APPROVED,
            blockedByPrepaid: false,
            prepaidCount: 0,
            adminNote: body.note ? String(body.note) : absence.adminNote,
          },
        });
        return NextResponse.json({ ok: true, status: "APPROVED" });
      }

      await prisma.absenceRequest.update({
        where: { id },
        data: {
          status: AbsenceStatus.PENDING,
          blockedByPrepaid: false,
          prepaidCount: 0,
        },
      });
      return NextResponse.json({ ok: true, status: "PENDING" });
    }

    if (action === "reject") {
      await prisma.absenceRequest.update({
        where: { id },
        data: {
          status: AbsenceStatus.REJECTED,
          adminNote: body.note ? String(body.note) : absence.adminNote,
        },
      });
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
