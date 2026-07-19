import { getDefaultTenant } from "@/lib/auth";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let turnstileSiteKey: string | null = null;
  try {
    const tenant = await getDefaultTenant();
    const s = tenant.settings;
    // Solo exponer site key si también hay secret (captcha real)
    if (s?.turnstileSiteKey && s?.turnstileSecretEnc) {
      turnstileSiteKey = s.turnstileSiteKey;
    }
  } catch {
    turnstileSiteKey = null;
  }
  return <LoginClient turnstileSiteKey={turnstileSiteKey} />;
}
