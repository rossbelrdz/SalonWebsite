import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { markPaymentApproved } from "@/lib/payments";
import { fetchMpPayment } from "@/lib/payments/mercadopago";

/**
 * Webhook Mercado Pago (IPN / notifications).
 * https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id =
      url.searchParams.get("id") ||
      url.searchParams.get("data.id") ||
      null;

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      /* query-only IPN */
    }

    const paymentId =
      id ||
      (body?.data as { id?: string } | undefined)?.id ||
      (typeof body?.id === "string" || typeof body?.id === "number"
        ? String(body.id)
        : null);

    const kind = topic || (body?.type as string) || (body?.action as string) || "";

    if (!paymentId || (kind && !String(kind).includes("payment") && kind !== "payment")) {
      // Acknowledge non-payment topics
      if (!paymentId) return NextResponse.json({ ok: true, ignored: true });
    }

    // Buscar token de algún tenant (bootstrap single-tenant; multi-tenant: usar metadata)
    const settings = await prisma.tenantSettings.findFirst({
      where: { mpAccessTokenEnc: { not: null } },
    });
    const token = decryptSecret(settings?.mpAccessTokenEnc);
    if (!token) {
      console.warn("[mp webhook] sin access token");
      return NextResponse.json({ ok: true, warn: "no_token" });
    }

    const mpPayment = await fetchMpPayment(String(paymentId), token);
    if (mpPayment.status === "approved") {
      const internalId =
        mpPayment.external_reference ||
        mpPayment.metadata?.payment_id ||
        undefined;
      await markPaymentApproved({
        paymentId: internalId,
        externalPaymentId: String(mpPayment.id),
        raw: mpPayment,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mp webhook]", e);
    return NextResponse.json({ ok: true }); // no reintentar en loop por errores nuestros
  }
}

export async function GET(req: Request) {
  // MP a veces valida con GET
  return POST(req);
}
