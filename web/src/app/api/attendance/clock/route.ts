import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultTenant, requireSession } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";
import { clockIn, clockOut, getOpenTimeEntry, getTodayEntry } from "@/lib/attendance";
import {
  dayOfWeekInTz,
  tenantTimezone,
  timeHmInTz,
  workDateInTz,
} from "@/lib/timezone";
import { resolveAttendanceStatus, attendanceLabel } from "@/lib/attendance";

export const dynamic = "force-dynamic";

async function employeeForSession(userId: string, tenantId: string) {
  return prisma.employeeProfile.findFirst({
    where: { userId, tenantId, active: true },
    include: {
      branches: { include: { branch: true } },
      schedules: true,
    },
  });
}

export async function GET() {
  try {
    const session = await requireSession();
    const tenant = await getDefaultTenant();
    const ok = await can(session, "staff.attendance.own", tenant.id);
    if (!ok) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const profile = await employeeForSession(session.userId, tenant.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Sin perfil de empleado" },
        { status: 400 },
      );
    }

    const tz = tenantTimezone(tenant.settings?.timezone);
    const now = new Date();
    const workDate = workDateInTz(now, tz);
    const dow = dayOfWeekInTz(now, tz);
    const schedule = profile.schedules.find((s) => s.dayOfWeek === dow) ?? null;
    const entry = await getTodayEntry(profile.id, workDate);
    const open = await getOpenTimeEntry(profile.id);

    const status = resolveAttendanceStatus({
      checkInAt: entry?.checkInAt ?? null,
      checkOutAt: entry?.checkOutAt ?? null,
      scheduleStart: schedule?.startTime ?? null,
      scheduleEnd: schedule?.endTime ?? null,
      now,
      timeZone: tz,
    });

    return NextResponse.json({
      workDate,
      timezone: tz,
      serverNow: now.toISOString(),
      serverTimeHm: timeHmInTz(now, tz),
      schedule: schedule
        ? { start: schedule.startTime, end: schedule.endTime }
        : null,
      entry: entry
        ? {
            id: entry.id,
            checkInAt: entry.checkInAt.toISOString(),
            checkOutAt: entry.checkOutAt?.toISOString() ?? null,
            checkInHm: timeHmInTz(entry.checkInAt, tz),
            checkOutHm: entry.checkOutAt
              ? timeHmInTz(entry.checkOutAt, tz)
              : null,
          }
        : null,
      open: Boolean(open),
      status,
      statusLabel: attendanceLabel(status),
      branches: profile.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const tenant = await getDefaultTenant();
    const ok = await can(session, "staff.attendance.own", tenant.id);
    if (!ok) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const profile = await employeeForSession(session.userId, tenant.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Sin perfil de empleado" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const branchId = body.branchId ? String(body.branchId) : null;
    const tz = tenantTimezone(tenant.settings?.timezone);

    if (action === "in") {
      if (branchId && !profile.branches.some((b) => b.branchId === branchId)) {
        return NextResponse.json(
          { error: "Sucursal no asignada" },
          { status: 400 },
        );
      }
      try {
        const entry = await clockIn({
          tenantId: tenant.id,
          employeeId: profile.id,
          branchId: branchId || profile.branches[0]?.branchId,
          timeZone: tz,
        });
        return NextResponse.json({
          ok: true,
          entry: {
            id: entry.id,
            checkInAt: entry.checkInAt.toISOString(),
            checkInHm: timeHmInTz(entry.checkInAt, tz),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "ALREADY_IN") {
          return NextResponse.json(
            { error: "Ya registraste entrada" },
            { status: 409 },
          );
        }
        if (msg === "DAY_CLOSED") {
          return NextResponse.json(
            { error: "El día ya tiene entrada y salida" },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    if (action === "out") {
      try {
        const entry = await clockOut({ employeeId: profile.id, timeZone: tz });
        return NextResponse.json({
          ok: true,
          entry: {
            id: entry.id,
            checkOutAt: entry.checkOutAt?.toISOString(),
            checkOutHm: entry.checkOutAt
              ? timeHmInTz(entry.checkOutAt, tz)
              : null,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "NOT_IN") {
          return NextResponse.json(
            { error: "No hay entrada abierta" },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
