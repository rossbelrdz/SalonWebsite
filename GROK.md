# GROK.md — Contexto del proyecto (Salon)

> **Propósito:** archivo de entrada para agentes/humanos. Contiene el entendimiento consolidado y **enlaces** a documentación detallada.  
> **Regla:** no duplicar aquí todo el detalle. Leer solo los archivos referenciados que apliquen a la tarea.

**Versión del producto:** ver [VERSION](./VERSION)  
**Changelog:** [CHANGELOG.md](./CHANGELOG.md)  
**Idioma de producto y docs:** Español

---

## 1. Qué es

Plataforma **SaaS multi-negocio y multi-sucursal** para **salones de belleza y barberías**.

- **Cliente:** descubre sucursales, servicios, agenda citas eligiendo **profesional**, día y hora; prepago opcional.
- **Empleado:** agenda del día, checador, preparación de trabajo, comisiones propias.
- **Admin (negocio):** catálogo, personal, citas, reasignaciones, reportes, configuración del negocio.
- **Super Admin (plataforma):** tenants, configuración global, tokens de plataforma.

Diseño: **moderno, fresco, juvenil, unisex** (atractivo para hombres y mujeres).

---

## 2. Decisiones de negocio confirmadas

| Tema | Decisión |
|------|----------|
| Multi-tenant | Sí: varios negocios, cada uno con N sucursales |
| Reembolsos | Sí, cuando aplica (detalle de % y plazos: pendiente de negocio) |
| Idioma UI | Español |
| Auth de identidad | Por definir en implementación (Turnstile **no** es login) |
| Anti-bot | Cloudflare Turnstile |
| Emails | Resend.com (+ cola BullMQ) |
| Canal opcional citas | Bot de Telegram (token en config UI/DB) |
| Registro cliente | Mínimo: **nombre + (correo O celular)** |
| Datos extra cliente | Solo al pagar (no agobiar en registro/cita) |
| Primer entregable | **Mockup estático** con diseño → luego Design System + implementación |

---

## 3. Flujo cliente (núcleo)

1. Ver / elegir **sucursal** (mapa).
2. Elegir **servicio** (corte, barba, uñas, tinte, maquillaje, spa, etc.).
3. Elegir **día y hora**.
4. Elegir **quién** lo atiende (no “quien toque”).
5. Disponibilidad real por empleado + sucursal.
6. Prepago opcional → **descuento** vs pago en local (reduce no-shows).
7. Cancelar / reagendar según reglas y prepago.

### Reasignación (empleado no puede asistir)

Dueño reasigna a otro profesional → notificación al cliente con **3 opciones**:

1. Aceptar nuevo profesional  
2. Reagendar otro día  
3. Cancelar → **reembolso** del prepago (si aplica)

**Candado:** permisos/ausencias del personal se validan contra citas (sobre todo prepagadas).

Detalle: [docs/PRODUCT.md](./docs/PRODUCT.md)

---

## 4. Stack (visión)

| Pieza | Uso |
|-------|-----|
| Next.js | App web |
| Docker / Docker Desktop | Todo corre en contenedores (dev local y deploy) |
| Cloudflare Tunnel | Exposición `https://salon.freonx.org` (token en `docs/credentials.md` / `.env`; [docs/DEPLOY.md](./docs/DEPLOY.md)) |
| Cloudflare Turnstile | Protección anti-bot en formularios sensibles |
| PostgreSQL **18.x estable** (pin minor actual, p.ej. 18.4+) | Base de datos |
| Redis **8** | Backend de BullMQ |
| BullMQ | Colas (emails, notificaciones) |
| MinIO | Archivos / imágenes / videos |
| Resend | Envío de correo |
| Telegram Bot API | Citas / notificaciones opcionales |

Detalle de versiones y política: [docs/STACK.md](./docs/STACK.md)  
Seguridad y CVEs: [docs/SECURITY.md](./docs/SECURITY.md)  
Arquitectura: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 5. Roles, shells UI y matrices

| Rol | Ámbito | Shell UI |
|-----|--------|----------|
| `super_admin` | Plataforma (todos los tenants) | **B** Admin (sidebar) |
| `admin` | Un negocio / tenant | **B** Admin (sidebar) |
| `employee` | Sucursal(es) del negocio | **C** Empleado (sidebar reducido) |
| `client` | Usuario final | **A** Público (top nav) |

**Tres shells — no mezclar menús** (error ya cometido y documentado como prohibido):

| Shell | Chrome | Rutas | Mockup |
|-------|--------|-------|--------|
| A Público | Top nav | `(public)/*` | `mockup/publico/` |
| B Admin | Sidebar | `/admin/*` | `mockup/admin/` |
| C Empleado | Sidebar | `/empleado/*` | `mockup/empleado/` |

- **Contrato obligatorio:** [docs/patterns/app-shells.md](./docs/patterns/app-shells.md)  
- Roles y menús: [docs/ROLES_AND_UI.md](./docs/ROLES_AND_UI.md)  
- Matriz de permisos: [docs/PERMISSIONS_MATRIX.md](./docs/PERMISSIONS_MATRIX.md)  
- Matriz de notificaciones: [docs/NOTIFICATIONS_MATRIX.md](./docs/NOTIFICATIONS_MATRIX.md)

