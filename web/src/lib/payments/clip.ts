import type {
  CheckoutInput,
  CheckoutResult,
  PaymentAdapter,
  ProviderCredentials,
  RefundInput,
  RefundResult,
} from "./types";
import { centsToDecimal } from "./types";

const API = "https://api.payclip.com/v2";

function clipAuthHeader(creds: ProviderCredentials) {
  const key = creds.clipApiKey;
  const secret = creds.clipApiSecret;
  if (!key || !secret) throw new Error("Clip: faltan API Key / Secret");
  const b64 = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${b64}`;
}

export const clipAdapter: PaymentAdapter = {
  async createCheckout(input, creds): Promise<CheckoutResult> {
    const auth = clipAuthHeader(creds);
    const amount = centsToDecimal(input.amountCents);

    const body = {
      amount,
      currency: (input.currency || "MXN").toUpperCase(),
      purchase_description: input.title.slice(0, 250),
      redirection_url: {
        success: input.successUrl,
        error: input.failureUrl,
        default: input.pendingUrl,
      },
      override_settings: {
        locale: "es-MX",
        tip_enabled: false,
      },
      metadata: {
        external_reference: input.paymentId.slice(0, 36),
        customer_info: {
          name: input.payerName || undefined,
          email: input.payerEmail || undefined,
        },
      },
      webhook_url: input.notificationUrl,
    };

    const res = await fetch(`${API}/checkout`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.message || data?.detail || `Clip checkout HTTP ${res.status}`,
      );
    }

    const checkoutUrl = data.payment_request_url;
    const externalId = data.payment_request_id;
    if (!checkoutUrl || !externalId) {
      throw new Error("Clip no devolvió payment_request_url");
    }

    return {
      checkoutUrl: String(checkoutUrl),
      externalId: String(externalId),
      raw: data,
    };
  },

  async refund(input, creds): Promise<RefundResult> {
    try {
      const auth = clipAuthHeader(creds);
      // Clip refunds API: POST /refunds with transaction reference
      const res = await fetch("https://api.payclip.com/refunds", {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: input.externalPaymentId,
          amount: centsToDecimal(input.amountCents),
          reference: input.reason || "Reembolso cita",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error: data?.message || data?.detail || `Clip refund HTTP ${res.status}`,
          raw: data,
        };
      }
      return {
        ok: true,
        externalRefundId: data.id || data.refund_id || undefined,
        raw: data,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Clip refund error" };
    }
  },
};
