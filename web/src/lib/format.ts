export function formatPrice(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}

export function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    HAIR: "Cabello",
    COLOR: "Color",
    BEARD: "Barba",
    NAILS: "Uñas",
    MAKEUP: "Maquillaje",
    SPA: "Spa",
    OTHER: "Otros",
  };
  return map[cat] ?? cat;
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: "Confirmada",
    PREPAID: "Prepagada",
    PENDING: "Pendiente de pago",
    CANCELLED: "Cancelada",
    COMPLETED: "Completada",
    REASSIGNMENT_PENDING: "Reasignación",
  };
  return map[status] ?? status;
}

export function paymentStatusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    REFUNDED: "Reembolsado",
    PARTIAL_REFUND: "Reembolso parcial",
    CANCELLED: "Cancelado",
  };
  return map[status] ?? status;
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
      return "badge badge-success";
    case "PREPAID":
      return "badge badge-accent";
    case "PENDING":
    case "REASSIGNMENT_PENDING":
      return "badge badge-warning";
    case "CANCELLED":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

export function parseTimeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
