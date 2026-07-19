import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { listAttendanceForDate } from "@/lib/attendance";
import { PageHeader } from "@/components/ui";
import { tenantTimezone, workDateInTz } from "@/lib/timezone";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const tenant = await getDefaultTenant();
  const tz = tenantTimezone(tenant.settings?.timezone);
  const sp = await searchParams;
  const today = workDateInTz(new Date(), tz);
  const workDate =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const rows = await listAttendanceForDate({
    tenantId: tenant.id,
    workDate,
    timeZone: tz,
  });

  const prev = shiftDate(workDate, -1);
  const next = shiftDate(workDate, 1);

  return (
    <>
      <PageHeader
        title="Asistencia · checador"
        subtitle={`${workDate} · ${tz}`}
        actions={
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Link href={`/admin/asistencia?date=${prev}`} className="btn btn-ghost btn-sm">
              ← Día ant.
            </Link>
            <Link href={`/admin/asistencia?date=${today}`} className="btn btn-secondary btn-sm">
              Hoy
            </Link>
            <Link href={`/admin/asistencia?date=${next}`} className="btn btn-ghost btn-sm">
              Día sig. →
            </Link>
          </div>
        }
      />

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Sucursal</th>
                <th>Turno</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted small">
                    No hay personal activo.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.employeeId}>
                    <td>
                      {r.name}
                      <div className="tiny muted">{r.title}</div>
                    </td>
                    <td>{r.branchName}</td>
                    <td className="small muted">
                      {r.scheduleStart
                        ? `${r.scheduleStart}–${r.scheduleEnd}`
                        : "—"}
                    </td>
                    <td>{r.checkInHm ?? "—"}</td>
                    <td>{r.checkOutHm ?? "—"}</td>
                    <td>
                      <span className={r.badgeClass}>{r.statusLabel}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function shiftDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
