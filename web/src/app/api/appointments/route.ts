import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { readSession } from "@/lib/session";
import { startPrepaidCheckout } from "@/lib/payments";
import {
  notifyAppointmentCreated,
  notifyAppointmentPrepaid,
} from "@/lib/notifications";
import { appointmentServicesLabel } from "@/lib/appointment-services";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await readSession();
    const tenant = await getDefaultTenant();

    const branchId = String(body.branchId || "");
    const employeeId = String(body.employeeId || "");
    const date = String(body.date || "");
    const time = String(body.time || "");
    const clientName = String(body.clientName || session?.name || "").trim();
    const clientEmail = body.clientEmail
      ? String(body.clientEmail).trim()
      : session?.email || null;
    const clientPhone = body.clientPhone
      ? String(body.clientPhone).trim()
      : session?.phone || null;
    const prepaid = Boolean(body.prepaid);

    // Multi-servicio o legacy serviceId
    let serviceIds: string[] = [];
    if (Array.isArray(body.serviceIds)) {
      serviceIds = body.serviceIds.map((x: unknown) => String(x)).filter(Boolean);
    } else if (body.serviceId) {
      serviceIds = [String(body.serviceId)];
    }
    // únicos, orden estable
    serviceIds = [...new Set(serviceIds)];

    if (!branchId || serviceIds.length === 0 || !employeeId || !date || !time) {
      return NextResponse.json({ error: "Faltan datos del wizard" }, { status: 400 });
    }
    if (!clientName || (!clientEmail && !clientPhone)) {
      return NextResponse.json(
        { error: "Nombre y correo o celular son requeridos" },
        { status: 400 },
      );
    }

    const [services, branch, employee] = await Promise.all([
      prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId: tenant.id, active: true },
      }),
      prisma.branch.findFirst({
        where: { id: branchId, tenantId: tenant.id, active: true },
      }),
      prisma.employeeProfile.findFirst({
        where: { id: employeeId, tenantId: tenant.id, active: true },
      }),
    ]);

    if (!branch || !employee || services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "Servicio, sucursal o profesional inválido" },
        { status: 400 },
      );
    }

    // Empleado ofrece todos + trabaja en la sucursal
    const [svcLinks, branchLink] = await Promise.all([
      prisma.employeeService.findMany({
        where: { employeeId, serviceId: { in: serviceIds } },
      }),
      prisma.employeeBranch.findUnique({
        where: { employeeId_branchId: { employeeId, branchId } },
      }),
    ]);
    if (svcLinks.length !== serviceIds.length || !branchLink) {
      return NextResponse.json(
        { error: "El profesional no ofrece todos los servicios en esa sucursal" },
        { status: 400 },
      );
    }

    // Mantener orden del cliente
    const ordered = serviceIds
      .map((id) => services.find((s) => s.id === id)!)
      .filter(Boolean);
    const durationMin = ordered.reduce((s, x) => s + x.durationMin, 0);
    const listPrice = ordered.reduce((s, x) => s + x.priceCents, 0);

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      return NextResponse.json({ error: "Fecha/hora inválida" }, { status: 400 });
    }
    const endsAt = addMinutes(startsAt, durationMin);

    const conflict = await prisma.appointment.findFirst({
      where: {
        employeeId,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.PENDING],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible" },
        { status: 409 },
      );
    }

    const discount = tenant.settings?.prepaidDiscountPct ?? 10;
    let priceCents = listPrice;
    if (prepaid) {
      priceCents = Math.round(listPrice * (1 - discount / 100));
    }

    const primaryId = ordered[0].id;
    const titleServices = ordered.map((s) => s.name).join(" + ");

    const appt = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        branchId,
        serviceId: primaryId,
        employeeId,
        clientUserId: session?.userId ?? null,
        clientName,
        clientEmail,
        clientPhone,
        startsAt,
        endsAt,
        prepaid: false,
        priceCents,
        status: prepaid ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED,
        lines: {
          create: ordered.map((s, i) => ({
            serviceId: s.id,
            sortOrder: i,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
          })),
        },
      },
      include: {
        service: true,
        lines: { include: { service: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    if (!prepaid) {
      void notifyAppointmentCreated(appt.id).catch(console.error);
      return NextResponse.json({
        ok: true,
        id: appt.id,
        checkoutUrl: null,
        demo: false,
      });
    }

    try {
      const checkout = await startPrepaidCheckout({
        tenantId: tenant.id,
        appointmentId: appt.id,
        amountCents: priceCents,
        currency: tenant.settings?.currency || "MXN",
        title: `Prepago: ${titleServices}`,
        payerEmail: clientEmail,
        payerName: clientName,
        settings: tenant.settings,
      });

      if (checkout.demo) {
        void notifyAppointmentPrepaid(appt.id).catch(console.error);
      }

      return NextResponse.json({
        ok: true,
        id: appt.id,
        paymentId: checkout.paymentId,
        checkoutUrl: checkout.checkoutUrl,
        demo: checkout.demo,
        provider: checkout.provider,
        label: appointmentServicesLabel(appt),
      });
    } catch (e) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: "Falló inicio de prepago",
        },
      });
      const msg = e instanceof Error ? e.message : "No se pudo iniciar el prepago";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo crear la cita" }, { status: 500 });
  }
}
