import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { rangeBoundsUtc, tenantTimezone } from "@/lib/timezone";

/** Estados que cuentan para comisión (servicios realizados / cobrables). */
export const COMMISSION_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PREPAID,
  AppointmentStatus.COMPLETED,
];

export type CommissionRow = {
  employeeId: string;
  name: string;
  title: string;
  commissionPct: number;
  servicesCents: number;
  commissionCents: number;
  clients: number;
  appointments: number;
};

/**
 * Comisiones por empleado en un rango de fechas (workDate from/to YYYY-MM-DD).
 * Modelo provisional: % fijo por empleado × suma de priceCents de citas válidas.
 */
export async function computeCommissions(opts: {
  tenantId: string;
  from: string;
  to: string;
  timeZone?: string | null;
  employeeId?: string;
}): Promise<CommissionRow[]> {
  const tz = tenantTimezone(opts.timeZone);
  const { start, end } = rangeBoundsUtc(opts.from, opts.to, tz);

  const employees = await prisma.employeeProfile.findMany({
    where: {
      tenantId: opts.tenantId,
      active: true,
      ...(opts.employeeId ? { id: opts.employeeId } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: opts.tenantId,
      startsAt: { gte: start, lte: end },
      status: { in: COMMISSION_STATUSES },
      ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
    },
    select: {
      employeeId: true,
      priceCents: true,
      clientUserId: true,
      clientEmail: true,
      clientPhone: true,
      clientName: true,
    },
  });

  const byEmp = new Map<
    string,
    { servicesCents: number; clients: Set<string>; appointments: number }
  >();

  for (const a of appointments) {
    let bucket = byEmp.get(a.employeeId);
    if (!bucket) {
      bucket = { servicesCents: 0, clients: new Set(), appointments: 0 };
      byEmp.set(a.employeeId, bucket);
    }
    bucket.servicesCents += a.priceCents;
    bucket.appointments += 1;
    const clientKey =
      a.clientUserId ||
      a.clientEmail ||
      a.clientPhone ||
      a.clientName ||
      "anon";
    bucket.clients.add(clientKey);
  }

  return employees.map((emp) => {
    const b = byEmp.get(emp.id) || {
      servicesCents: 0,
      clients: new Set<string>(),
      appointments: 0,
    };
    const pct = emp.commissionPct ?? 40;
    const commissionCents = Math.round((b.servicesCents * pct) / 100);
    return {
      employeeId: emp.id,
      name: emp.user.name,
      title: emp.title,
      commissionPct: pct,
      servicesCents: b.servicesCents,
      commissionCents,
      clients: b.clients.size,
      appointments: b.appointments,
    };
  });
}

/** Resumen para un empleado: hoy / ayer / semana / quincena. */
export async function employeeCommissionSummary(opts: {
  tenantId: string;
  employeeId: string;
  timeZone?: string | null;
  quincenaFrom: string;
  quincenaTo: string;
  today: string;
  yesterday: string;
  weekFrom: string;
  weekTo: string;
}) {
  const [quincena, today, yesterday, week] = await Promise.all([
    computeCommissions({
      tenantId: opts.tenantId,
      from: opts.quincenaFrom,
      to: opts.quincenaTo,
      timeZone: opts.timeZone,
      employeeId: opts.employeeId,
    }),
    computeCommissions({
      tenantId: opts.tenantId,
      from: opts.today,
      to: opts.today,
      timeZone: opts.timeZone,
      employeeId: opts.employeeId,
    }),
    computeCommissions({
      tenantId: opts.tenantId,
      from: opts.yesterday,
      to: opts.yesterday,
      timeZone: opts.timeZone,
      employeeId: opts.employeeId,
    }),
    computeCommissions({
      tenantId: opts.tenantId,
      from: opts.weekFrom,
      to: opts.weekTo,
      timeZone: opts.timeZone,
      employeeId: opts.employeeId,
    }),
  ]);

  const q = quincena[0];
  return {
    commissionPct: q?.commissionPct ?? 40,
    quincena: q,
    today: today[0],
    yesterday: yesterday[0],
    week: week[0],
  };
}
