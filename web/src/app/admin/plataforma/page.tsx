import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { getPlatformSettings, providerLabel } from "@/lib/payments";
import { PageHeader } from "@/components/ui";
import { PlatformClient } from "./PlatformClient";

export const dynamic = "force-dynamic";

export default async function PlataformaPage() {
  const session = await readSession();
  if (!session?.isSuperAdmin) redirect("/admin");

  const p = await getPlatformSettings();

  return (
    <>
      <PageHeader
        title="Plataforma"
        subtitle="Solo superadmin — pasarela de pago global"
      />
      <PlatformClient
        initial={{
          activePaymentProvider: p.activePaymentProvider,
          enableMercadoPago: p.enableMercadoPago,
          enablePayPal: p.enablePayPal,
          enableClip: p.enableClip,
          allowDemoPayments: p.allowDemoPayments,
        }}
        labels={{
          NONE: providerLabel("NONE"),
          MERCADOPAGO: providerLabel("MERCADOPAGO"),
          PAYPAL: providerLabel("PAYPAL"),
          CLIP: providerLabel("CLIP"),
        }}
      />
    </>
  );
}
