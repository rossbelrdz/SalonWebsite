import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPersonalPage() {
  const tenant = await getDefaultTenant();
  const employees = await prisma.employeeProfile.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: true,
      branches: { include: { branch: true } },
      services: { include: { service: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Personal"
        subtitle="Empleados y servicios que ofrecen"
      />
      <div className="stack">
        {employees.map((e) => (
          <div key={e.id} className="card">
            <div className="card-body">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{e.user.name}</strong>
                  <div className="small muted">
                    {e.title} · {e.user.email}
                  </div>
                </div>
                <span className={`badge ${e.active ? "badge-success" : "badge-neutral"}`}>
                  {e.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="small muted" style={{ marginTop: "0.75rem" }}>
                Sucursales:{" "}
                {e.branches.map((b) => b.branch.name).join(", ") || "—"}
              </p>
              <p className="small muted">
                Servicios:{" "}
                {e.services.map((s) => s.service.name).join(", ") || "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
