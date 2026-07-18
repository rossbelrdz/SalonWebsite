import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  generateMfaSecret,
  encryptMfaSecret,
  mfaOtpauthUrl,
  verifyMfaToken,
  decryptMfaSecret,
} from "@/lib/mfa";

/** Inicia setup MFA: devuelve secret + QR. */
export async function POST() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const secret = generateMfaSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecretEnc: encryptMfaSecret(secret),
        mfaEnabled: false, // hasta confirmar con código
      },
    });

    const otpauth = mfaOtpauthUrl({
      secret,
      email: user.email || user.phone || user.id,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({
      ok: true,
      secret,
      otpauth,
      qrDataUrl,
      message: "Escanea el QR y confirma con un código de 6 dígitos",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/** Confirma MFA con código, o desactiva. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    if (body.action === "disable") {
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: false, mfaSecretEnc: null },
      });
      return NextResponse.json({ ok: true, mfaEnabled: false });
    }

    const secret = decryptMfaSecret(user.mfaSecretEnc);
    if (!secret) {
      return NextResponse.json({ error: "Primero inicia el setup MFA" }, { status: 400 });
    }
    const token = String(body.token || "");
    if (!verifyMfaToken(secret, token)) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });
    return NextResponse.json({ ok: true, mfaEnabled: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
