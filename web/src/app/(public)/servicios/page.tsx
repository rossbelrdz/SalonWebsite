import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { categoryLabel, formatPrice } from "@/lib/format";
import { ServiceMedia } from "@/components/ServiceMedia";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const tenant = await getDefaultTenant();
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <h2>Servicios</h2>
            <p className="muted" style={{ margin: 0 }}>
              Elige y agenda con el profesional que prefieras
            </p>
          </div>
          <Link href="/agendar" className="btn btn-accent btn-sm">
            Agendar
          </Link>
        </div>
        <div className="grid-3">
          {services.map((s) => (
            <Link key={s.id} href={`/servicios/${s.id}`} className="card card-hover">
              <ServiceMedia mediaClass={s.mediaClass} imageUrl={s.imageUrl} name={s.name} />
              <div className="card-body">
                <span className="badge">{categoryLabel(s.category)}</span>
                <h3 style={{ margin: "0.5rem 0", fontSize: "1.1rem" }}>{s.name}</h3>
                <p className="small muted line-clamp-2">
                  {s.description || `${s.durationMin} min`}
                </p>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="price">{formatPrice(s.priceCents)}</span>
                  <span className="tiny muted">{s.durationMin} min</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
