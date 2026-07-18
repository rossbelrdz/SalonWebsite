import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { readSession } from "@/lib/session";
import { BookingWizard } from "./BookingWizard";

export const dynamic = "force-dynamic";

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; serviceId?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getDefaultTenant();
  const session = await readSession();

  const [branches, services, employees] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.employeeProfile.findMany({
      where: { tenantId: tenant.id, active: true },
      include: {
        user: true,
        branches: true,
        services: true,
      },
    }),
  ]);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: "0.35rem" }}>Agendar cita</h2>
        <p className="muted">
          Sucursal → servicio → profesional → fecha/hora → tus datos
        </p>
        <BookingWizard
          branches={branches.map((b) => ({
            id: b.id,
            name: b.name,
            address: b.address,
            city: b.city,
          }))}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
            mediaClass: s.mediaClass,
            category: s.category,
          }))}
          employees={employees.map((e) => ({
            id: e.id,
            name: e.user.name,
            title: e.title,
            branchIds: e.branches.map((b) => b.branchId),
            serviceIds: e.services.map((s) => s.serviceId),
          }))}
          discountPct={tenant.settings?.prepaidDiscountPct ?? 10}
          initialBranchId={sp.branchId}
          initialServiceId={sp.serviceId}
          defaultName={session?.name ?? ""}
          defaultEmail={session?.email ?? ""}
          defaultPhone={session?.phone ?? ""}
        />
      </div>
    </section>
  );
}
