import { prisma } from "@/lib/db";
import {
  dayOfWeekInTz,
  minutesNowInTz,
  parseHmToMinutes,
  tenantTimezone,
  timeHmInTz,
  workDateInTz,
} from "@/lib/timezone";

export type AttendanceStatus =
  | "presente"
  | "completo"
  | "retraso"
  | "ausente"
  | "descanso"
  | "pendiente";

const LATE_GRACE_MIN = 10;

export function attendanceLabel(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    presente: "Presente",
    completo: "Completo",
    retraso: "Retraso",
    ausente: "Ausente",
    descanso: "Descanso",
    pendiente: "Pendiente",
  };
  return map[status];
}

export function attendanceBadgeClass(status: AttendanceStatus): string {
  switch (status) {
    case "presente":
    case "completo":
      return "badge badge-success";
    case "retraso":
      return "badge badge-warning";
    case "ausente":
      return "badge badge-danger";
    case "descanso":
      return "badge badge-neutral";
    default:
      return "badge";
  }
}

export function resolveAttendanceStatus(opts: {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  now: Date;
  timeZone: string;
}): AttendanceStatus {
  const { checkInAt, checkOutAt, scheduleStart, now, timeZone } = opts;

  if (!scheduleStart) {
    if (checkInAt && checkOutAt) return "completo";
    if (checkInAt) return "presente";
    return "descanso";
  }

  if (checkInAt) {
    const inMin = parseHmToMinutes(timeHmInTz(checkInAt, timeZone));
    const startMin = parseHmToMinutes(scheduleStart);
    const late = inMin > startMin + LATE_GRACE_MIN;
    if (checkOutAt) return late ? "retraso" : "completo";
    return late ? "retraso" : "presente";
  }

  const nowMin = minutesNowInTz(now, timeZone);
  const startMin = parseHmToMinutes(scheduleStart);
  if (nowMin < startMin) return "pendiente";
  return "ausente";
}

export async function getOpenTimeEntry(employeeId: string) {
  return prisma.timeEntry.findFirst({
    where: { employeeId, checkOutAt: null },
    orderBy: { checkInAt: "desc" },
  });
}

export async function getTodayEntry(
  employeeId: string,
  workDate: string,
) {
  return prisma.timeEntry.findFirst({
    where: { employeeId, workDate },
    orderBy: { checkInAt: "desc" },
  });
}

export async function listAttendanceForDate(opts: {
  tenantId: string;
  workDate: string;
  timeZone?: string | null;
}) {
  const { tenantId, workDate } = opts;
  const tz = tenantTimezone(opts.timeZone);
  const now = new Date();
  // dayOfWeek for that workDate at noon local
  const noon = new Date(`${workDate}T18:00:00.000Z`);
  const dow = dayOfWeekInTz(noon, tz);

  const employees = await prisma.employeeProfile.findMany({
    where: { tenantId, active: true },
    include: {
      user: { select: { name: true } },
      branches: { include: { branch: true } },
      schedules: { where: { dayOfWeek: dow } },
      timeEntries: {
        where: { workDate },
        orderBy: { checkInAt: "desc" },
        take: 1,
        include: { branch: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return employees.map((emp) => {
    const entry = emp.timeEntries[0] ?? null;
    const schedule = emp.schedules[0] ?? null;
    const primaryBranch =
      entry?.branch?.name ||
      emp.branches[0]?.branch.name ||
      "—";
    const status = resolveAttendanceStatus({
      checkInAt: entry?.checkInAt ?? null,
      checkOutAt: entry?.checkOutAt ?? null,
      scheduleStart: schedule?.startTime ?? null,
      scheduleEnd: schedule?.endTime ?? null,
      now,
      timeZone: tz,
    });
    return {
      employeeId: emp.id,
      name: emp.user.name,
      title: emp.title,
      branchName: primaryBranch,
      scheduleStart: schedule?.startTime ?? null,
      scheduleEnd: schedule?.endTime ?? null,
      checkInAt: entry?.checkInAt ?? null,
      checkOutAt: entry?.checkOutAt ?? null,
      checkInHm: entry ? timeHmInTz(entry.checkInAt, tz) : null,
      checkOutHm: entry?.checkOutAt
        ? timeHmInTz(entry.checkOutAt, tz)
        : null,
      status,
      statusLabel: attendanceLabel(status),
      badgeClass: attendanceBadgeClass(status),
    };
  });
}

export async function clockIn(opts: {
  tenantId: string;
  employeeId: string;
  branchId?: string | null;
  timeZone?: string | null;
}) {
  const tz = tenantTimezone(opts.timeZone);
  const now = new Date();
  const workDate = workDateInTz(now, tz);

  const open = await getOpenTimeEntry(opts.employeeId);
  if (open) {
    throw new Error("ALREADY_IN");
  }

  const today = await getTodayEntry(opts.employeeId, workDate);
  if (today && !today.checkOutAt) {
    throw new Error("ALREADY_IN");
  }
  if (today?.checkOutAt) {
    throw new Error("DAY_CLOSED");
  }

  return prisma.timeEntry.create({
    data: {
      tenantId: opts.tenantId,
      employeeId: opts.employeeId,
      branchId: opts.branchId || null,
      workDate,
      checkInAt: now,
    },
  });
}

export async function clockOut(opts: {
  employeeId: string;
  timeZone?: string | null;
}) {
  const open = await getOpenTimeEntry(opts.employeeId);
  if (!open) {
    throw new Error("NOT_IN");
  }
  return prisma.timeEntry.update({
    where: { id: open.id },
    data: { checkOutAt: new Date() },
  });
}
