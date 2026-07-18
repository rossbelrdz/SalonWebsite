import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, getDefaultTenant } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { isValidHex } from "@/lib/theme";
import { getActiveProvider } from "@/lib/payments";

export async function GET() {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const s = tenant.settings;
    const activeProvider = await getActiveProvider();
    return NextResponse.json({
      themePrimary: s?.themePrimary ?? "",
      themeAccent: s?.themeAccent ?? "",
      timezone: s?.timezone ?? "America/Mexico_City",
      currency: s?.currency ?? "MXN",
      prepaidDiscountPct: s?.prepaidDiscountPct ?? 10,
      minLeadMinutes: s?.minLeadMinutes ?? 60,
      maxLeadDays: s?.maxLeadDays ?? 60,
      refundFullHours: s?.refundFullHours ?? 24,
      refundPartialPct: s?.refundPartialPct ?? 50,
      refundNoneHours: s?.refundNoneHours ?? 2,
      resendFromEmail: s?.resendFromEmail ?? "",
      resendFromName: s?.resendFromName ?? "",
      hasResendKey: Boolean(s?.resendApiKeyEnc),
      telegramEnabled: s?.telegramEnabled ?? false,
      hasTelegramToken: Boolean(s?.telegramBotTokenEnc),
      telegramAdminChatId: s?.telegramAdminChatId ?? "",
      turnstileSiteKey: s?.turnstileSiteKey ?? "",
      hasTurnstileSecret: Boolean(s?.turnstileSecretEnc),
      businessName: tenant.name,
      activeProvider,
      mpPublicKey: s?.mpPublicKey ?? "",
      hasMpToken: Boolean(s?.mpAccessTokenEnc),
      paypalClientId: s?.paypalClientId ?? "",
      paypalSandbox: s?.paypalSandbox ?? true,
      hasPaypalSecret: Boolean(s?.paypalClientSecretEnc),
      hasClipKey: Boolean(s?.clipApiKeyEnc),
      hasClipSecret: Boolean(s?.clipApiSecretEnc),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.section === "general") {
      if (body.businessName) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { name: String(body.businessName).trim() },
        });
      }
      if (body.timezone) data.timezone = String(body.timezone);
      if (body.currency) data.currency = String(body.currency);
    }

    if (body.section === "appearance") {
      if (body.reset) {
        data.themePrimary = "#1f4d3a";
        data.themeAccent = "#e36f4a";
      } else {
        if (body.themePrimary) {
          if (!isValidHex(body.themePrimary)) {
            return NextResponse.json({ error: "Primary hex inválido" }, { status: 400 });
          }
          data.themePrimary = body.themePrimary;
        }
        if (body.themeAccent) {
          if (!isValidHex(body.themeAccent)) {
            return NextResponse.json({ error: "Accent hex inválido" }, { status: 400 });
          }
          data.themeAccent = body.themeAccent;
        }
      }
    }

    if (body.section === "correo") {
      if (body.resendFromEmail !== undefined) data.resendFromEmail = body.resendFromEmail || null;
      if (body.resendFromName !== undefined) data.resendFromName = body.resendFromName || null;
      if (body.resendApiKey) data.resendApiKeyEnc = encryptSecret(String(body.resendApiKey));
    }

    if (body.section === "telegram") {
      if (body.telegramEnabled !== undefined) data.telegramEnabled = Boolean(body.telegramEnabled);
      if (body.telegramBotToken) {
        data.telegramBotTokenEnc = encryptSecret(String(body.telegramBotToken));
      }
      if (body.telegramAdminChatId !== undefined) {
        data.telegramAdminChatId = body.telegramAdminChatId
          ? String(body.telegramAdminChatId).trim()
          : null;
      }
    }

    if (body.section === "turnstile") {
      if (body.turnstileSiteKey !== undefined) {
        data.turnstileSiteKey = body.turnstileSiteKey || null;
      }
      if (body.turnstileSecret) {
        data.turnstileSecretEnc = encryptSecret(String(body.turnstileSecret));
      }
    }

    if (body.section === "citas") {
      if (body.prepaidDiscountPct !== undefined) {
        data.prepaidDiscountPct = Number(body.prepaidDiscountPct);
      }
      if (body.minLeadMinutes !== undefined) {
        data.minLeadMinutes = Number(body.minLeadMinutes);
      }
      if (body.maxLeadDays !== undefined) {
        data.maxLeadDays = Number(body.maxLeadDays);
      }
      if (body.refundFullHours !== undefined) {
        data.refundFullHours = Number(body.refundFullHours);
      }
      if (body.refundPartialPct !== undefined) {
        data.refundPartialPct = Number(body.refundPartialPct);
      }
      if (body.refundNoneHours !== undefined) {
        data.refundNoneHours = Number(body.refundNoneHours);
      }
    }

    if (body.section === "pagos_mp") {
      if (body.mpPublicKey !== undefined) data.mpPublicKey = body.mpPublicKey || null;
      if (body.mpAccessToken) {
        data.mpAccessTokenEnc = encryptSecret(String(body.mpAccessToken));
      }
    }

    if (body.section === "pagos_paypal") {
      if (body.paypalClientId !== undefined) {
        data.paypalClientId = body.paypalClientId || null;
      }
      if (body.paypalClientSecret) {
        data.paypalClientSecretEnc = encryptSecret(String(body.paypalClientSecret));
      }
      if (body.paypalSandbox !== undefined) {
        data.paypalSandbox = Boolean(body.paypalSandbox);
      }
    }

    if (body.section === "pagos_clip") {
      if (body.clipApiKey) {
        data.clipApiKeyEnc = encryptSecret(String(body.clipApiKey));
      }
      if (body.clipApiSecret) {
        data.clipApiSecretEnc = encryptSecret(String(body.clipApiSecret));
      }
    }

    await prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: data,
      create: { tenantId: tenant.id, ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
