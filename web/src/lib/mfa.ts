import { generateSecret, generateURI, verifySync } from "otplib";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export function generateMfaSecret() {
  return generateSecret();
}

export function encryptMfaSecret(secret: string) {
  return encryptSecret(secret);
}

export function decryptMfaSecret(enc: string | null | undefined) {
  return decryptSecret(enc);
}

export function verifyMfaToken(secret: string, token: string) {
  const result = verifySync({
    token: token.replace(/\s/g, ""),
    secret,
  });
  return Boolean(result.valid);
}

export function mfaOtpauthUrl(opts: {
  secret: string;
  email: string;
  issuer?: string;
}) {
  return generateURI({
    issuer: opts.issuer || "Salon",
    label: opts.email || "usuario",
    secret: opts.secret,
  });
}
