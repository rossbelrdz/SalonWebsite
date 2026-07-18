import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import {
  formatDateTime,
  formatPrice,
  statusBadgeClass,
  statusLabel,
} from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { AdminCancelButton } from "./AdminCancelButton";
import { ReassignButton } from "./ReassignButton";

export const dynamic = "force-dynamic";

export default async function AdminCitasPage() {
  const tenant = await getDefaultTenant();
  const [appointments, employees] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: tenant.id },
      include: {
        service: true,
        branch: true,
        employee: { include: { user: true } },
        proposedEmployee: { include: { user: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { startsAt: "desc" },
      take: 100,
    }),
    prisma.employeeProfile.findMany({
      where: { tenantId: tenant.id, active: true },
      include: { user: true },
    }),
  ]);

  const empOpts = employees.map((e) => ({ id: e.id, name: e.user.name }));

  return (
    <>
      <PageHeader
        title="Citas"
        subtitle="Operación, reasignación y prepago"
      />
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Sucursal</th>
                <th>Profesional</th>
                <th>Estado</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.startsAt)}</td>
                  <td>
                    {a.clientName}
                    <div className="tiny muted">
                      {a.clientEmail || a.clientPhone || "—"}
                    </div>
                  </td>
                  <td>{a.service.name}</td>
                  <td>{a.branch.name}</td>
                  <td>
                    {a.employee.user.name}
                    {a.proposedEmployee && (
                      <div className="tiny muted">
                        → {a.proposedEmployee.user.name}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={statusBadgeClass(a.status)}>
                      {statusLabel(a.status)}
                    </span>
                    {a.prepaid && (
                      <div className="tiny muted">
                        Prepago
                        {a.payments[0] ? ` · ${a.payments[0].status}` : ""}
                      </div>
                    )}
                  </td>
                  <td>{formatPrice(a.priceCents)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {a.status !== "CANCELLED" &&
                        a.status !== "COMPLETED" &&
                        a.status !== "REASSIGNMENT_PENDING" && (
                          <ReassignButton id={a.id} employees={empOpts} />
                        )}
                      {a.status !== "CANCELLED" && a.status !== "COMPLETED" && (
                        <AdminCancelButton id={a.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
