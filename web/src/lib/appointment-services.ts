/** Etiquetas y totales de citas multi-servicio. */

export type ServiceLineLike = {
  sortOrder?: number;
  durationMin?: number;
  priceCents?: number;
  service?: { name: string; durationMin?: number; priceCents?: number } | null;
};

export type AppointmentServicesLike = {
  service?: { name: string } | null;
  lines?: ServiceLineLike[] | null;
};

/** "Tinte + Manicure" o el servicio principal. */
export function appointmentServicesLabel(appt: AppointmentServicesLike): string {
  const lines = [...(appt.lines || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  if (lines.length > 0) {
    return lines
      .map((l) => l.service?.name)
      .filter(Boolean)
      .join(" + ");
  }
  return appt.service?.name || "Servicio";
}

export function appointmentDurationMin(
  lines: { durationMin: number }[],
  fallback = 0,
): number {
  if (!lines.length) return fallback;
  return lines.reduce((s, l) => s + l.durationMin, 0);
}

export function appointmentLinesPriceCents(lines: { priceCents: number }[]): number {
  return lines.reduce((s, l) => s + l.priceCents, 0);
}
