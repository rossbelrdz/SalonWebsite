import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { hasStaffAccess } from "@/lib/auth";
import { formatDateTime, statusBadgeClass, statusLabel } from "@/lib/format";
import { AbsenceForm } from "./AbsenceForm";

export const dynamic = "force-dynamic";

export default async function EmpleadoAgendaPage() {
  const session = await readSession();
  if (!session || !hasStaffAccess(session)) redirect("/login");

  const profile = await prisma.employeeProfile.findFirst({
    where: { userId: session.userId, active: true },
  });

  // Admin sin profile ve mensaje (sigue dentro del EmpleadoShell del layout)
  if (!profile) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Vista empleado</h1>
        <p className="muted">No hay perfil de empleado vinculado a esta cuenta.</p>
        <Link href="/admin" className="btn btn-secondary">
          Volver al admin
        </Link>
      </div>
    );
  }

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const tomorrowEnd = endOfDay(tomorrowStart);

  const [today, tomorrow] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        employeeId: profile.id,
        startsAt: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
      include: { service: true, branch: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        employeeId: profile.id,
        startsAt: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { not: "CANCELLED" },
      },
      include: { service: true, branch: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.5rem", marginTop: 0 }}>Hoy</h1>
      {today.length === 0 ? (
        <p className="muted">Sin citas hoy.</p>
      ) : (
        <div className="stack" style={{ marginBottom: "2rem" }}>
          {today.map((a) => (
            <div key={a.id} className="card">
              <div className="card-body row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{a.service.name}</strong>
                  <div className="small muted">
                    {formatDateTime(a.startsAt)} · {a.branch.name}
                  </div>
                  <div className="small">Cliente: {a.clientName}</div>
                </div>
                <span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: "1.25rem" }}>Mañana</h2>
      {tomorrow.length === 0 ? (
        <p className="muted">Sin citas mañana.</p>
      ) : (
        <div className="stack" style={{ marginBottom: "2rem" }}>
          {tomorrow.map((a) => (
            <div key={a.id} className="card">
              <div className="card-body">
                <strong>{a.service.name}</strong>
                <div className="small muted">{formatDateTime(a.startsAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div id="permiso">
        <AbsenceForm />
      </div>
    </div>
  );
}
