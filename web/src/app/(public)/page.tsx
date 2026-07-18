import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { formatPrice, categoryLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = await getDefaultTenant();
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    take: 3,
    orderBy: { name: "asc" },
  });
  const branches = await prisma.branch.count({
    where: { tenantId: tenant.id, active: true },
  });

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="hero-kicker">Citas sin fricción</div>
            <h1>Tu look, tu horario, tu profesional</h1>
            <p className="hero-lead">
              Agenda en {tenant.name}: elige sucursal, servicio y estilista.
              Prepago opcional con descuento.
            </p>
            <div className="row">
              <Link href="/agendar" className="btn btn-accent">
                Agendar cita
              </Link>
              <Link href="/servicios" className="btn btn-secondary">
                Ver servicios
              </Link>
            </div>
            <p className="tiny muted" style={{ marginTop: "1.25rem" }}>
              {branches} sucursales · {services.length}+ servicios destacados
            </p>
          </div>
          <div className="hero-visual" aria-hidden>
            <div className="hero-float hero-float-1">
              <strong>Hoy</strong>
              Slots en tiempo real
            </div>
            <div className="hero-float hero-float-2">
              <strong>Prepago</strong>
              Hasta {tenant.settings?.prepaidDiscountPct ?? 10}% off
            </div>
            <div className="hero-float hero-float-3">
              <strong>Tú eliges</strong>
              Profesional concreto
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>Servicios populares</h2>
            <Link href="/servicios" className="btn btn-ghost btn-sm">
              Ver todos
            </Link>
          </div>
          <div className="grid-3">
            {services.map((s) => (
              <Link key={s.id} href={`/servicios/${s.id}`} className="card card-hover">
                <div className={`media ${s.mediaClass}`}>
                  <span className="media-icon">✦</span>
                </div>
                <div className="card-body">
                  <span className="badge">{categoryLabel(s.category)}</span>
                  <h3 style={{ margin: "0.5rem 0 0.25rem", fontSize: "1.1rem" }}>{s.name}</h3>
                  <p className="small muted" style={{ marginBottom: "0.75rem" }}>
                    {s.durationMin} min
                  </p>
                  <div className="price">{formatPrice(s.priceCents)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
