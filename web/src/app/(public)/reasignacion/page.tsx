import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { formatDateTime, formatPrice } from "@/lib/format";
import { appointmentServicesLabel } from "@/lib/appointment-services";
import { ReassignClient } from "./ReassignClient";

export const dynamic = "force-dynamic";

export default async function ReasignacionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  const { id } = await searchParams;
  if (!id) notFound();

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      lines: { include: { service: true }, orderBy: { sortOrder: "asc" } },
      branch: true,
      employee: { include: { user: true } },
      proposedEmployee: { include: { user: true } },
    },
  });
  if (!appt) notFound();

  const isOwner = appt.clientUserId === session.userId;
  const isAdmin = session.isSuperAdmin || session.role === "ADMIN";
  if (!isOwner && !isAdmin) redirect("/mis-citas");

  if (appt.status !== "REASSIGNMENT_PENDING") {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="card-body">
              <h2>Sin reasignación pendiente</h2>
              <p className="muted">Esta cita no requiere tu decisión ahora.</p>
              <Link href="/mis-citas" className="btn btn-primary">
                Mis citas
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const lineServiceIds =
    appt.lines.length > 0
      ? appt.lines.map((l) => l.serviceId)
      : [appt.serviceId];

  const employees = await prisma.employeeProfile.findMany({
    where: {
      tenantId: appt.tenantId,
      active: true,
      AND: lineServiceIds.map((serviceId) => ({
        services: { some: { serviceId } },
      })),
    },
    include: { user: true },
  });

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-header">
          <div>
            <h2>Tu cita necesita una decisión</h2>
            <p className="muted" style={{ margin: 0 }}>
              {appointmentServicesLabel(appt)} · {formatDateTime(appt.startsAt)} ·{" "}
              {formatPrice(appt.priceCents)}
              {appt.prepaid ? " · Prepagada" : ""}
            </p>
          </div>
        </div>
        <p className="small muted">
          Profesional actual: {appt.employee.user.name}
          {appt.proposedEmployee
            ? ` → propuesto: ${appt.proposedEmployee.user.name}`
            : ""}
        </p>
        <ReassignClient
          appointmentId={appt.id}
          proposedName={appt.proposedEmployee?.user.name ?? null}
          note={appt.reassignmentNote}
          employees={employees.map((e) => ({ id: e.id, name: e.user.name }))}
        />
      </div>
    </section>
  );
}
