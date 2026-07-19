import { addDays, addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { prisma } from "./db";
import { parseTimeToMinutes } from "./format";

export async function getAvailableSlots(params: {
  employeeId: string;
  branchId: string;
  /** Uno o varios servicios: la duración se suma. */
  serviceIds: string[];
  date: Date;
}) {
  const { employeeId, branchId, serviceIds, date } = params;
  const ids = [...new Set(serviceIds.filter(Boolean))];
  if (!ids.length) return [] as string[];

  const [services, branch, schedule] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: ids }, active: true } }),
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.workSchedule.findUnique({
      where: {
        employeeId_dayOfWeek: {
          employeeId,
          dayOfWeek: date.getDay(),
        },
      },
    }),
  ]);

  if (services.length !== ids.length || !branch || !schedule) return [] as string[];

  // Profesional debe ofrecer todos los servicios
  const links = await prisma.employeeService.findMany({
    where: { employeeId, serviceId: { in: ids } },
  });
  if (links.length !== ids.length) return [] as string[];

  const duration = services.reduce((s, svc) => s + svc.durationMin, 0);
  if (duration <= 0) return [] as string[];

  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);

  const existing = await prisma.appointment.findMany({
    where: {
      employeeId,
      status: { not: "CANCELLED" },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
    select: { startsAt: true, endsAt: true },
  });

  const open = Math.max(
    parseTimeToMinutes(branch.openTime),
    parseTimeToMinutes(schedule.startTime),
  );
  const close = Math.min(
    parseTimeToMinutes(branch.closeTime),
    parseTimeToMinutes(schedule.endTime),
  );

  const slots: string[] = [];
  const now = new Date();

  for (let t = open; t + duration <= close; t += 30) {
    const startsAt = setMinutes(setHours(dayStart, Math.floor(t / 60)), t % 60);
    const endsAt = addMinutes(startsAt, duration);
    if (startsAt <= now) continue;

    const overlaps = existing.some(
      (a) => startsAt < a.endsAt && endsAt > a.startsAt,
    );
    if (!overlaps) {
      slots.push(format(startsAt, "HH:mm"));
    }
  }

  return slots;
}
