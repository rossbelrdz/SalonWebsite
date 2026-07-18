import type {
  CheckoutInput,
  CheckoutResult,
  PaymentAdapter,
  ProviderCredentials,
  RefundInput,
  RefundResult,
} from "./types";
import { centsToDecimal } from "./types";

function baseUrl(sandbox: boolean) {
  return sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

async function getAccessToken(creds: ProviderCredentials): Promise<string> {
  const id = creds.paypalClientId;
  const secret = creds.paypalClientSecret;
  if (!id || !secret) throw new Error("PayPal: faltan Client ID / Secret");

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl(Boolean(creds.paypalSandbox))}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description || "PayPal OAuth falló");
  }
  return data.access_token as string;
}

export const paypalAdapter: PaymentAdapter = {
  async createCheckout(input, creds): Promise<CheckoutResult> {
    const token = await getAccessToken(creds);
    const currency = (input.currency || "MXN").toUpperCase();
    const value = centsToDecimal(input.amountCents).toFixed(2);

    const res = await fetch(`${baseUrl(Boolean(creds.paypalSandbox))}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.paymentId,
            description: input.title.slice(0, 127),
            custom_id: input.appointmentId,
            amount: {
              currency_code: currency,
              value,
            },
          },
        ],
        application_context: {
          brand_name: "Salon",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: input.successUrl,
          cancel_url: input.failureUrl,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.message || data?.details?.[0]?.description || `PayPal order HTTP ${res.status}`,
      );
    }

    const approve = (data.links as { rel: string; href: string }[] | undefined)?.find(
      (l) => l.rel === "approve",
    );
    if (!data.id || !approve?.href) {
      throw new Error("PayPal no devolvió link de aprobación");
    }

    return {
      checkoutUrl: approve.href,
      externalId: String(data.id),
      raw: data,
    };
  },

  async refund(input, creds): Promise<RefundResult> {
    try {
      const token = await getAccessToken(creds);
      const value = centsToDecimal(input.amountCents).toFixed(2);
      const res = await fetch(
        `${baseUrl(Boolean(creds.paypalSandbox))}/v2/payments/captures/${input.externalPaymentId}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: {
              value,
              currency_code: (input.currency || "MXN").toUpperCase(),
            },
            note_to_payer: input.reason || "Reembolso de cita",
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error: data?.message || `PayPal refund HTTP ${res.status}`,
          raw: data,
        };
      }
      return {
        ok: true,
        externalRefundId: data.id ? String(data.id) : undefined,
        raw: data,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "PayPal refund error" };
    }
  },
};

export async function capturePayPalOrder(orderId: string, creds: ProviderCredentials) {
  const token = await getAccessToken(creds);
  const res = await fetch(
    `${baseUrl(Boolean(creds.paypalSandbox))}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `PayPal capture HTTP ${res.status}`);
  }
  return data as {
    id: string;
    status: string;
    purchase_units?: {
      payments?: {
        captures?: { id: string; status: string }[];
      };
      reference_id?: string;
      custom_id?: string;
    }[];
  };
}
