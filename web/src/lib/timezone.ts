/** Helpers de fecha en timezone de tenant (sin date-fns-tz). */

const DEFAULT_TZ = "America/Mexico_City";

export function tenantTimezone(tz?: string | null) {
  return tz?.trim() || DEFAULT_TZ;
}

/** YYYY-MM-DD en la zona del tenant. */
export function workDateInTz(date: Date, timeZone?: string | null): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tenantTimezone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** HH:mm 24h en la zona del tenant. */
export function timeHmInTz(date: Date, timeZone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tenantTimezone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Día de semana 0=domingo … 6=sábado en timezone del tenant. */
export function dayOfWeekInTz(date: Date, timeZone?: string | null): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: tenantTimezone(timeZone),
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? date.getDay();
}

export function parseHmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutos desde medianoche en la zona del tenant. */
export function minutesNowInTz(date: Date, timeZone?: string | null): number {
  return parseHmToMinutes(timeHmInTz(date, timeZone));
}

/**
 * Inicio/fin UTC aproximados de un día civil en timezone.
 * Suficiente para filtrar citas del día en reportes.
 */
export function dayBoundsUtc(workDate: string, timeZone?: string | null): {
  start: Date;
  end: Date;
} {
  const tz = tenantTimezone(timeZone);
  // Buscar offset del mediodía local vía formateo
  const noonUtcGuess = new Date(`${workDate}T12:00:00.000Z`);
  const localHm = timeHmInTz(noonUtcGuess, tz);
  const localMin = parseHmToMinutes(localHm);
  // noon local should be 12:00 → offset minutes = localMin - 12*60
  const offsetMin = localMin - 12 * 60;
  // Local midnight = workDate 00:00 → UTC = that + reverse offset
  const start = new Date(`${workDate}T00:00:00.000Z`);
  start.setUTCMinutes(start.getUTCMinutes() - offsetMin);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return { start, end };
}

/** Rango quincena actual (1–15 o 16–fin de mes) en YYYY-MM-DD. */
export function currentQuincena(now = new Date(), timeZone?: string | null) {
  const ymd = workDateInTz(now, timeZone);
  const [y, m, d] = ymd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d <= 15) {
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: `${y}-${String(m).padStart(2, "0")}-15`,
      label: `1–15 ${monthName(m)} ${y}`,
    };
  }
  return {
    from: `${y}-${String(m).padStart(2, "0")}-16`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    label: `16–${lastDay} ${monthName(m)} ${y}`,
  };
}

/** Rango mes actual YYYY-MM-DD. */
export function currentMonth(now = new Date(), timeZone?: string | null) {
  const ymd = workDateInTz(now, timeZone);
  const [y, m] = ymd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    label: `${monthName(m)} ${y}`,
  };
}

/** Últimos N días inclusive (hoy = to). */
export function lastNDays(n: number, now = new Date(), timeZone?: string | null) {
  const to = workDateInTz(now, timeZone);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (n - 1));
  // Approximate by iterating work dates
  const from = workDateInTz(
    new Date(now.getTime() - (n - 1) * 24 * 60 * 60 * 1000),
    timeZone,
  );
  return { from, to, label: `Últimos ${n} días` };
}

function monthName(m: number) {
  const names = [
    "",
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return names[m] || String(m);
}

/** Convierte from/to YYYY-MM-DD a bounds Date UTC para queries. */
export function rangeBoundsUtc(
  from: string,
  to: string,
  timeZone?: string | null,
): { start: Date; end: Date } {
  const a = dayBoundsUtc(from, timeZone);
  const b = dayBoundsUtc(to, timeZone);
  return { start: a.start, end: b.end };
}
