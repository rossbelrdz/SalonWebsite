import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminNotificacionesPage() {
  const tenant = await getDefaultTenant();
  const items = await prisma.notificationLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <>
      <PageHeader
        title="Notificaciones"
        subtitle="Cola BullMQ — email / Telegram / in-app (auditoría)"
      />
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Canal</th>
                <th>Destino</th>
                <th>Estado</th>
                <th>Asunto / error</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Sin envíos aún. Se generan al crear/cancelar citas, prepago, etc.
                  </td>
                </tr>
              )}
              {items.map((n) => (
                <tr key={n.id}>
                  <td className="tiny">{formatDateTime(n.createdAt)}</td>
                  <td className="tiny">{n.eventType}</td>
                  <td>
                    <span className="badge">{n.channel}</span>
                  </td>
                  <td className="tiny">{n.recipient || "—"}</td>
                  <td>
                    <span
                      className={
                        n.status === "SENT"
                          ? "badge badge-success"
                          : n.status === "FAILED"
                            ? "badge badge-danger"
                            : n.status === "SKIPPED"
                              ? "badge badge-warning"
                              : "badge"
                      }
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="tiny">
                    {n.subject || n.error || (n.body ? n.body.slice(0, 60) : "—")}
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