---

## 6. Configuración (admin)

En **Configuración** (sidebar admin):

- **Apariencia** — colores primary/accent del tenant
- Tokens / API keys de **Resend**
- Token del **bot de Telegram**
- Keys de **Cloudflare Turnstile**
- Parámetros de negocio (prepago, descuentos, etc. — según fase)
- Alta/baja de usuarios (empresa y clientes)
- Tokens sensibles: UI + persistencia en DB cifrada o secret store (ver seguridad)

Detalle: [docs/CONFIGURATION.md](./docs/CONFIGURATION.md)

---

## 7. Documentación por archivo (mapa)

| Archivo | Cuándo leerlo |
|---------|----------------|
| [README.md](./README.md) | Arranque del repo, cómo correr, estructura |
| [CHANGELOG.md](./CHANGELOG.md) | Qué cambió por release |
| [VERSION](./VERSION) | Versión actual SemVer |
| [docs/VERSIONING.md](./docs/VERSIONING.md) | Política de versionado |
| [docs/PHASES.md](./docs/PHASES.md) | Fases de avance del proyecto |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitectura técnica |
| [docs/STACK.md](./docs/STACK.md) | Versiones pinneadas y dependencias |
| [docs/SECURITY.md](./docs/SECURITY.md) | Seguridad, CVEs, secrets |
| [docs/PRODUCT.md](./docs/PRODUCT.md) | Producto, flujos, prepago, catálogo |
| [docs/patterns/app-shells.md](./docs/patterns/app-shells.md) | **UI shells (3 áreas)** — leer antes de menús/layouts |
| [docs/ROLES_AND_UI.md](./docs/ROLES_AND_UI.md) | Roles, menús por shell, pantallas |
| [docs/PERMISSIONS_MATRIX.md](./docs/PERMISSIONS_MATRIX.md) | Quién puede qué |
| [docs/NOTIFICATIONS_MATRIX.md](./docs/NOTIFICATIONS_MATRIX.md) | Quién recibe qué aviso |
| [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) | Config: Apariencia, Resend, Telegram, Turnstile |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Docker + Cloudflare Tunnel (`salon.freonx.org`, token) |
| [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) | Design system (tokens + layouts shells + theme) |
| [docs/MOCKUP.md](./docs/MOCKUP.md) | Mockup estático (congelado, referencia de shells) |
| [docs/patterns/README.md](./docs/patterns/README.md) | Pattern library (shells, nav, wizard, …) |
| [docs/credentials.example.md](./docs/credentials.example.md) | Plantilla secretos (real: `credentials.md` gitignored) |
| [docs/COMMISSIONS_RESEARCH.md](./docs/COMMISSIONS_RESEARCH.md) | Investigación comisiones (pendiente contenido profundo) |

---

## 8. Entorno de trabajo

- **Desarrollo:** local, **todo en Docker** (Docker Desktop instalado).
- **Deploy / prueba pública:** `https://salon.freonx.org` vía Cloudflare Tunnel; token en `docs/credentials.md` → `.env` ([docs/DEPLOY.md](./docs/DEPLOY.md)).
- **Fases hechas:** F0–F7. **Siguiente producto:** F8 (checador, comisiones, reportes). Ver [docs/PHASES.md](./docs/PHASES.md).
- **Pagos:** [docs/PAYMENTS.md](./docs/PAYMENTS.md) — MP / PayPal / Clip; superadmin elige proveedor.
- **Notificaciones:** [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) — BullMQ + Resend + Telegram.
- **Código app:** `web/` (Next.js). Compose en raíz.
- **Mockup:** no ampliar; solo referencia. Admin se retoca en la app.
- **Correr:** `docker compose up -d` → http://localhost:3010 (o `APP_PORT`).

---

## 9. Principios para agentes

1. Leer **solo** este archivo + los docs del área de la tarea.  
1b. Si la tarea toca **menú, layout, nav o pantallas nuevas:** leer [docs/patterns/app-shells.md](./docs/patterns/app-shells.md) y **no** unificar shells.  

2. No saturar contexto copiando matrices o arquitectura enteras si no hacen falta.  
3. Cambios de alcance → actualizar el doc correspondiente **y** una línea en CHANGELOG si es release.  
4. Seguridad primero: dependencias auditadas, secrets fuera del repo, Postgres/Redis pinneados.  
5. UI y copy en **español**.  
6. Registro/cita del cliente: **mínima fricción**.  
7. Versionar cada release (SemVer). Ver [docs/VERSIONING.md](./docs/VERSIONING.md).

---

## 10. Estado actual

- **Versión:** `0.7.3`  
- **Fases hechas:** F0–F7 (+ matrices admin, PWA/push/MFA, fix Prisma Docker).  
- **Siguiente:** elegir bloque del roadmap de auditoría o F8.  
- **Live:** https://salon.freonx.org · local http://localhost:3010  
- **Auditoría:** [docs/AUDIT_2026-07-16.md](./docs/AUDIT_2026-07-16.md) · Docker: [docs/DEV_DOCKER.md](./docs/DEV_DOCKER.md)

*Última actualización: 2026-07-16 — v0.7.3*
