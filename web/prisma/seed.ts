import { PrismaClient, Role, ServiceCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function assertPrismaModels() {
  const required = [
    "tenant",
    "user",
    "rolePermission",
    "notificationMatrixRule",
    "payment",
    "appointment",
  ] as const;
  const missing = required.filter(
    (k) => !(prisma as unknown as Record<string, { upsert?: unknown }>)[k]?.upsert,
  );
  if (missing.length) {
    throw new Error(
      `Prisma Client desactualizado (faltan: ${missing.join(", ")}). ` +
        `Ejecuta: npx prisma generate && npx prisma db push`,
    );
  }
}

async function main() {
  assertPrismaModels();

  // Seed es idempotente: no borra datos de negocio (citas/pagos reales).
  // Para reset total: npm run db:reset
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Beauty Group" },
    create: {
      name: "Demo Beauty Group",
      slug: "demo",
      settings: {
        create: {
          timezone: "America/Mexico_City",
          currency: "MXN",
          prepaidDiscountPct: 10,
          themePrimary: "#1f4d3a",
          themeAccent: "#e36f4a",
        },
      },
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      timezone: "America/Mexico_City",
      currency: "MXN",
      prepaidDiscountPct: 10,
      themePrimary: "#1f4d3a",
      themeAccent: "#e36f4a",
    },
  });

  // En update NO reescribimos passwordHash (evita resetear claves al cada docker up).
  // Para forzar demo1234 de nuevo: SEED_RESET_PASSWORDS=1
  const resetPw = process.env.SEED_RESET_PASSWORDS === "1";
  const userUpdate = (name: string, extra: Record<string, unknown> = {}) => ({
    name,
    active: true,
    ...extra,
    ...(resetPw ? { passwordHash } : {}),
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: "super@salon.local" },
    update: userUpdate("Super Admin", { isSuperAdmin: true }),
    create: {
      name: "Super Admin",
      email: "super@salon.local",
      passwordHash,
      isSuperAdmin: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@salon.local" },
    update: userUpdate("Ana Admin"),
    create: {
      name: "Ana Admin",
      email: "admin@salon.local",
      passwordHash,
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: "empleado@salon.local" },
    update: userUpdate("Luis Estilista"),
    create: {
      name: "Luis Estilista",
      email: "empleado@salon.local",
      phone: "5512345678",
      passwordHash,
    },
  });

  const employee2User = await prisma.user.upsert({
    where: { email: "maria@salon.local" },
    update: userUpdate("María Colorista"),
    create: {
      name: "María Colorista",
      email: "maria@salon.local",
      passwordHash,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "cliente@salon.local" },
    update: userUpdate("Carla Cliente"),
    create: {
      name: "Carla Cliente",
      email: "cliente@salon.local",
      phone: "5587654321",
      passwordHash,
    },
  });

  for (const [userId, role] of [
    [admin.id, Role.ADMIN],
    [employeeUser.id, Role.EMPLOYEE],
    [employee2User.id, Role.EMPLOYEE],
    [client.id, Role.CLIENT],
  ] as const) {
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId, tenantId: tenant.id } },
      update: { role, active: true },
      create: { userId, tenantId: tenant.id, role },
    });
  }

  const branchCentro = await prisma.branch.upsert({
    where: { id: "seed-branch-centro" },
    update: {},
    create: {
      id: "seed-branch-centro",
      tenantId: tenant.id,
      name: "Sucursal Centro",
      address: "Av. Reforma 123",
      city: "CDMX",
      lat: 19.4326,
      lng: -99.1332,
      phone: "55 1000 1000",
      openTime: "09:00",
      closeTime: "20:00",
    },
  });

  const branchPolanco = await prisma.branch.upsert({
    where: { id: "seed-branch-polanco" },
    update: {},
    create: {
      id: "seed-branch-polanco",
      tenantId: tenant.id,
      name: "Sucursal Polanco",
      address: "Av. Presidente Masaryk 45",
      city: "CDMX",
      lat: 19.4335,
      lng: -99.1945,
      phone: "55 2000 2000",
      openTime: "10:00",
      closeTime: "19:00",
    },
  });

  const servicesData = [
    {
      id: "seed-svc-corte",
      name: "Corte unisex",
      description: "Corte personalizado con lavado y peinado.",
      durationMin: 45,
      priceCents: 35000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
    },
    {
      id: "seed-svc-color",
      name: "Color completo",
      description: "Tinte de raíz a puntas con tratamiento.",
      durationMin: 120,
      priceCents: 120000,
      category: ServiceCategory.COLOR,
      mediaClass: "media-color",
    },
    {
      id: "seed-svc-barba",
      name: "Arreglo de barba",
      description: "Perfilado y afeitado con toalla caliente.",
      durationMin: 30,
      priceCents: 25000,
      category: ServiceCategory.BEARD,
      mediaClass: "media-beard",
    },
    {
      id: "seed-svc-unas",
      name: "Manicure gel",
      description: "Manicure con esmaltado en gel.",
      durationMin: 60,
      priceCents: 45000,
      category: ServiceCategory.NAILS,
      mediaClass: "media-nails",
    },
  ] as const;

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
        category: s.category,
        mediaClass: s.mediaClass,
        active: true,
      },
      create: { ...s, tenantId: tenant.id },
    });
  }

  const emp1 = await prisma.employeeProfile.upsert({
    where: { userId_tenantId: { userId: employeeUser.id, tenantId: tenant.id } },
    update: { title: "Estilista senior", active: true },
    create: {
      userId: employeeUser.id,
      tenantId: tenant.id,
      title: "Estilista senior",
      bio: "Especialista en cortes modernos.",
    },
  });

  const emp2 = await prisma.employeeProfile.upsert({
    where: { userId_tenantId: { userId: employee2User.id, tenantId: tenant.id } },
    update: { title: "Colorista", active: true },
    create: {
      userId: employee2User.id,
      tenantId: tenant.id,
      title: "Colorista",
      bio: "Color y tratamientos capilares.",
    },
  });

  for (const emp of [emp1, emp2]) {
    for (const branch of [branchCentro, branchPolanco]) {
      await prisma.employeeBranch.upsert({
        where: {
          employeeId_branchId: { employeeId: emp.id, branchId: branch.id },
        },
        update: {},
        create: { employeeId: emp.id, branchId: branch.id },
      });
    }
    for (let day = 1; day <= 6; day++) {
      await prisma.workSchedule.upsert({
        where: { employeeId_dayOfWeek: { employeeId: emp.id, dayOfWeek: day } },
        update: { startTime: "09:00", endTime: "18:00" },
        create: {
          employeeId: emp.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
        },
      });
    }
  }

  const allServices = await prisma.service.findMany({ where: { tenantId: tenant.id } });
  for (const emp of [emp1, emp2]) {
    for (const svc of allServices) {
      // María (emp2) no hace barba
      if (emp.id === emp2.id && svc.category === ServiceCategory.BEARD) continue;
      await prisma.employeeService.upsert({
        where: {
          employeeId_serviceId: { employeeId: emp.id, serviceId: svc.id },
        },
        update: {},
        create: { employeeId: emp.id, serviceId: svc.id },
      });
    }
  }

  // No pisar pasarela/demo si ya existen (config real del superadmin)
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      activePaymentProvider: "NONE",
      allowDemoPayments: true,
      enableMercadoPago: true,
      enablePayPal: true,
      enableClip: true,
    },
  });

  const { ensureTenantMatrices } = await import("../src/lib/rbac/seed-matrices");
  // Rellena huecos del catálogo; no pisa overrides existentes (salvo SEED_RESET_MATRICES=1)
  await ensureTenantMatrices(prisma, tenant.id, {
    reset: process.env.SEED_RESET_MATRICES === "1",
  });

  const permCount = await prisma.rolePermission.count({ where: { tenantId: tenant.id } });
  const notifCount = await prisma.notificationMatrixRule.count({
    where: { tenantId: tenant.id },
  });

  console.log("Seed OK (idempotente)");
  console.log("  Tenant: demo");
  console.log("  admin@salon.local / demo1234");
  console.log("  empleado@salon.local / demo1234");
  console.log("  cliente@salon.local / demo1234");
  console.log("  super@salon.local / demo1234");
  console.log(`  RolePermission rows: ${permCount}`);
  console.log(`  NotificationMatrixRule rows: ${notifCount}`);
  console.log("  Pasarela: NONE (demo) — superadmin → Plataforma");
  console.log("  superAdmin id:", superAdmin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
