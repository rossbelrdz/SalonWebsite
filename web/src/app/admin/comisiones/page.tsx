import { getDefaultTenant } from "@/lib/auth";
import { computeCommissions } from "@/lib/commissions";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { currentQuincena, tenantTimezone } from "@/lib/timezone";
import { CommissionRatesClient } from "./CommissionRatesClient";

export const dynamic = "force-dynamic";

export default async function AdminComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const tenant = await getDefaultTenant();
  const tz = tenantTimezone(tenant.settings?.timezone);
  const q = currentQuincena(new Date(), tz);
  const sp = await searchParams;
  const from =
    sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : q.from;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : q.to;

  const rows = await computeCommissions({
    tenantId: tenant.id,
    from,
    to,
    timeZone: tz,
  });

  const totalComm = rows.reduce((s, r) => s + r.commissionCents, 0);
  const totalSvc = rows.reduce((s, r) => s + r.servicesCents, 0);

  return (
    <>
      <PageHeader
        title="Comisiones"
        subtitle={`Periodo ${from} → ${to} · ${tz}`}
      />

      <div className="notice notice-info" style={{ marginBottom: "1rem" }}>
        Modelo provisional: % fijo por empleado sobre el precio de citas
        confirmadas / prepagadas / completadas. Investigación en{" "}
        <code>docs/COMMISSIONS_RESEARCH.md</code>.
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Servicios $</div>
          <div className="kpi-value" style={{ fontSize: "1.35rem" }}>
            {formatPrice(totalSvc)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Comisiones $</div>
          <div className="kpi-value" style={{ fontSize: "1.35rem" }}>
            {formatPrice(totalComm)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Personal</div>
          <div className="kpi-value" style={{ fontSize: "1.35rem" }}>
            {rows.length}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Quincena ref.</div>
          <div className="kpi-value" style={{ fontSize: "1rem" }}>
            {q.label}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Servicios $</th>
                <th>%</th>
                <th>Comisión</th>
                <th>Clientes</th>
                <th>Citas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>
                    {r.name}
                    <div className="tiny muted">{r.title}</div>
                  </td>
                  <td>{formatPrice(r.servicesCents)}</td>
                  <td>{r.commissionPct}%</td>
                  <td>
                    <strong>{formatPrice(r.commissionCents)}</strong>
                  </td>
                  <td>{r.clients}</td>
                  <td>{r.appointments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
        Ajustar % por empleado
      </h2>
      <CommissionRatesClient
        rows={rows.map((r) => ({
          employeeId: r.employeeId,
          name: r.name,
          commissionPct: r.commissionPct,
        }))}
      />
    </>
  );
}
