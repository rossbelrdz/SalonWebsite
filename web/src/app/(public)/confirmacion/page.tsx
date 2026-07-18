import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConfirmacionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; demo?: string; prepaid?: string }>;
}) {
  const { id, demo, prepaid } = await searchParams;
  if (!id) notFound();

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!appt) notFound();

  const payment = appt.payments[0];
  const isPendingPay = appt.status === "PENDING" && appt.prepaid;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <div className="card-body text-center">
            <span className={`badge ${isPendingPay ? "badge-warning" : "badge-success"}`}>
              {isPendingPay ? "Pendiente de pago" : "Listo"}
            </span>
            <h1 style={{ fontSize: "1.5rem", marginTop: "0.75rem" }}>
              {isPendingPay ? "Cita reservada — completa el pago" : "Cita confirmada"}
            </h1>
            <p className="muted">
              {appt.service.name} · {formatDateTime(appt.startsAt)}
            </p>
            {demo === "1" && (
              <p className="small" style={{ marginTop: "0.5rem" }}>
                <span className="badge badge-accent">Demo</span> Prepago simulado (sin cobro real).
              </p>
            )}
            <div style={{ textAlign: "left", margin: "1.5rem 0" }}>
              <p>
                <strong>Sucursal:</strong> {appt.branch.name}
              </p>
              <p>
                <strong>Profesional:</strong> {appt.employee.user.name}
              </p>
              <p>
                <strong>Cliente:</strong> {appt.clientName}
              </p>
              <p>
                <strong>Total:</strong> {formatPrice(appt.priceCents)}{" "}
                <span className={statusBadgeClass(appt.status)}>
                  {statusLabel(appt.status)}
                </span>
              </p>
              {payment && (
                <p className="small muted">
                  Pago: {payment.provider} · {payment.status}
                  {payment.checkoutUrl && payment.status === "PENDING" && (
                    <>
                      {" · "}
                      <a href={payment.checkoutUrl}>Continuar pago</a>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="row" style={{ justifyContent: "center" }}>
              {payment?.checkoutUrl && payment.status === "PENDING" && (
                <a href={payment.checkoutUrl} className="btn btn-accent">
                  Ir a pagar
                </a>
              )}
              <Link href="/mis-citas" className="btn btn-primary">
                Ver mis citas
              </Link>
              <Link href="/" className="btn btn-secondary">
                Inicio
              </Link>
            </div>
            {prepaid === "1" && !isPendingPay && (
              <p className="tiny muted" style={{ marginTop: "1rem" }}>
                Prepago aplicado con descuento.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
