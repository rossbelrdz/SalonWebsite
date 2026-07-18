import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  credentialsFromSettings,
  markPaymentApproved,
} from "@/lib/payments";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import { PaymentProvider } from "@prisma/client";

/** Tras approve de PayPal, captura la orden. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentId = String(body.paymentId || "");
    const token = String(body.token || body.orderId || ""); // PayPal devuelve token=ORDER_ID

    if (!paymentId && !token) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const payment = paymentId
      ? await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { tenant: { include: { settings: true } } },
        })
      : await prisma.payment.findFirst({
          where: { externalId: token, provider: PaymentProvider.PAYPAL },
          include: { tenant: { include: { settings: true } } },
        });

    if (!payment) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    const orderId = token || payment.externalId;
    if (!orderId) {
      return NextResponse.json({ error: "Sin order id" }, { status: 400 });
    }

    const creds = credentialsFromSettings(PaymentProvider.PAYPAL, payment.tenant.settings);
    const captured = await capturePayPalOrder(orderId, creds);
    const captureId =
      captured.purchase_units?.[0]?.payments?.captures?.[0]?.id || captured.id;

    if (captured.status === "COMPLETED" || captureId) {
      await markPaymentApproved({
        paymentId: payment.id,
        externalId: orderId,
        externalPaymentId: captureId,
        raw: captured,
      });
    }

    return NextResponse.json({ ok: true, status: captured.status, captureId });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Capture falló" },
      { status: 500 },
    );
  }
}
