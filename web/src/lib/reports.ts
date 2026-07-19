import { AppointmentStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dayBoundsUtc, rangeBoundsUtc, tenantTimezone, workDateInTz } from "@/lib/timezone";
import { COMMISSION_STATUSES } from "@/lib/commissions";

export type DayRevenue = { date: string; cents: number; count: number };

export type ServiceShare = {
  serviceId: string;
  name: string;
  count: number;
  cents: number;
  pct: number;
};

export type TenantReport = {
  from: string;
  to: string;
  label: string;
  appointments: number;
  completedLike: number;
  cancelled: number;
  cancelRate: number;
  prepaidCount: number;
  prepaidRate: number;
  revenueCents: number;
  refundCents: number;
  byDay: DayRevenue[];
  topServices: ServiceShare[];
};

export async function buildTenantReport(opts: {
  tenantId: string;
  from: string;
  to: string;
  label?: string;
  timeZone?: string | null;
}): Promise<TenantReport> {
  const tz = tenantTimezone(opts.timeZone);
  const { start, end } = rangeBoundsUtc(opts.from, opts.to, tz);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: opts.tenantId,
      startsAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      status: true,
      prepaid: true,
      priceCents: true,
      startsAt: true,
      serviceId: true,
      service: { select: { name: true } },
    },
  });

  const payments = await prisma.payment.findMany({
    where: {
      tenantId: opts.tenantId,
      OR: [
        { paidAt: { gte: start, lte: end } },
        { refundedAt: { gte: start, lte: end } },
      ],
    },
    select: {
      status: true,
      amountCents: true,
      refundAmountCents: true,
      refundedAt: true,
      paidAt: true,
    },
  });

  let cancelled = 0;
  let completedLike = 0;
  let prepaidCount = 0;
  let revenueCents = 0;
  const byDayMap = new Map<string, { cents: number; count: number }>();
  const byService = new Map<string, { name: string; count: number; cents: number }>();

  for (const a of appointments) {
    if (a.status === AppointmentStatus.CANCELLED) {
      cancelled += 1;
      continue;
    }
    if (COMMISSION_STATUSES.includes(a.status)) {
      completedLike += 1;
      revenueCents += a.priceCents;
      if (a.prepaid) prepaidCount += 1;

      const d = workDateInTz(a.startsAt, tz);
      const day = byDayMap.get(d) || { cents: 0, count: 0 };
      day.cents += a.priceCents;
      day.count += 1;
      byDayMap.set(d, day);

      const svc = byService.get(a.serviceId) || {
        name: a.service.name,
        count: 0,
        cents: 0,
      };
      svc.count += 1;
      svc.cents += a.priceCents;
      byService.set(a.serviceId, svc);
    }
  }

  let refundCents = 0;
  for (const p of payments) {
    if (
      p.refundedAt &&
      p.refundedAt >= start &&
      p.refundedAt <= end &&
      (p.status === PaymentStatus.REFUNDED ||
        p.status === PaymentStatus.PARTIAL_REFUND)
    ) {
      refundCents += p.refundAmountCents ?? p.amountCents;
    }
  }

  const total = appointments.length;
  const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;
  const prepaidRate =
    completedLike > 0 ? (prepaidCount / completedLike) * 100 : 0;

  // Fill days in range for chart continuity
  const byDay: DayRevenue[] = [];
  const cursor = new Date(`${opts.from}T12:00:00.000Z`);
  const endCursor = new Date(`${opts.to}T12:00:00.000Z`);
  while (cursor <= endCursor) {
    const ymd = cursor.toISOString().slice(0, 10);
    const hit = byDayMap.get(ymd) || { cents: 0, count: 0 };
    byDay.push({ date: ymd, cents: hit.cents, count: hit.count });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const topServices: ServiceShare[] = [...byService.entries()]
    .map(([serviceId, v]) => ({
      serviceId,
      name: v.name,
      count: v.count,
      cents: v.cents,
      pct: completedLike > 0 ? (v.count / completedLike) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    from: opts.from,
    to: opts.to,
    label: opts.label || `${opts.from} → ${opts.to}`,
    appointments: total,
    completedLike,
    cancelled,
    cancelRate,
    prepaidCount,
    prepaidRate,
    revenueCents,
    refundCents,
    byDay,
    topServices,
  };
}

/** Relleno demo: bounds de un solo día (export util). */
export function singleDayBounds(workDate: string, tz?: string | null) {
  return dayBoundsUtc(workDate, tz);
}
