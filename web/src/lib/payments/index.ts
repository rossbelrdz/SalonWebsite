import {
  PaymentProvider,
  PaymentStatus,
  AppointmentStatus,
  type TenantSettings,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { mercadoPagoAdapter } from "./mercadopago";
import { paypalAdapter } from "./paypal";
import { clipAdapter } from "./clip";
import {
  appBaseUrl,
  providerLabel,
  type CheckoutInput,
  type ProviderCredentials,
} from "./types";

export { appBaseUrl, providerLabel, centsToDecimal } from "./types";
export type { ProviderCredentials } from "./types";

export async function getPlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function getActiveProvider(): Promise<PaymentProvider> {
  const p = await getPlatformSettings();
  return p.activePaymentProvider;
}

export function credentialsFromSettings(
  provider: PaymentProvider,
  s: TenantSettings | null | undefined,
): ProviderCredentials {
  return {
    provider,
    mpAccessToken: decryptSecret(s?.mpAccessTokenEnc),
    mpPublicKey: s?.mpPublicKey ?? null,
    paypalClientId: s?.paypalClientId ?? null,
    paypalClientSecret: decryptSecret(s?.paypalClientSecretEnc),
    paypalSandbox: s?.paypalSandbox ?? true,
    clipApiKey: decryptSecret(s?.clipApiKeyEnc),
    clipApiSecret: decryptSecret(s?.clipApiSecretEnc),
  };
}

export function hasProviderCredentials(
  provider: PaymentProvider,
  creds: ProviderCredentials,
): boolean {
  switch (provider) {
    case PaymentProvider.MERCADOPAGO:
      return Boolean(creds.mpAccessToken);
    case PaymentProvider.PAYPAL:
      return Boolean(creds.paypalClientId && creds.paypalClientSecret);
    case PaymentProvider.CLIP:
      return Boolean(creds.clipApiKey && creds.clipApiSecret);
    case PaymentProvider.NONE:
      return false;
    default:
      return false;
  }
}

function adapterFor(provider: PaymentProvider) {
  switch (provider) {
    case PaymentProvider.MERCADOPAGO:
      return mercadoPagoAdapter;
    case PaymentProvider.PAYPAL:
      return paypalAdapter;
    case PaymentProvider.CLIP:
      return clipAdapter;
    default:
      return null;
  }
}

/**
 * Crea registro Payment + checkout del proveedor activo.
 * Si provider=NONE o sin credenciales y demo permitido → aprueba en demo.
 */
export async function startPrepaidCheckout(opts: {
  tenantId: string;
  appointmentId: string;
  amountCents: number;
  currency: string;
  title: string;
  payerEmail?: string | null;
  payerName?: string | null;
  settings: TenantSettings | null | undefined;
}) {
  const platform = await getPlatformSettings();
  const provider = platform.activePaymentProvider;
  const creds = credentialsFromSettings(provider, opts.settings);
  const ready = hasProviderCredentials(provider, creds);

  const payment = await prisma.payment.create({
    data: {
      tenantId: opts.tenantId,
      appointmentId: opts.appointmentId,
      provider,
      status: PaymentStatus.PENDING,
      amountCents: opts.amountCents,
      currency: opts.currency || "MXN",
    },
  });

  // Demo: sin pasarela o sin credenciales
  if (provider === PaymentProvider.NONE || !ready) {
    if (!platform.allowDemoPayments) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          failureReason: "Pasarela no configurada",
        },
      });
      throw new Error(
        "Prepago no disponible: el superadmin debe activar y configurar una pasarela (Mercado Pago, PayPal o Clip).",
      );
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.APPROVED,
        paidAt: new Date(),
        externalId: `demo-${payment.id}`,
        externalPaymentId: `demo-pay-${payment.id}`,
        rawMeta: { demo: true, reason: provider === "NONE" ? "provider_none" : "missing_credentials" },
      },
    });
    await prisma.appointment.update({
      where: { id: opts.appointmentId },
      data: { status: AppointmentStatus.PREPAID, prepaid: true },
    });

    return {
      paymentId: payment.id,
      demo: true as const,
      checkoutUrl: null as string | null,
      provider,
    };
  }

  const base = appBaseUrl();
  const input: CheckoutInput = {
    paymentId: payment.id,
    appointmentId: opts.appointmentId,
    title: opts.title,
    amountCents: opts.amountCents,
    currency: opts.currency || "MXN",
    payerEmail: opts.payerEmail,
    payerName: opts.payerName,
    successUrl: `${base}/pago/resultado?status=success&paymentId=${payment.id}&appointmentId=${opts.appointmentId}`,
    failureUrl: `${base}/pago/resultado?status=failure&paymentId=${payment.id}&appointmentId=${opts.appointmentId}`,
    pendingUrl: `${base}/pago/resultado?status=pending&paymentId=${payment.id}&appointmentId=${opts.appointmentId}`,
    notificationUrl: `${base}/api/payments/webhooks/${provider.toLowerCase()}`,
  };

  const adapter = adapterFor(provider);
  if (!adapter) throw new Error("Proveedor no soportado");

  try {
    const result = await adapter.createCheckout(input, creds);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: result.externalId,
        checkoutUrl: result.checkoutUrl,
        rawMeta: result.raw as object,
      },
    });
    await prisma.appointment.update({
      where: { id: opts.appointmentId },
      data: { status: AppointmentStatus.PENDING, prepaid: true },
    });

    return {
      paymentId: payment.id,
      demo: false as const,
      checkoutUrl: result.checkoutUrl,
      provider,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de pasarela";
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REJECTED, failureReason: msg },
    });
    throw e;
  }
}

