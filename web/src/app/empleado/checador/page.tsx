import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getDefaultTenant, hasStaffAccess } from "@/lib/auth";
import {
  getTodayEntry,
  getOpenTimeEntry,
  resolveAttendanceStatus,
  attendanceLabel,
} from "@/lib/attendance";
import {
  dayOfWeekInTz,
  tenantTimezone,
  timeHmInTz,
  workDateInTz,
} from "@/lib/timezone";
import { ChecadorClient } from "./ChecadorClient";

export const dynamic = "force-dynamic";

export default async function ChecadorPage() {
  const session = await readSession();
  if (!session || !hasStaffAccess(session)) redirect("/login");

  const tenant = await getDefaultTenant();
  const profile = await prisma.employeeProfile.findFirst({
    where: { userId: session.userId, tenantId: tenant.id, active: true },
    include: {
      branches: { include: { branch: true } },
      schedules: true,
    },
  });

  if (!profile) {
    return (
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Checador</h1>
        <p className="muted">No hay perfil de empleado vinculado a esta cuenta.</p>
        <Link href="/empleado" className="btn btn-secondary btn-sm">
          Volver
        </Link>
      </div>
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

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Checador</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Registra tu entrada y salida del día
      </p>
      <ChecadorClient
        initial={{
          workDate,
          timezone: tz,
          serverTimeHm: timeHmInTz(now, tz),
          schedule: schedule
            ? { start: schedule.startTime, end: schedule.endTime }
            : null,
          entry: entry
            ? {
                id: entry.id,
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
        }}
      />
    </div>
  );
}
