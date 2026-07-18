import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UserForm } from "../config/UserForm";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const tenant = await getDefaultTenant();
  const clients = await prisma.membership.findMany({
    where: { tenantId: tenant.id, role: "CLIENT" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader title="Clientes" subtitle="Usuarios con rol cliente" />
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Alta rápida</h3>
            <UserForm defaultRole="CLIENT" />
          </div>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>{c.user.name}</td>
                    <td className="small">
                      {c.user.email || "—"}
                      <br />
                      {c.user.phone || "—"}
                    </td>
                    <td>
                      <span className={`badge ${c.active ? "badge-success" : "badge-neutral"}`}>
                        {c.active ? "Activo" : "Baja"}
                      </span>
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