/** Marca pago aprobado y cita prepagada. */
export async function markPaymentApproved(opts: {
  paymentId?: string;
  externalId?: string;
  externalPaymentId?: string;
  raw?: unknown;
}) {
  const payment = opts.paymentId
    ? await prisma.payment.findUnique({ where: { id: opts.paymentId } })
    : opts.externalId
      ? await prisma.payment.findFirst({
          where: { externalId: opts.externalId },
          orderBy: { createdAt: "desc" },
        })
      : null;

  if (!payment) return null;
  if (payment.status === PaymentStatus.APPROVED) return payment;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.APPROVED,
      paidAt: new Date(),
      externalPaymentId: opts.externalPaymentId || payment.externalPaymentId,
      rawMeta: opts.raw ? (opts.raw as object) : undefined,
    },
  });

  await prisma.appointment.update({
    where: { id: payment.appointmentId },
    data: {
      status: AppointmentStatus.PREPAID,
      prepaid: true,
    },
  });

  try {
    const { notifyAppointmentPrepaid } = await import("@/lib/notifications");
    void notifyAppointmentPrepaid(payment.appointmentId).catch(console.error);
  } catch {
    /* ignore circular/bootstrap */
  }

  return updated;
}

/**
 * Calcula monto reembolsable según política del tenant.
 * @returns cents a reembolsar (0 = sin reembolso)
 */
export function computeRefundCents(
  amountCents: number,
  startsAt: Date,
  settings: {
    refundFullHours: number;
    refundPartialPct: number;
    refundNoneHours: number;
  },
  now = new Date(),
): { refundCents: number; policy: "full" | "partial" | "none" } {
  const hoursLeft = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursLeft < settings.refundNoneHours) {
    return { refundCents: 0, policy: "none" };
  }
  if (hoursLeft >= settings.refundFullHours) {
    return { refundCents: amountCents, policy: "full" };
  }
  const pct = Math.min(100, Math.max(0, settings.refundPartialPct));
  return {
    refundCents: Math.round((amountCents * pct) / 100),
    policy: "partial",
  };
}

export async function refundAppointmentPayment(appointmentId: string, reason?: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      payments: {
        where: { status: { in: [PaymentStatus.APPROVED, PaymentStatus.PARTIAL_REFUND] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      tenant: { include: { settings: true } },
    },
  });
  if (!appt) throw new Error("Cita no encontrada");

  const payment = appt.payments[0];
  if (!payment || !appt.prepaid) {
    return { refunded: false, refundCents: 0, reason: "Sin pago aprobable" };
  }

  const s = appt.tenant.settings;
  const policy = {
    refundFullHours: s?.refundFullHours ?? 24,
    refundPartialPct: s?.refundPartialPct ?? 50,
    refundNoneHours: s?.refundNoneHours ?? 2,
  };
  const { refundCents, policy: policyKind } = computeRefundCents(
    payment.amountCents,
    appt.startsAt,
    policy,
  );

  if (refundCents <= 0) {
    return { refunded: false, refundCents: 0, policy: policyKind, reason: "Fuera de ventana de reembolso" };
  }

  // Demo payments
  if (
    payment.provider === PaymentProvider.NONE ||
    payment.externalPaymentId?.startsWith("demo-")
  ) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:
          refundCents >= payment.amountCents
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIAL_REFUND,
        refundAmountCents: refundCents,
        refundedAt: new Date(),
        rawMeta: {
          ...(typeof payment.rawMeta === "object" && payment.rawMeta
            ? (payment.rawMeta as object)
            : {}),
          demoRefund: true,
          reason,
        },
      },
    });
    return { refunded: true, refundCents, policy: policyKind, demo: true };
  }

  const creds = credentialsFromSettings(payment.provider, s);
  const adapter = adapterFor(payment.provider);
  if (!adapter || !payment.externalPaymentId) {
    return {
      refunded: false,
      refundCents,
      policy: policyKind,
      reason: "Sin adaptador o externalPaymentId",
    };
  }

  const result = await adapter.refund(
    {
      externalPaymentId: payment.externalPaymentId,
      amountCents: refundCents,
      currency: payment.currency,
      reason,
    },
    creds,
  );

  if (!result.ok) {
    return {
      refunded: false,
      refundCents,
      policy: policyKind,
      reason: result.error || "Reembolso falló en pasarela",
      raw: result.raw,
    };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status:
        refundCents >= payment.amountCents
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIAL_REFUND,
      refundAmountCents: refundCents,
      refundedAt: new Date(),
      rawMeta: {
        ...(typeof payment.rawMeta === "object" && payment.rawMeta
          ? (payment.rawMeta as Record<string, unknown>)
          : {}),
        refund: result.raw ?? null,
      } as object,
    },
  });

  return {
    refunded: true,
    refundCents,
    policy: policyKind,
    externalRefundId: result.externalRefundId,
  };
}
