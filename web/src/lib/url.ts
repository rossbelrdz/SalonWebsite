/**
 * URLs públicas de la app.
 *
 * Nunca uses `req.url` crudo para redirects: en Docker Next escucha en
 * `--hostname 0.0.0.0` y el origin del request queda `http://0.0.0.0:3000`.
 *
 * Orden de resolución (browser redirects):
 * 1. x-forwarded-host / x-forwarded-proto (Cloudflare tunnel / reverse proxy)
 * 2. Host del request si no es dirección de bind (0.0.0.0, ::)
 * 3. PUBLIC_APP_URL / NEXT_PUBLIC_APP_URL (emails, webhooks, payments)
 */

const BIND_HOSTS = new Set(["0.0.0.0", "[::]", "::", "[::0]", "0:0:0:0:0:0:0:0"]);

/** Base canónica para links absolutos (emails, pagos, WebAuthn). Sin trailing slash. */
export function appBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3010"
  ).replace(/\/$/, "");
}

function firstHeader(req: Request, name: string): string | null {
  const raw = req.headers.get(name);
  if (!raw) return null;
  return raw.split(",")[0]?.trim() || null;
}

function hostIsBindAddress(host: string): boolean {
  // "0.0.0.0:3000", "[::]:3000", "0.0.0.0"
  if (host.startsWith("0.0.0.0")) return true;
  if (host.startsWith("[::]") || host.startsWith("::")) return true;
  const name = host.startsWith("[")
    ? host.slice(1, host.indexOf("]"))
    : host.split(":")[0];
  return BIND_HOSTS.has(name);
}

/**
 * Origin que ve el navegador (para redirects HTTP).
 * Preferir headers del proxy; nunca devolver 0.0.0.0.
 */
export function requestPublicOrigin(req: Request): string {
  const xfHost = firstHeader(req, "x-forwarded-host");
  const xfProto = firstHeader(req, "x-forwarded-proto");

  if (xfHost && !hostIsBindAddress(xfHost)) {
    const proto =
      xfProto === "http" || xfProto === "https"
        ? xfProto
        : xfHost.includes("localhost") || xfHost.startsWith("127.")
          ? "http"
          : "https";
    return `${proto}://${xfHost}`.replace(/\/$/, "");
  }

  const host = firstHeader(req, "host");
  if (host && !hostIsBindAddress(host)) {
    let proto = xfProto;
    if (proto !== "http" && proto !== "https") {
      // Infer from env if host matches PUBLIC_APP_URL, else localhost → http
      try {
        const env = new URL(appBaseUrl());
        if (env.host === host) proto = env.protocol.replace(":", "");
      } catch {
        /* ignore */
      }
      if (proto !== "http" && proto !== "https") {
        proto =
          host.includes("localhost") || host.startsWith("127.") ? "http" : "https";
      }
    }
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  // Fallback: no confiar en req.url (suele ser 0.0.0.0 en Docker)
  return appBaseUrl();
}

/** URL absoluta a un path (empieza con /). */
export function absoluteUrl(path: string, req?: Request): string {
  const base = req ? requestPublicOrigin(req) : appBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
