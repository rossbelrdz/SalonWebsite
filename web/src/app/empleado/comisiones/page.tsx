import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getDefaultTenant, hasStaffAccess } from "@/lib/auth";
import { employeeCommissionSummary } from "@/lib/commissions";
import { formatPrice } from "@/lib/format";
import {
  currentQuincena,
  lastNDays,
  tenantTimezone,
  workDateInTz,
} from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function EmpleadoComisionesPage() {
  const session = await readSession();
  if (!session || !hasStaffAccess(session)) redirect("/login");

  const tenant = await getDefaultTenant();
  const profile = await prisma.employeeProfile.findFirst({
    where: { userId: session.userId, tenantId: tenant.id, active: true },
  });

  if (!profile) {
    return (
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Mis comisiones</h1>
        <p className="muted">No hay perfil de empleado vinculado a esta cuenta.</p>
        <Link href="/empleado" className="btn btn-secondary btn-sm">
          Volver
        </Link>
      </div>
    );
  }

  const tz = tenantTimezone(tenant.settings?.timezone);
  const now = new Date();
  const today = workDateInTz(now, tz);
  const yesterday = workDateInTz(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
    tz,
  );
  const week = lastNDays(7, now, tz);
  const q = currentQuincena(now, tz);

  const summary = await employeeCommissionSummary({
    tenantId: tenant.id,
    employeeId: profile.id,
    timeZone: tz,
    quincenaFrom: q.from,
    quincenaTo: q.to,
    today,
    yesterday,
    weekFrom: week.from,
    weekTo: week.to,
  });

  const qRow = summary.quincena;

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Mis comisiones</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Estimado con tu % actual · modelo provisional
      </p>

      <div className="kpi" style={{ marginBottom: "1rem" }}>
        <div className="kpi-label">
          Quincena actual · {summary.commissionPct}%
        </div>
        <div className="kpi-value">
          {formatPrice(qRow?.commissionCents ?? 0)}
        </div>
        <div className="kpi-delta up">
          {qRow?.clients ?? 0} clientes ·{" "}
          {formatPrice(qRow?.servicesCents ?? 0)} en servicios
          <div className="tiny muted" style={{ marginTop: 4 }}>
            {q.label} ({q.from} → {q.to})
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body stack" style={{ gap: "0.65rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="small">Hoy (estimado)</span>
            <strong>{formatPrice(summary.today?.commissionCents ?? 0)}</strong>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="small">Ayer</span>
            <strong>
              {formatPrice(summary.yesterday?.commissionCents ?? 0)}
            </strong>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="small">Esta semana</span>
            <strong>{formatPrice(summary.week?.commissionCents ?? 0)}</strong>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="small">Citas en quincena</span>
            <strong>{qRow?.appointments ?? 0}</strong>
          </div>
        </div>
      </div>

      <p className="tiny muted" style={{ marginTop: "1rem" }}>
        Se incluyen citas confirmadas, prepagadas y completadas. El admin puede
        ajustar tu % de comisión.
      </p>
    </div>
  );
}
