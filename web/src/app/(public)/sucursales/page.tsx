import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { BranchesMap, type BranchMapItem } from "@/components/BranchesMap";

export const dynamic = "force-dynamic";

export default async function SucursalesPage() {
  const tenant = await getDefaultTenant();
  const rows = await prisma.branch.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: "asc" },
  });

  const branches: BranchMapItem[] = rows
    .filter((b) => b.lat != null && b.lng != null)
    .map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      city: b.city,
      lat: b.lat as number,
      lng: b.lng as number,
      openTime: b.openTime,
      closeTime: b.closeTime,
      phone: b.phone,
    }));

  const missingCoords = rows.length - branches.length;

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <h2>Sucursales</h2>
            <p className="muted" style={{ margin: 0 }}>
              Elige en la lista o toca el pin en el mapa
            </p>
          </div>
        </div>

        {branches.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="muted" style={{ margin: 0 }}>
                No hay sucursales con ubicación en el mapa.
                {missingCoords > 0
                  ? " Configura latitud/longitud en el admin."
                  : " Aún no hay sucursales activas."}
              </p>
            </div>
          </div>
        ) : (
          <BranchesMap branches={branches} />
        )}
      </div>
    </section>
  );
}
