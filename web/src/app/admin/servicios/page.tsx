import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { categoryLabel, formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ServiceForm } from "./ServiceForm";
import { ToggleService } from "./ToggleService";

export const dynamic = "force-dynamic";

export default async function AdminServiciosPage() {
  const tenant = await getDefaultTenant();
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Servicios" subtitle="Catálogo del negocio" />
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Nuevo servicio</h3>
            <ServiceForm />
          </div>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Duración</th>
                  <th>Precio</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{categoryLabel(s.category)}</td>
                    <td>{s.durationMin} min</td>
                    <td>{formatPrice(s.priceCents)}</td>
                    <td>
                      <ToggleService id={s.id} active={s.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
