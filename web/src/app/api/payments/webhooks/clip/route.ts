import { NextResponse } from "next/server";
import { markPaymentApproved } from "@/lib/payments";

/**
 * Webhook Clip Checkout (payment_request status).
 * https://developer.clip.mx/reference/webhookshxo
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const status =
      body.status ||
      body.payment_status ||
      body?.payment_request?.status ||
      "";

    const paymentRequestId =
      body.payment_request_id ||
      body.id ||
      body?.payment_request?.payment_request_id;

    const externalRef =
      body.metadata?.external_reference ||
      body?.payment_request?.metadata?.external_reference;

    const completed =
      String(status).toUpperCase().includes("COMPLETED") ||
      String(status).toUpperCase() === "APPROVED" ||
      String(status).toUpperCase() === "PAID";

    if (completed && (paymentRequestId || externalRef)) {
      await markPaymentApproved({
        paymentId: externalRef,
        externalId: paymentRequestId ? String(paymentRequestId) : undefined,
        externalPaymentId:
          body.receipt_no || body.transaction_id || paymentRequestId
            ? String(body.receipt_no || body.transaction_id || paymentRequestId)
            : undefined,
        raw: body,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[clip webhook]", e);
    return NextResponse.json({ ok: true });
  }
}
