import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { getActiveProvider } from "@/lib/payments";
import { PageHeader } from "@/components/ui";
import { ConfigClient } from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const tenant = await getDefaultTenant();
  const s = tenant.settings;
  const activeProvider = await getActiveProvider();
  const members = await prisma.membership.findMany({
    where: { tenantId: tenant.id },
    include: { user: true },
    orderBy: { role: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="General, apariencia, pagos, integraciones y usuarios"
      />
      <ConfigClient
        initial={{
          businessName: tenant.name,
          themePrimary: s?.themePrimary || "#1f4d3a",
          themeAccent: s?.themeAccent || "#e36f4a",
          timezone: s?.timezone || "America/Mexico_City",
          currency: s?.currency || "MXN",
          prepaidDiscountPct: s?.prepaidDiscountPct ?? 10,
          minLeadMinutes: s?.minLeadMinutes ?? 60,
          maxLeadDays: s?.maxLeadDays ?? 60,
          refundFullHours: s?.refundFullHours ?? 24,
          refundPartialPct: s?.refundPartialPct ?? 50,
          refundNoneHours: s?.refundNoneHours ?? 2,
          resendFromEmail: s?.resendFromEmail || "",
          resendFromName: s?.resendFromName || "",
          hasResendKey: Boolean(s?.resendApiKeyEnc),
          telegramEnabled: s?.telegramEnabled ?? false,
          hasTelegramToken: Boolean(s?.telegramBotTokenEnc),
          telegramAdminChatId: s?.telegramAdminChatId || "",
          turnstileSiteKey: s?.turnstileSiteKey || "",
          hasTurnstileSecret: Boolean(s?.turnstileSecretEnc),
          activeProvider,
          mpPublicKey: s?.mpPublicKey || "",
          hasMpToken: Boolean(s?.mpAccessTokenEnc),
          paypalClientId: s?.paypalClientId || "",
          paypalSandbox: s?.paypalSandbox ?? true,
          hasPaypalSecret: Boolean(s?.paypalClientSecretEnc),
          hasClipKey: Boolean(s?.clipApiKeyEnc),
          hasClipSecret: Boolean(s?.clipApiSecretEnc),
        }}
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          role: m.role,
          active: m.active,
        }))}
      />
    </>
  );
}
