import { NextResponse } from "next/server";
import { markPaymentApproved } from "@/lib/payments";

/**
 * Webhook PayPal (eventos). En producción conviene verificar firma.
 * También capturamos en /pago/resultado al volver del approve.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventType = body.event_type as string | undefined;

    if (
      eventType === "CHECKOUT.ORDER.APPROVED" ||
      eventType === "PAYMENT.CAPTURE.COMPLETED"
    ) {
      const resource = body.resource || {};
      const orderId = resource.id || resource.supplementary_data?.related_ids?.order_id;
      const captureId =
        resource.id && eventType === "PAYMENT.CAPTURE.COMPLETED"
          ? resource.id
          : resource.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      const reference =
        resource.purchase_units?.[0]?.reference_id ||
        resource.supplementary_data?.related_ids?.order_id;

      if (reference || orderId) {
        await markPaymentApproved({
          paymentId: reference,
          externalId: orderId,
          externalPaymentId: captureId,
          raw: body,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[paypal webhook]", e);
    return NextResponse.json({ ok: true });
  }
}
