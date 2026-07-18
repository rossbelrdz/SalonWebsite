# Stack y versiones

Política: **versiones estables, pinneadas, auditadas**. No usar major “bleeding edge” sin verificar CVE y madurez.  
Seguridad de dependencias: [SECURITY.md](./SECURITY.md).

---

## Componentes objetivo

| Componente | Versión objetivo | Notas |
|------------|------------------|--------|
| **Runtime Node.js** | **22 LTS** (o LTS vigente estable al momento del scaffold) | Moderna, no obsoleta; pin en imagen Docker `node:22-bookworm` (o tag exacto digest) |
| **Next.js** | Última **estable** de la línea actual al scaffold (App Router) | Auditar al instalar; no “canary” en prod |
| **PostgreSQL** | **18.x estable** (minor actual, p.ej. **≥ 18.4**) | GA desde 2025-09-25; usar imagen oficial `postgres:18` pinneada a minor/patch |
| **Redis** | **8.x** | Requerido para BullMQ en este proyecto |
| **BullMQ** | Última estable compatible con Redis ≥ 6.2 (usamos Redis 8) | Workers en contenedor aparte preferible |
| **MinIO** | Imagen oficial estable vigente | S3-compatible para imágenes/videos |
| **Docker / Compose** | Docker Desktop local del equipo | Todo el stack en contenedores |
| **Cloudflare Tunnel** | `cloudflared` estable | Hostname `salon.freonx.org`; token owner → [DEPLOY.md](./DEPLOY.md) |
| **Cloudflare Turnstile** | API actual | Anti-bot (no es auth) |
| **Resend** | API / SDK estable | Correo transaccional |
| **Telegram Bot API** | API oficial | Citas/notificaciones opcionales |

> **Postgres 18:** es la línea major estable soportada. Siempre preferir el **último patch** de la serie 18.x (seguridad). No subir a 19 hasta que sea GA estable y se evalúe en [SECURITY.md](./SECURITY.md).

> **Node:** preferir **LTS**. Si en el host hay Node 26+ experimental/current, **no** es la referencia del proyecto: la referencia es la imagen Docker pinneada.

---

## BullMQ + Redis 8

- BullMQ requiere Redis-compatible **≥ 6.2**.  
- Este proyecto **estandariza Redis 8** como broker de colas.  
- Usos iniciales de la cola:
  - Correos de confirmación / cancelación / reasignación  
  - Notificaciones Telegram  
  - Jobs que no deben bloquear el request HTTP  

No enviar correos síncronos en el request de “crear cita” en producción.

---

## Docker (principio)

```text
docker compose up
  → app (Next.js)
  → worker (BullMQ)
  → postgres:18.x
  → redis:8
  → minio

docker compose --profile tunnel up   # + cloudflared → salon.freonx.org
```

- Desarrollo **local** con Docker Desktop (sin tunnel).  
- Mismo compose + perfil `tunnel` para demo/deploy público.  
- Secrets por `.env` (no commiteado). Detalle tunnel: [DEPLOY.md](./DEPLOY.md).

---

## Frontend / UI

| Pieza | Enfoque |
|-------|---------|
| Framework UI | A definir en F3 (p.ej. Tailwind + componentes del Design System) |
| Idioma | Español |
| Admin layout | Sidebar izquierdo |
| Mockup | Fase 1 — puede ser estático antes del scaffold completo |

---

## Integraciones externas

| Servicio | Propósito | Dónde se configura |
|----------|-----------|---------------------|
| Resend | Email | Config admin + env |
| Telegram Bot | Citas / avisos | Config admin (token en UI/DB) |
| Cloudflare Turnstile | Anti-bot | Config admin + env site/secret keys |
| Cloudflare Tunnel | Exposición `salon.freonx.org` | `CLOUDFLARE_TUNNEL_TOKEN` + Zero Trust ([DEPLOY.md](./DEPLOY.md)) |
| Pagos | Prepago | TBD en Fase 6 |

Detalle: [CONFIGURATION.md](./CONFIGURATION.md).

---

## Pinning recomendado (cuando exista código)

1. `package-lock.json` / `pnpm-lock.yaml` commitado.  
2. Imágenes Docker con **tag de minor/patch** o **digest**.  
3. Renovate/Dependabot opcional; PRs de seguridad prioritarios.  
4. Documentar cada bump major en CHANGELOG.
