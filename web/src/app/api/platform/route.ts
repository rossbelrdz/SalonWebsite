import { NextResponse } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getPlatformSettings, providerLabel } from "@/lib/payments";

async function requireSuper() {
  const session = await requireSession();
  if (!session.isSuperAdmin) throw new Error("FORBIDDEN");
  return session;
}

export async function GET() {
  try {
    await requireSuper();
    const p = await getPlatformSettings();
    return NextResponse.json({
      activePaymentProvider: p.activePaymentProvider,
      enableMercadoPago: p.enableMercadoPago,
      enablePayPal: p.enablePayPal,
      enableClip: p.enableClip,
      allowDemoPayments: p.allowDemoPayments,
      providers: [
        { id: "NONE", label: providerLabel("NONE"), enabled: true },
        { id: "MERCADOPAGO", label: providerLabel("MERCADOPAGO"), enabled: p.enableMercadoPago },
        { id: "PAYPAL", label: providerLabel("PAYPAL"), enabled: p.enablePayPal },
        { id: "CLIP", label: providerLabel("CLIP"), enabled: p.enableClip },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuper();
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.activePaymentProvider) {
      const v = String(body.activePaymentProvider) as PaymentProvider;
      if (!Object.values(PaymentProvider).includes(v)) {
        return NextResponse.json({ error: "Proveedor inválido" }, { status: 400 });
      }
      data.activePaymentProvider = v;
    }
    if (body.enableMercadoPago !== undefined) data.enableMercadoPago = Boolean(body.enableMercadoPago);
    if (body.enablePayPal !== undefined) data.enablePayPal = Boolean(body.enablePayPal);
    if (body.enableClip !== undefined) data.enableClip = Boolean(body.enableClip);
    if (body.allowDemoPayments !== undefined) {
      data.allowDemoPayments = Boolean(body.allowDemoPayments);
    }

    const p = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    return NextResponse.json({ ok: true, settings: p });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
