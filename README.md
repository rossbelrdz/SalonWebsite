# Salon — Plataforma para salones de belleza y barberías

Sistema multi-negocio / multi-sucursal para agenda de citas, catálogo de servicios, prepago, personal, comisiones, checador y reportes.

**Idioma del producto:** Español  
**Versión actual:** ver [`VERSION`](./VERSION)  
**Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

---

## Documentación (leer por necesidad)

| Documento | Contenido |
|-----------|-----------|
| [GROK.md](./GROK.md) | **Entrada para agentes** — entendimiento + mapa de docs |
| [docs/PHASES.md](./docs/PHASES.md) | Fases del proyecto |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitectura |
| [docs/STACK.md](./docs/STACK.md) | Stack y versiones |
| [docs/SECURITY.md](./docs/SECURITY.md) | Seguridad y CVEs |
| [docs/PRODUCT.md](./docs/PRODUCT.md) | Producto y flujos |
| [docs/MOCKUP.md](./docs/MOCKUP.md) | Mockup estático (primer entregable UI) |
| [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) | Design system |
| [docs/patterns/README.md](./docs/patterns/README.md) | Pattern library |
| [docs/PERMISSIONS_MATRIX.md](./docs/PERMISSIONS_MATRIX.md) | Matriz de permisos |
| [docs/NOTIFICATIONS_MATRIX.md](./docs/NOTIFICATIONS_MATRIX.md) | Matriz de notificaciones |
| [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) | Config (Apariencia, Resend, Telegram, Turnstile) |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Docker + Cloudflare Tunnel (`salon.freonx.org`) |
| [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) | Tokens, layouts, theme por tenant |
| [docs/patterns/README.md](./docs/patterns/README.md) | Pattern library |
| [docs/VERSIONING.md](./docs/VERSIONING.md) | Control de versiones / releases |

---

## Visión rápida

- Cliente elige **sucursal → servicio → profesional → fecha/hora**.
- Prepago opcional con descuento.
- Admin con **sidebar izquierdo**: servicios, citas, personal, reportes, configuración.
- Super Admin de plataforma + Admin de negocio + Empleado + Cliente.
- Docker en local (Docker Desktop) y en deploy; Cloudflare Tunnel → `https://salon.freonx.org`.
- Colas con **BullMQ + Redis 8**; correo vía **Resend**; anti-bot **Cloudflare Turnstile**.

---

## Estado del repositorio

| Área | Estado |
|------|--------|
| Documentación base | ✅ |
| Mockup estático | ✅ Congelado — [mockup/index.html](./mockup/index.html) |
| Design System + patterns | ✅ [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) |
| App Next.js (F3–F7) | ✅ `web/` — citas, auth, admin, pagos, notifs |
| Pagos | ✅ MP / PayPal / Clip — [docs/PAYMENTS.md](./docs/PAYMENTS.md) |
| Notificaciones | ✅ BullMQ + Resend + Telegram — [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) |
| Docker + Tunnel | ✅ Compose; tunnel perfil `tunnel` |

### Correr la app (Docker)

```bash
cp .env.example .env   # o usa el .env ya configurado
docker compose up -d --build

# App local (puerto configurable APP_PORT; por defecto 3010 en este entorno)
open http://localhost:3010

# Demo pública con Cloudflare Tunnel
docker compose --profile tunnel up -d
# → https://salon.freonx.org  (Zero Trust: hostname → http://app:3000)
```

**Usuarios demo:** `admin@salon.local` / `demo1234` · `cliente@salon.local` / `demo1234` · `empleado@salon.local` / `demo1234`

### Mockup (referencia)

```text
mockup/index.html
```

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución  
- Git  

> Stack 100% en contenedores. Detalle de fases: [docs/PHASES.md](./docs/PHASES.md).

---

## Cómo contribuir / avanzar

1. Revisar fase activa en [docs/PHASES.md](./docs/PHASES.md).  
2. Seguir [docs/VERSIONING.md](./docs/VERSIONING.md) en cada release.  
3. Actualizar [CHANGELOG.md](./CHANGELOG.md) y `VERSION`.  
4. Cumplir [docs/SECURITY.md](./docs/SECURITY.md) al añadir dependencias.

---

## Licencia

Por definir.
