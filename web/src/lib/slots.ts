import { addDays, addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { prisma } from "./db";
import { parseTimeToMinutes } from "./format";

export async function getAvailableSlots(params: {
  employeeId: string;
  branchId: string;
  serviceId: string;
  date: Date; // day
}) {
  const { employeeId, branchId, serviceId, date } = params;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  const schedule = await prisma.workSchedule.findUnique({
    where: {
      employeeId_dayOfWeek: {
        employeeId,
        dayOfWeek: date.getDay(),
      },
    },
  });

  if (!service || !branch || !schedule) return [] as string[];

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

  const duration = service.durationMin;
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
