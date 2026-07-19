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

## Infra (env / Compose)

```text
APP_ENCRYPTION_KEY=
SESSION_SECRET=
POSTGRES_PASSWORD=
MINIO_ROOT_PASSWORD=
```

## Producto (Admin → Configuración, cifrado en TenantSettings)

No van en `.env` de la app. Se configuran por tenant en la UI:

| Integración | Campos |
|-------------|--------|
| Resend | API key, from email / name |
| Telegram | Bot token, destinos (grupos/canales), legacy chat admin |
| Turnstile | Site key + secret |

También puedes documentar valores locales en este archivo gitignored; el runtime lee de DB.
