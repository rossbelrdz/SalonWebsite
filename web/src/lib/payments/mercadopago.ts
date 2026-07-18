import type {
  CheckoutInput,
  CheckoutResult,
  PaymentAdapter,
  ProviderCredentials,
  RefundInput,
  RefundResult,
} from "./types";
import { centsToDecimal } from "./types";

const API = "https://api.mercadopago.com";

export const mercadoPagoAdapter: PaymentAdapter = {
  async createCheckout(input, creds): Promise<CheckoutResult> {
    const token = creds.mpAccessToken;
    if (!token) throw new Error("Mercado Pago: falta Access Token");

    const body = {
      items: [
        {
          id: input.appointmentId,
          title: input.title.slice(0, 256),
          quantity: 1,
          currency_id: input.currency || "MXN",
          unit_price: centsToDecimal(input.amountCents),
        },
      ],
      payer: input.payerEmail
        ? { email: input.payerEmail, name: input.payerName || undefined }
        : undefined,
      external_reference: input.paymentId,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: "approved" as const,
      notification_url: input.notificationUrl,
      metadata: {
        payment_id: input.paymentId,
        appointment_id: input.appointmentId,
      },
    };

    const res = await fetch(`${API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data?.message ||
        data?.error ||
        data?.cause?.[0]?.description ||
        `MP preference HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    const checkoutUrl = data.init_point || data.sandbox_init_point;
    if (!checkoutUrl || !data.id) {
      throw new Error("Mercado Pago no devolvió init_point");
    }

    return {
      checkoutUrl,
      externalId: String(data.id),
      raw: data,
    };
  },

  async refund(input, creds): Promise<RefundResult> {
    const token = creds.mpAccessToken;
    if (!token) return { ok: false, error: "Sin Access Token MP" };

    const res = await fetch(`${API}/v1/payments/${input.externalPaymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `refund-${input.externalPaymentId}-${input.amountCents}`,
      },
      body: JSON.stringify({
        amount: centsToDecimal(input.amountCents),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data?.message || `MP refund HTTP ${res.status}`,
        raw: data,
      };
    }

    return {
      ok: true,
      externalRefundId: data.id != null ? String(data.id) : undefined,
      raw: data,
    };
  },
};

/** Consulta un pago de Mercado Pago por ID. */
export async function fetchMpPayment(paymentId: string, accessToken: string) {
  const res = await fetch(`${API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `MP get payment ${res.status}`);
  return data as {
    id: number | string;
    status: string;
    external_reference?: string;
    transaction_amount?: number;
    metadata?: { payment_id?: string; appointment_id?: string };
  };
}
