import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { BranchForm } from "./BranchForm";
import { ToggleBranch } from "./ToggleBranch";

export const dynamic = "force-dynamic";

export default async function AdminSucursalesPage() {
  const tenant = await getDefaultTenant();
  const branches = await prisma.branch.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Sucursales" subtitle="Ubicaciones del negocio" />
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Nueva sucursal</h3>
            <BranchForm />
          </div>
        </div>
        <div className="stack">
          {branches.map((b) => (
            <div key={b.id} className="card">
              <div className="card-body row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{b.name}</strong>
                  <div className="small muted">
                    {b.address}, {b.city}
                  </div>
                  <div className="tiny muted">
                    {b.openTime}–{b.closeTime}
                    {b.phone ? ` · ${b.phone}` : ""}
                  </div>
                </div>
                <ToggleBranch id={b.id} active={b.active} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
