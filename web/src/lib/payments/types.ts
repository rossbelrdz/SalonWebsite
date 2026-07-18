import type { PaymentProvider } from "@prisma/client";

export type CheckoutInput = {
  paymentId: string;
  appointmentId: string;
  title: string;
  amountCents: number;
  currency: string;
  payerEmail?: string | null;
  payerName?: string | null;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  externalId: string;
  raw?: unknown;
};

export type RefundInput = {
  externalPaymentId: string;
  amountCents: number;
  currency: string;
  reason?: string;
};

export type RefundResult = {
  ok: boolean;
  externalRefundId?: string;
  raw?: unknown;
  error?: string;
};

export type ProviderCredentials = {
  provider: PaymentProvider;
  // Mercado Pago
  mpAccessToken?: string | null;
  mpPublicKey?: string | null;
  // PayPal
  paypalClientId?: string | null;
  paypalClientSecret?: string | null;
  paypalSandbox?: boolean;
  // Clip
  clipApiKey?: string | null;
  clipApiSecret?: string | null;
};

export interface PaymentAdapter {
  createCheckout(input: CheckoutInput, creds: ProviderCredentials): Promise<CheckoutResult>;
  refund(input: RefundInput, creds: ProviderCredentials): Promise<RefundResult>;
}

export function appBaseUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3010"
  ).replace(/\/$/, "");
}

export function centsToDecimal(cents: number) {
  return Math.round(cents) / 100;
}

export function providerLabel(p: PaymentProvider | string) {
  switch (p) {
    case "MERCADOPAGO":
      return "Mercado Pago";
    case "PAYPAL":
      return "PayPal";
    case "CLIP":
      return "Clip";
    case "NONE":
      return "Demo / sin pasarela";
    default:
      return p;
  }
}
