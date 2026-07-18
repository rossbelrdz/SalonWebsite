import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { appBaseUrl } from "@/lib/payments/types";

function rp() {
  const base = appBaseUrl();
  let rpID = "localhost";
  try {
    rpID = new URL(base).hostname;
  } catch {
    /* default */
  }
  return {
    rpName: "Salon",
    rpID,
    origin: base,
  };
}

export async function getRegistrationOptions(userId: string, userName: string) {
  const { rpName, rpID } = rp();
  const existing = await prisma.passkeyCredential.findMany({
    where: { userId },
  });

  return generateRegistrationOptions({
    rpName,
    rpID,
    userName,
    userDisplayName: userName,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(
  userId: string,
  expectedChallenge: string,
  response: RegistrationResponseJSON,
  nickname?: string,
) {
  const { rpID, origin } = rp();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Verificación passkey falló");
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await prisma.passkeyCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports?.join(",") || null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      nickname: nickname || "Passkey",
    },
  });

  return verification;
}

export async function getAuthenticationOptions(userId?: string) {
  const { rpID } = rp();
  const where = userId ? { userId } : {};
  const existing = await prisma.passkeyCredential.findMany({ where });

  return generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    })),
  });
}

export async function verifyAuthentication(
  expectedChallenge: string,
  response: AuthenticationResponseJSON,
) {
  const { rpID, origin } = rp();
  const cred = await prisma.passkeyCredential.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });
  if (!cred) throw new Error("Passkey no registrada");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: cred.credentialId,
      publicKey: new Uint8Array(cred.publicKey),
      counter: Number(cred.counter),
      transports: cred.transports
        ? (cred.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    },
  });

  if (!verification.verified) throw new Error("Autenticación passkey falló");

  await prisma.passkeyCredential.update({
    where: { id: cred.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return { verification, user: cred.user };
}
