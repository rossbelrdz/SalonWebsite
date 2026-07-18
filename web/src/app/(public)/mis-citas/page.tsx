import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { formatDateTime, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";
import { CancelButton } from "./CancelButton";

export const dynamic = "force-dynamic";

export default async function MisCitasPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const appointments = await prisma.appointment.findMany({
    where: { clientUserId: session.userId },
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="section-header">
          <div>
            <h2>Mis citas</h2>
            <p className="muted" style={{ margin: 0 }}>
              Hola, {session.name}
            </p>
          </div>
          <Link href="/agendar" className="btn btn-accent btn-sm">
            Nueva cita
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="card">
            <div className="card-body text-center" style={{ padding: "2rem" }}>
              <h3>Aún no tienes citas</h3>
              <p className="muted">Agenda tu primer servicio en un minuto.</p>
              <Link href="/agendar" className="btn btn-primary">
                Agendar
              </Link>
            </div>
          </div>
        ) : (
          <div className="stack">
            {appointments.map((a) => (
              <div key={a.id} className="card">
                <div className="card-body">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                      <strong>{a.service.name}</strong>
                      <div className="small muted">
                        {formatDateTime(a.startsAt)} · {a.branch.name}
                      </div>
                      <div className="small muted">
                        Con {a.employee.user.name} · {formatPrice(a.priceCents)}
                        {a.prepaid ? " · Prepago" : ""}
                        {a.payments[0]
                          ? ` · Pago ${a.payments[0].status}`
                          : ""}
                      </div>
                    </div>
                    <span className={statusBadgeClass(a.status)}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  <div className="row" style={{ marginTop: "0.85rem", gap: "0.5rem" }}>
                    {a.status === "REASSIGNMENT_PENDING" && (
                      <Link
                        href={`/reasignacion?id=${a.id}`}
                        className="btn btn-accent btn-sm"
                      >
                        Elegir opción
                      </Link>
                    )}
                    {a.status === "PENDING" &&
                      a.payments[0]?.checkoutUrl && (
                        <a
                          href={a.payments[0].checkoutUrl}
                          className="btn btn-primary btn-sm"
                        >
                          Completar pago
                        </a>
                      )}
                    {a.status !== "CANCELLED" && a.status !== "COMPLETED" && (
                      <CancelButton id={a.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
