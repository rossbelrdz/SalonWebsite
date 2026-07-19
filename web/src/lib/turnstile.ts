/**
 * Cloudflare Turnstile server-side verification.
 * Secrets live in TenantSettings (AES-GCM), not env.
 */

export async function verifyTurnstileToken(
  token: string,
  secret: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token || !secret) {
    return { ok: false, error: "Token o secret vacío" };
  }
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      const codes = data["error-codes"]?.join(", ") || "verification failed";
      return { ok: false, error: codes };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Turnstile request failed",
    };
  }
}

/**
 * Si el tenant tiene secret configurado, exige y verifica token.
 * Si solo hay site key sin secret → no exige (skip).
 * Si no hay ninguno → skip.
 */
export async function requireTurnstileIfConfigured(opts: {
  token: string | null | undefined;
  siteKey: string | null | undefined;
  secret: string | null | undefined;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const secret = opts.secret?.trim() || null;
  if (!secret) {
    return { ok: true };
  }
  const token = opts.token?.trim() || "";
  if (!token) {
    return {
      ok: false,
      error: "Completa la verificación anti-bot (Turnstile)",
      status: 400,
    };
  }
  const result = await verifyTurnstileToken(token, secret);
  if (!result.ok) {
    return {
      ok: false,
      error: "Verificación anti-bot fallida. Intenta de nuevo.",
      status: 400,
    };
  }
  return { ok: true };
}
