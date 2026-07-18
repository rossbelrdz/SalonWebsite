# Credenciales locales (ejemplo)

Copia este archivo a `credentials.md` (gitignored) y rellena valores reales.

**Nunca** commitees `credentials.md` ni pegues tokens en CHANGELOG / PRs.

---

## Cloudflare Tunnel

```text
CLOUDFLARE_TUNNEL_TOKEN=
```

Hostname público: `https://salon.freonx.org`  
Destino interno Compose: `http://app:3000`  
Detalle: [DEPLOY.md](./DEPLOY.md)

---

## Otras (cuando existan)

```text
RESEND_API_KEY=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TELEGRAM_BOT_TOKEN=
APP_ENCRYPTION_KEY=
POSTGRES_PASSWORD=
MINIO_ROOT_PASSWORD=
```

También puedes ponerlas solo en `.env` (preferido para Compose).
