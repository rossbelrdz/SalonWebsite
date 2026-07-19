import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { ServiciosCatalogClient } from "./ServiciosCatalogClient";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const tenant = await getDefaultTenant();
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      priceCents: true,
      durationMin: true,
      mediaClass: true,
      imageUrl: true,
    },
  });

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <h2>Servicios</h2>
            <p className="muted" style={{ margin: 0 }}>
              Busca o filtra por categoría y agenda cuando quieras
            </p>
          </div>
          <Link href="/agendar" className="btn btn-accent btn-sm section-header-cta">
            Agendar
          </Link>
        </div>
        <ServiciosCatalogClient services={services} />
      </div>
    </section>
  );
}
