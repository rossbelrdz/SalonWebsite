import { formatDateTime, formatPrice } from "@/lib/format";
import { appBaseUrl } from "@/lib/payments/types";

export type AppointmentContext = {
  clientName: string;
  serviceName: string;
  branchName: string;
  employeeName: string;
  startsAt: Date;
  priceCents: number;
  prepaid?: boolean;
  appointmentId: string;
  proposedEmployeeName?: string | null;
  note?: string | null;
  refundCents?: number;
};

function base(appt: AppointmentContext) {
  return {
    when: formatDateTime(appt.startsAt),
    price: formatPrice(appt.priceCents),
    link: `${appBaseUrl()}/mis-citas`,
    reassignLink: `${appBaseUrl()}/reasignacion?id=${appt.appointmentId}`,
  };
}

export function tplAppointmentCreated(appt: AppointmentContext) {
  const b = base(appt);
  const subject = `Cita confirmada: ${appt.serviceName}`;
  const text = [
    `Hola ${appt.clientName},`,
    ``,
    `Tu cita quedó confirmada.`,
    `· Servicio: ${appt.serviceName}`,
    `· Sucursal: ${appt.branchName}`,
    `· Profesional: ${appt.employeeName}`,
    `· Fecha: ${b.when}`,
    `· Total: ${b.price}${appt.prepaid ? " (prepago)" : ""}`,
    ``,
    `Ver citas: ${b.link}`,
  ].join("\n");
  const html = `<p>Hola <strong>${escapeHtml(appt.clientName)}</strong>,</p>
<p>Tu cita quedó <strong>confirmada</strong>.</p>
<ul>
<li>Servicio: ${escapeHtml(appt.serviceName)}</li>
<li>Sucursal: ${escapeHtml(appt.branchName)}</li>
<li>Profesional: ${escapeHtml(appt.employeeName)}</li>
<li>Fecha: ${escapeHtml(b.when)}</li>
<li>Total: ${escapeHtml(b.price)}${appt.prepaid ? " (prepago)" : ""}</li>
</ul>
<p><a href="${b.link}">Ver mis citas</a></p>`;
  return { subject, text, html };
}

export function tplAppointmentPrepaid(appt: AppointmentContext) {
  const baseTpl = tplAppointmentCreated({ ...appt, prepaid: true });
  return {
    subject: `Prepago recibido: ${appt.serviceName}`,
    text: baseTpl.text.replace("confirmada", "prepagada y confirmada"),
    html: baseTpl.html.replace("confirmada", "prepagada y confirmada"),
  };
}

export function tplAppointmentCancelled(appt: AppointmentContext, by: string) {
  const b = base(appt);
  const refund =
    appt.refundCents != null && appt.refundCents > 0
      ? `\n· Reembolso: ${formatPrice(appt.refundCents)}`
      : "";
  const subject = `Cita cancelada: ${appt.serviceName}`;
  const text = [
    `Hola ${appt.clientName},`,
    ``,
    `Tu cita fue cancelada (${by}).`,
    `· Servicio: ${appt.serviceName}`,
    `· Fecha: ${b.when}`,
    refund,
    ``,
    `Agendar de nuevo: ${appBaseUrl()}/agendar`,
  ].join("\n");
  return { subject, text, html: textToHtml(text) };
}

export function tplReassignment(appt: AppointmentContext) {
  const b = base(appt);
  const subject = `Acción requerida: reasignación de cita`;
  const text = [
    `Hola ${appt.clientName},`,
    ``,
    `Tu cita necesita una decisión:`,
    `· ${appt.serviceName} · ${b.when}`,
    `· Profesional actual: ${appt.employeeName}`,
    appt.proposedEmployeeName
      ? `· Profesional propuesto: ${appt.proposedEmployeeName}`
      : "",
    appt.note ? `· Nota: ${appt.note}` : "",
    ``,
    `Elige una opción (aceptar / reagendar / cancelar):`,
    b.reassignLink,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text, html: textToHtml(text) };
}

export function tplReminder(appt: AppointmentContext, label: string) {
  const b = base(appt);
  const subject = `Recordatorio (${label}): ${appt.serviceName}`;
  const text = [
    `Hola ${appt.clientName},`,
    ``,
    `Te recordamos tu cita ${label}:`,
    `· ${appt.serviceName} · ${b.when}`,
    `· ${appt.branchName} con ${appt.employeeName}`,
    ``,
    `Ver o cancelar: ${b.link}`,
  ].join("\n");
  return { subject, text, html: textToHtml(text) };
}

export function tplAccountCreated(name: string, email?: string | null) {
  const subject = "Bienvenido a Salon";
  const text = [
    `Hola ${name},`,
    ``,
    `Tu cuenta está lista.`,
    email ? `Correo: ${email}` : "",
    ``,
    `Agenda tu cita: ${appBaseUrl()}/agendar`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text, html: textToHtml(text) };
}

export function tplRefund(appt: AppointmentContext) {
  const subject = `Reembolso de cita: ${formatPrice(appt.refundCents || 0)}`;
  const text = [
    `Hola ${appt.clientName},`,
    ``,
    `Procesamos un reembolso por ${formatPrice(appt.refundCents || 0)}.`,
    `Cita: ${appt.serviceName} · ${formatDateTime(appt.startsAt)}`,
    ``,
    `El tiempo de acreditación depende de tu banco/pasarela.`,
  ].join("\n");
  return { subject, text, html: textToHtml(text) };
}

export function tplStaffAppointment(
  staffName: string,
  appt: AppointmentContext,
  headline: string,
) {
  const b = base(appt);
  const subject = `${headline}: ${appt.serviceName}`;
  const text = [
    `Hola ${staffName},`,
    ``,
    headline,
    `· Cliente: ${appt.clientName}`,
    `· ${appt.serviceName} · ${b.when}`,
    `· Sucursal: ${appt.branchName}`,
  ].join("\n");
  return { subject, text, html: textToHtml(text) };
}

export function tplAbsenceAdmin(employeeName: string, from: string, to: string, blocked: boolean) {
  const subject = blocked
    ? `Ausencia bloqueada (prepagos): ${employeeName}`
    : `Solicitud de ausencia: ${employeeName}`;
  const text = [
    `El empleado ${employeeName} solicitó ausencia.`,
    `· Desde: ${from}`,
    `· Hasta: ${to}`,
    blocked
      ? `· Estado: BLOQUEADA por citas prepagadas — reasigna antes de aprobar.`
      : `· Estado: pendiente de aprobación`,
  ].join("\n");
  return { subject, text, html: textToHtml(text) };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br/>"))
    .join("\n");
}
