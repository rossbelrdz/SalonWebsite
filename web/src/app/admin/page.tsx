import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { appointmentServicesLabel } from "@/lib/appointment-services";
import { PageHeader } from "@/components/ui";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const tenant = await getDefaultTenant();
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const [todayCount, services, branches, upcoming, revenue] = await Promise.all([
    prisma.appointment.count({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.service.count({ where: { tenantId: tenant.id, active: true } }),
    prisma.branch.count({ where: { tenantId: tenant.id, active: true } }),
    prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: now },
        status: { not: "CANCELLED" },
      },
      include: {
        service: true,
        lines: { include: { service: true }, orderBy: { sortOrder: "asc" } },
        client: true,
        employee: { include: { user: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.appointment.aggregate({
      where: {
        tenantId: tenant.id,
        status: { in: ["CONFIRMED", "PREPAID", "COMPLETED"] },
        startsAt: { gte: start, lte: end },
      },
      _sum: { priceCents: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={tenant.name}
        actions={
          <Link href="/agendar" className="btn btn-accent btn-sm">
            Nueva cita
          </Link>
        }
      />
      <div className="kpi-grid">
        {[
          { label: "Citas hoy", value: String(todayCount) },
          { label: "Servicios", value: String(services) },
          { label: "Sucursales", value: String(branches) },
          {
            label: "Ingresos hoy*",
            value: formatPrice(revenue._sum.priceCents ?? 0),
          },
        ].map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Próximas citas</h3>
          {upcoming.length === 0 ? (
            <p className="muted small">No hay citas próximas.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Cliente</th>
                    <th>Profesional</th>
                    <th>Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a) => (
                    <tr key={a.id}>
                      <td>{appointmentServicesLabel(a)}</td>
                      <td>{a.clientName}</td>
                      <td>{a.employee.user.name}</td>
                      <td>{a.startsAt.toLocaleString("es-MX")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: "1rem" }}>
            * Suma de citas no canceladas del día (prepago real en F6).
          </p>
        </div>
      </div>
    </>
  );
}
