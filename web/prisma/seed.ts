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
    "timeEntry",
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

  // Coords reales (demo CDMX) para MapLibre en /sucursales
  const branchCentro = await prisma.branch.upsert({
    where: { id: "seed-branch-centro" },
    update: {
      name: "Sucursal Centro",
      address: "Av. Reforma 123",
      city: "CDMX",
      lat: 19.4326,
      lng: -99.1332,
      phone: "55 1000 1000",
      openTime: "09:00",
      closeTime: "20:00",
      active: true,
    },
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
    update: {
      name: "Sucursal Polanco",
      address: "Av. Presidente Masaryk 45",
      city: "CDMX",
      lat: 19.4335,
      lng: -99.1945,
      phone: "55 2000 2000",
      openTime: "10:00",
      closeTime: "19:00",
      active: true,
    },
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

  // Catálogo demo inspirado en salones top de Monterrey/NL (Valle, San Pedro, Cumbres).
  // Precios MXN en centavos; upsert idempotente por id fijo.
  // imageUrl: assets en public/img/services (4:3, ver media/salon-images/GUIA-IMAGENES.md)
  const servicesData = [
    {
      id: "seed-svc-corte",
      name: "Corte clásico unisex",
      description: "Consulta de estilo, lavado, corte y peinado final. Ideal para mantenimiento.",
      durationMin: 45,
      priceCents: 38000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
      imageUrl: "/img/services/seed-svc-corte.webp",
    },
    {
      id: "seed-svc-corte-dama",
      name: "Corte + peinado dama",
      description: "Corte personalizado con brush y acabado. Incluye lavado y producto de fijación.",
      durationMin: 60,
      priceCents: 52000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
      imageUrl: "/img/services/seed-svc-corte-dama.webp",
    },
    {
      id: "seed-svc-fade",
      name: "Fade / degradado caballero",
      description: "Fade bajo, medio o alto con contornos limpios y peinado con textura.",
      durationMin: 40,
      priceCents: 35000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
      imageUrl: "/img/services/seed-svc-fade.webp",
    },
    {
      id: "seed-svc-corte-barba",
      name: "Corte + barba",
      description: "Paquete caballero: corte o fade más perfilado de barba con toalla caliente.",
      durationMin: 55,
      priceCents: 52000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
      imageUrl: "/img/services/seed-svc-corte-barba.webp",
    },
    {
      id: "seed-svc-brushing",
      name: "Brushing / peinado",
      description: "Lavado, secado con brush y peinado de evento o día a día.",
      durationMin: 40,
      priceCents: 32000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
      imageUrl: "/img/services/seed-svc-brushing.webp",
    },
    {
      id: "seed-svc-keratina",
      name: "Keratina express",
      description: "Tratamiento de alaciado temporal y brillo. Ideal cabello rebelde o frizz (MTY).",
      durationMin: 90,
      priceCents: 180000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-cut",
      imageUrl: "/img/services/seed-svc-keratina.webp",
    },
    {
      id: "seed-svc-botox",
      name: "Botox capilar",
      description: "Reconstrucción profunda: nutrición, sellado de cutícula y brillo espejo.",
      durationMin: 75,
      priceCents: 140000,
      category: ServiceCategory.HAIR,
      mediaClass: "media-spa",
      imageUrl: "/img/services/seed-svc-botox.webp",
    },
    {
      id: "seed-svc-color",
      name: "Tinte completo",
      description: "Color de raíz a puntas con marca profesional y tratamiento post-color.",
      durationMin: 120,
      priceCents: 110000,
      category: ServiceCategory.COLOR,
      mediaClass: "media-color",
      imageUrl: "/img/services/seed-svc-color.webp",
    },
    {
      id: "seed-svc-raiz",
      name: "Retoque de raíz",
      description: "Cobertura de crecimiento hasta 3 cm. Mantiene el tono sin rehacer todo el cabello.",
      durationMin: 75,
      priceCents: 75000,
      category: ServiceCategory.COLOR,
      mediaClass: "media-color",
      imageUrl: "/img/services/seed-svc-raiz.webp",
    },
    {
      id: "seed-svc-balayage",
      name: "Balayage / babylights",
      description: "Iluminación a mano alzada (miel, ceniza o caramelo). Incluye matiz y tratamiento.",
      durationMin: 180,
      priceCents: 220000,
      category: ServiceCategory.COLOR,
      mediaClass: "media-color",
      imageUrl: "/img/services/seed-svc-balayage.webp",
    },
    {
      id: "seed-svc-mechas",
      name: "Mechas con foil",
      description: "Highlights clásicos o zoning. Matizador y ampolla de reparación incluidos.",
      durationMin: 150,
      priceCents: 165000,
      category: ServiceCategory.COLOR,
      mediaClass: "media-color",
      imageUrl: "/img/services/seed-svc-mechas.webp",
    },
    {
      id: "seed-svc-barba",
      name: "Barba full / perfilado",
      description: "Diseño de barba, afeitado de contornos, toalla caliente y bálsamo.",
      durationMin: 30,
      priceCents: 28000,
      category: ServiceCategory.BEARD,
      mediaClass: "media-beard",
      imageUrl: "/img/services/seed-svc-barba.webp",
    },
    {
      id: "seed-svc-afeitado",
      name: "Afeitado clásico navaja",
      description: "Ritual de barbería: vapor, navaja, aftershave y masaje facial breve.",
      durationMin: 35,
      priceCents: 32000,
      category: ServiceCategory.BEARD,
      mediaClass: "media-beard",
      imageUrl: "/img/services/seed-svc-afeitado.webp",
    },
    {
      id: "seed-svc-unas",
      name: "Manicure gel",
      description: "Limado, cutícula, esmaltado en gel de larga duración y hidratación.",
      durationMin: 60,
      priceCents: 42000,
      category: ServiceCategory.NAILS,
      mediaClass: "media-nails",
      imageUrl: "/img/services/seed-svc-unas.webp",
    },
    {
      id: "seed-svc-pedicure",
      name: "Pedicure spa",
      description: "Remojo, exfoliación, cutícula, limado y esmaltado. Opción gel +$80.",
      durationMin: 75,
      priceCents: 48000,
      category: ServiceCategory.NAILS,
      mediaClass: "media-nails",
      imageUrl: "/img/services/seed-svc-pedicure.webp",
    },
    {
      id: "seed-svc-softgel",
      name: "Soft gel / polygel",
      description: "Extensión o refuerzo natural con soft gel. Acabado salón (San Pedro style).",
      durationMin: 90,
      priceCents: 65000,
      category: ServiceCategory.NAILS,
      mediaClass: "media-nails",
      imageUrl: "/img/services/seed-svc-softgel.webp",
    },
    {
      id: "seed-svc-cejas",
      name: "Diseño de cejas",
      description: "Depilación con hilo o cera, simetría y peinado. Tinte opcional consultando.",
      durationMin: 25,
      priceCents: 22000,
      category: ServiceCategory.SPA,
      mediaClass: "media-spa",
      imageUrl: "/img/services/seed-svc-cejas.webp",
    },
    {
      id: "seed-svc-laminado-cejas",
      name: "Laminado de cejas",
      description: "Brow lamination: efecto peinado hacia arriba por 4–6 semanas.",
      durationMin: 45,
      priceCents: 48000,
      category: ServiceCategory.SPA,
      mediaClass: "media-spa",
      imageUrl: "/img/services/seed-svc-laminado-cejas.webp",
    },
    {
      id: "seed-svc-pestañas",
      name: "Extensiones de pestañas clásicas",
      description: "Aplicación 1:1 pelo a pelo. Look natural o volume suave.",
      durationMin: 90,
      priceCents: 75000,
      category: ServiceCategory.SPA,
      mediaClass: "media-spa",
      imageUrl: "/img/services/seed-svc-pestañas.webp",
    },
    {
      id: "seed-svc-facial",
      name: "Facial express",
      description: "Limpieza, exfoliación y mascarilla (piel mixta/grasa clima MTY).",
      durationMin: 50,
      priceCents: 55000,
      category: ServiceCategory.SPA,
      mediaClass: "media-spa",
      imageUrl: "/img/services/seed-svc-facial.webp",
    },
    {
      id: "seed-svc-makeup",
      name: "Maquillaje social",
      description: "Maquillaje para eventos, graduaciones o fotos. Incluye prueba de tono.",
      durationMin: 70,
      priceCents: 75000,
      category: ServiceCategory.MAKEUP,
      mediaClass: "media-makeup",
      imageUrl: "/img/services/seed-svc-makeup.webp",
    },
    {
      id: "seed-svc-makeup-novia",
      name: "Maquillaje de novia",
      description: "Prueba previa + día del evento. Larga duración y retoque express.",
      durationMin: 120,
      priceCents: 180000,
      category: ServiceCategory.MAKEUP,
      mediaClass: "media-makeup",
      imageUrl: "/img/services/seed-svc-makeup-novia.webp",
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
        imageUrl: s.imageUrl,
        active: true,
      },
      create: { ...s, tenantId: tenant.id },
    });
  }

  const emp1 = await prisma.employeeProfile.upsert({
    where: { userId_tenantId: { userId: employeeUser.id, tenantId: tenant.id } },
    update: { title: "Estilista senior", active: true, commissionPct: 40 },
    create: {
      userId: employeeUser.id,
      tenantId: tenant.id,
      title: "Estilista senior",
      bio: "Especialista en cortes modernos.",
      commissionPct: 40,
    },
  });

  const emp2 = await prisma.employeeProfile.upsert({
    where: { userId_tenantId: { userId: employee2User.id, tenantId: tenant.id } },
    update: { title: "Colorista", active: true, commissionPct: 45 },
    create: {
      userId: employee2User.id,
      tenantId: tenant.id,
      title: "Colorista",
      bio: "Color y tratamientos capilares.",
      commissionPct: 45,
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

  // F8 demo: citas completadas de la última quincena (idempotente por id fijo)
  const demoServices = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    take: 6,
    orderBy: { name: "asc" },
  });
  if (demoServices.length > 0) {
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const dayOffset = (i % 10) + 1;
      const startsAt = new Date(now);
      startsAt.setDate(startsAt.getDate() - dayOffset);
      startsAt.setHours(10 + (i % 5), 0, 0, 0);
      const svc = demoServices[i % demoServices.length];
      const emp = i % 2 === 0 ? emp1 : emp2;
      const branch = i % 2 === 0 ? branchCentro : branchPolanco;
      const endsAt = new Date(startsAt.getTime() + svc.durationMin * 60_000);
      const id = `seed-appt-f8-${i}`;
      await prisma.appointment.upsert({
        where: { id },
        update: {
          status: i % 5 === 0 ? "PREPAID" : "COMPLETED",
          priceCents: svc.priceCents,
          prepaid: i % 5 === 0,
        },
        create: {
          id,
          tenantId: tenant.id,
          branchId: branch.id,
          serviceId: svc.id,
          employeeId: emp.id,
          clientUserId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          startsAt,
          endsAt,
          status: i % 5 === 0 ? "PREPAID" : "COMPLETED",
          prepaid: i % 5 === 0,
          priceCents: svc.priceCents,
        },
      });
    }
  }

  // Entrada de ejemplo hoy para emp1 (solo si no hay registro del día)
  {
    const workDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const existing = await prisma.timeEntry.findFirst({
      where: { employeeId: emp1.id, workDate },
    });
    if (!existing && prisma.timeEntry?.create) {
      // ~hace 2h (UTC correcto; evita 09:52 del host Docker = 03:52 en México)
      const checkIn = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await prisma.timeEntry.create({
        data: {
          tenantId: tenant.id,
          employeeId: emp1.id,
          branchId: branchCentro.id,
          workDate,
          checkInAt: checkIn,
        },
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

  // Si hay chat admin legacy, asegura un destino default ops (idempotente)
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: tenant.id },
  });
  if (settings?.telegramAdminChatId && prisma.telegramTarget?.findFirst) {
    const existing = await prisma.telegramTarget.findFirst({
      where: {
        tenantId: tenant.id,
        chatId: settings.telegramAdminChatId,
      },
    });
    if (!existing) {
      await prisma.telegramTarget.create({
        data: {
          tenantId: tenant.id,
          label: "Ops (desde chat admin legacy)",
          kind: "GROUP",
          chatId: settings.telegramAdminChatId,
          isDefaultOps: true,
          active: true,
        },
      });
    }
  }

  const permCount = await prisma.rolePermission.count({ where: { tenantId: tenant.id } });
  const notifCount = await prisma.notificationMatrixRule.count({
    where: { tenantId: tenant.id },
  });
  const tgCount = prisma.telegramTarget
    ? await prisma.telegramTarget.count({ where: { tenantId: tenant.id } })
    : 0;

  console.log("Seed OK (idempotente)");
  console.log("  Tenant: demo");
  console.log("  admin@salon.local / demo1234");
  console.log("  empleado@salon.local / demo1234");
  console.log("  cliente@salon.local / demo1234");
  console.log("  super@salon.local / demo1234");
  console.log(`  RolePermission rows: ${permCount}`);
  console.log(`  NotificationMatrixRule rows: ${notifCount}`);
  console.log(`  TelegramTarget rows: ${tgCount}`);
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
