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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await readSession();
    const tenant = await getDefaultTenant();

    const branchId = String(body.branchId || "");
    const serviceId = String(body.serviceId || "");
    const employeeId = String(body.employeeId || "");
    const date = String(body.date || ""); // YYYY-MM-DD
    const time = String(body.time || ""); // HH:mm
    const clientName = String(body.clientName || session?.name || "").trim();
    const clientEmail = body.clientEmail
      ? String(body.clientEmail).trim()
      : session?.email || null;
    const clientPhone = body.clientPhone
      ? String(body.clientPhone).trim()
      : session?.phone || null;
    const prepaid = Boolean(body.prepaid);

    if (!branchId || !serviceId || !employeeId || !date || !time) {
      return NextResponse.json({ error: "Faltan datos del wizard" }, { status: 400 });
    }
    if (!clientName || (!clientEmail && !clientPhone)) {
      return NextResponse.json(
        { error: "Nombre y correo o celular son requeridos" },
        { status: 400 },
      );
    }

    const [service, employeeLink, branch] = await Promise.all([
      prisma.service.findFirst({ where: { id: serviceId, tenantId: tenant.id, active: true } }),
      prisma.employeeService.findUnique({
        where: { employeeId_serviceId: { employeeId, serviceId } },
      }),
      prisma.branch.findFirst({ where: { id: branchId, tenantId: tenant.id, active: true } }),
    ]);

    if (!service || !branch || !employeeLink) {
      return NextResponse.json({ error: "Servicio, sucursal o profesional inválido" }, { status: 400 });
    }

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      return NextResponse.json({ error: "Fecha/hora inválida" }, { status: 400 });
    }
    const endsAt = addMinutes(startsAt, service.durationMin);

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
      return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 });
    }

    const discount = tenant.settings?.prepaidDiscountPct ?? 10;
    let priceCents = service.priceCents;
    if (prepaid) {
      priceCents = Math.round(priceCents * (1 - discount / 100));
    }

    const appt = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        branchId,
        serviceId,
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
      },
    });

    if (!prepaid) {
      void notifyAppointmentCreated(appt.id).catch(console.error);
      return NextResponse.json({ ok: true, id: appt.id, checkoutUrl: null, demo: false });
    }

    try {
      const checkout = await startPrepaidCheckout({
        tenantId: tenant.id,
        appointmentId: appt.id,
        amountCents: priceCents,
        currency: tenant.settings?.currency || "MXN",
        title: `Prepago: ${service.name}`,
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
      });
    } catch (e) {
      // Liberar el slot si no se pudo iniciar cobro
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
