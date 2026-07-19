import { getDefaultTenant } from "@/lib/auth";
import { buildTenantReport } from "@/lib/reports";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { currentMonth, tenantTimezone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const tenant = await getDefaultTenant();
  const tz = tenantTimezone(tenant.settings?.timezone);
  const month = currentMonth(new Date(), tz);
  const sp = await searchParams;
  const from =
    sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : month.from;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : month.to;

  const report = await buildTenantReport({
    tenantId: tenant.id,
    from,
    to,
    label: month.label,
    timeZone: tz,
  });

  const maxDay = Math.max(1, ...report.byDay.map((d) => d.cents));

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={`${from} → ${to} · ${tz}`}
      />

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Citas del periodo</div>
          <div className="kpi-value">{report.appointments}</div>
          <div className="kpi-delta">
            {report.completedLike} activas / completadas
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tasa prepago</div>
          <div className="kpi-value">{report.prepaidRate.toFixed(0)}%</div>
          <div className="kpi-delta">
            {report.prepaidCount} de {report.completedLike}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Cancelaciones</div>
          <div className="kpi-value">{report.cancelRate.toFixed(1)}%</div>
          <div className="kpi-delta">{report.cancelled} canceladas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Reembolsos</div>
          <div className="kpi-value" style={{ fontSize: "1.35rem" }}>
            {formatPrice(report.refundCents)}
          </div>
          <div className="kpi-delta">
            Ingresos est. {formatPrice(report.revenueCents)}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: "1rem", marginTop: 0 }}>Ingresos por día</h3>
            {report.byDay.every((d) => d.cents === 0) ? (
              <p className="muted small">Sin ingresos en el periodo.</p>
            ) : (
              <div className="chart-placeholder" role="img" aria-label="Barras de ingresos diarios">
                {report.byDay.map((d) => (
                  <div
                    key={d.date}
                    className="chart-bar"
                    title={`${d.date}: ${formatPrice(d.cents)} (${d.count} citas)`}
                    style={{
                      height: `${Math.max(4, Math.round((d.cents / maxDay) * 100))}%`,
                    }}
                  />
                ))}
              </div>
            )}
            <div
              className="row tiny muted"
              style={{ justifyContent: "space-between", marginTop: "0.5rem" }}
            >
              <span>{from}</span>
              <span>{to}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: "1rem", marginTop: 0 }}>
              Servicios más vendidos
            </h3>
            {report.topServices.length === 0 ? (
              <p className="muted small">Sin datos de servicios.</p>
            ) : (
              <div className="stack" style={{ gap: "0.65rem" }}>
                {report.topServices.map((s) => (
                  <div
                    key={s.serviceId}
                    className="row"
                    style={{ justifyContent: "space-between", gap: 8 }}
                  >
                    <span className="small">
                      {s.name}
                      <span className="tiny muted"> · {s.count}</span>
                    </span>
                    <strong>{s.pct.toFixed(0)}%</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
