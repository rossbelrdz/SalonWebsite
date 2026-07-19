import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { formatPrice, categoryLabel } from "@/lib/format";
import { ServiceMedia } from "@/components/ServiceMedia";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = await getDefaultTenant();
  // Destacados variados (todas las categorías), no solo los primeros alfabéticos.
  const featuredIds = [
    "seed-svc-corte",
    "seed-svc-balayage",
    "seed-svc-barba",
    "seed-svc-unas",
    "seed-svc-pestañas",
    "seed-svc-makeup",
  ];
  const [allActive, serviceCount, branches] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.service.count({
      where: { tenantId: tenant.id, active: true },
    }),
    prisma.branch.count({
      where: { tenantId: tenant.id, active: true },
    }),
  ]);
  const byId = new Map(allActive.map((s) => [s.id, s]));
  const featuredServices = [
    ...featuredIds.map((id) => byId.get(id)).filter(Boolean),
    ...allActive.filter((s) => !featuredIds.includes(s.id)),
  ].slice(0, 6) as typeof allActive;

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
              {branches} sucursales · {serviceCount} servicios
            </p>
          </div>
          <div>
            <div className="hero-visual" aria-hidden>
              <Image
                src="/img/home/hero.webp"
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 45vw"
                className="hero-visual-img"
                priority
              />
              <div className="hero-visual-overlay" />
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
            {/* Mobile: chips instead of clipped float cards */}
            <div className="hero-chips" aria-label="Beneficios">
              <span className="hero-chip">
                <strong>Hoy</strong> · slots en vivo
              </span>
              <span className="hero-chip">
                <strong>Prepago</strong> · hasta {tenant.settings?.prepaidDiscountPct ?? 10}% off
              </span>
              <span className="hero-chip">
                <strong>Tú eliges</strong> · profesional
              </span>
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
            {featuredServices.map((s) => (
              <Link key={s.id} href={`/servicios/${s.id}`} className="card card-hover">
                <ServiceMedia mediaClass={s.mediaClass} imageUrl={s.imageUrl} name={s.name} />
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
