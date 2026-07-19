import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { categoryLabel, formatPrice } from "@/lib/format";
import { ServiceMedia } from "@/components/ServiceMedia";

export const dynamic = "force-dynamic";

export default async function ServicioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getDefaultTenant();
  const service = await prisma.service.findFirst({
    where: { id, tenantId: tenant.id, active: true },
  });
  if (!service) notFound();

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link href="/servicios" className="tiny muted">
          ← Servicios
        </Link>
        <div className="card" style={{ marginTop: "1rem" }}>
          <ServiceMedia
            mediaClass={`${service.mediaClass} media-detail`}
            imageUrl={service.imageUrl}
            name={service.name}
            sizes="(max-width: 800px) 100vw, 800px"
            priority
          />
          <div className="card-body">
            <span className="badge">{categoryLabel(service.category)}</span>
            <h1 style={{ marginTop: "0.75rem" }}>{service.name}</h1>
            <p className="muted">{service.description}</p>
            <div className="row" style={{ gap: "1.5rem", margin: "1.25rem 0" }}>
              <div>
                <div className="tiny muted">Duración</div>
                <strong>{service.durationMin} min</strong>
              </div>
              <div>
                <div className="tiny muted">Precio</div>
                <span className="price">{formatPrice(service.priceCents)}</span>
              </div>
            </div>
            <Link
              href={`/agendar?serviceId=${service.id}`}
              className="btn btn-accent"
            >
              Agendar este servicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
