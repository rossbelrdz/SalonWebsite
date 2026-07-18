import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SucursalesPage() {
  const tenant = await getDefaultTenant();
  const branches = await prisma.branch.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <h2>Sucursales</h2>
            <p className="muted" style={{ margin: 0 }}>
              Encuentra la más cercana y agenda ahí
            </p>
          </div>
        </div>
        <div className="map-layout">
          <div className="map-list">
            {branches.map((b) => (
              <div key={b.id} className="card">
                <div className="card-body">
                  <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{b.name}</h3>
                  <p className="small muted" style={{ margin: "0 0 0.5rem" }}>
                    {b.address}, {b.city}
                  </p>
                  <p className="tiny muted">
                    {b.openTime} – {b.closeTime}
                    {b.phone ? ` · ${b.phone}` : ""}
                  </p>
                  <Link
                    href={`/agendar?branchId=${b.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: "0.75rem" }}
                  >
                    Agendar aquí
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="map-canvas" aria-label="Mapa de sucursales">
            {branches.map((b, i) => (
              <div
                key={b.id}
                className="map-pin"
                style={{
                  left: `${30 + i * 25}%`,
                  top: `${35 + i * 12}%`,
                }}
                title={b.name}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    margin: "0 auto 0.25rem",
                    boxShadow: "0 0 0 4px var(--accent-soft)",
                  }}
                />
                <span className="tiny" style={{ fontWeight: 700 }}>
                  {b.name.replace("Sucursal ", "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
