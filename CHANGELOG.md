# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),  
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

Política completa: [docs/VERSIONING.md](./docs/VERSIONING.md).

---

## [Unreleased]

### Planeado

- Fase 8: checador, comisiones, reportes
- Hardening prod (F9): no publicar DB/Redis al host, pin de cloudflared, migrate deploy

---

## [0.10.2] — 2026-07-19

### Added

- **Sucursales:** al cargar `/sucursales`, si el usuario concede geolocalización se selecciona
  la sucursal más cercana (haversine), con badge “Más cercana”, distancia y fly-to en el mapa.
  Si deniega o falla el permiso, se mantiene el comportamiento anterior (primera de la lista).
- Override de tests/demo: `/sucursales?lat=&lng=` elige la más cercana sin pedir permiso
  (útil con `agent-browser` en headless).
- Util `web/src/lib/geo.ts` (`haversineKm`, `nearestIndex`, `formatDistanceKm`).

### Changed

- Copy de la página de sucursales y documentación de pruebas: **`agent-browser`** es la
  herramienta obligatoria de UI para agentes (documentado en `GROK.md` §8).

---

## [0.10.1] — 2026-07-19

### Fixed

- **Menú móvil siempre visible:** el drawer del sitio público quedaba atrapado por el
  `backdrop-filter` / sticky del header (containing block), y el backdrop solo cubría
  ~64px. Ahora el drawer se monta en `document.body` (portal), estado cerrado con
  `visibility: hidden` + `translate3d`, y `overflow-x: clip` en `html`/`body`.
- Admin/empleado: sidebar drawer endurecido (`.is-open` en el nodo, `visibility` al
  cerrar, `inert` solo en viewport ≤900px para no romper el sidebar de desktop).

---

## [0.10.0] — 2026-07-19

### Added

- **TelegramTarget** (catálogo de destinos operativos: grupo/canal + `messageThreadId`, `isDefaultOps`).
- API admin `GET/POST/PATCH/DELETE /api/admin/telegram-targets`.
- Matriz de notificaciones: `telegramMode` (`USER_LINKED` | `TARGETS` | `BOTH`) y `telegramTargetIds[]`.
- UI Config → Telegram: listar/crear/eliminar destinos; chat admin como fallback legacy.
- UI Matriz notificaciones: en audiencia ADMIN, modo de ruta Telegram + multi-select de destinos.
- **Turnstile** real en login/registro: `web/src/lib/turnstile.ts` + siteverify si hay secret en tenant.
- Plantillas de email: nombre del tenant, política de cancelación en confirmación, ID de cita en reembolso.

### Changed

- Credenciales de producto (Resend / Telegram / Turnstile) solo en **TenantSettings** (AES-GCM);
  eliminadas de `.env.example` y docs de deploy/config.
- Worker Telegram soporta `messageThreadId` (topics de supergrupo).
- Defaults de matriz: ADMIN en ausencia/cancelación → Telegram `TARGETS`; CLIENT/EMPLOYEE → `USER_LINKED`.
- `dispatchChannels` resuelve destinos por modo y encola un job por destino (idempotente).
- Docs: `CONFIGURATION.md` (tabla env vs DB), `NOTIFICATIONS.md` (plantillas + enrutado), `AGENTS.md`
  (changelog + commit + push obligatorio).
- Ausencias admin usan la matriz (canales/targets) en lugar de hardcode al chat admin.

### Security

- Login y registro exigen token Turnstile cuando el tenant tiene `turnstileSecretEnc` configurado.

---

## [0.9.0] — 2026-07-18

### Changed

- **Deploy en `NODE_ENV=production` por defecto** (`docker-compose.yml`):
  - Imagen Dockerfile target **`runner`**: `next build` + **`next start`** (sin Turbopack/HMR).
  - Entrypoint `web/scripts/docker-prod-entrypoint.sh` (prisma + seed + start).
  - Sin montar código fuente en el contenedor (rebuild para aplicar cambios).
- Desarrollo local separado: **`docker-compose.dev.yml`** (`next dev`, volúmenes, `NODE_ENV=development`).
- Docs: [DEPLOY.md](./docs/DEPLOY.md), [DEV_DOCKER.md](./docs/DEV_DOCKER.md), `AGENTS.md`.

### Added (lote 0.8.1 integrado)

- Fotos catálogo WebP + MapLibre en sucursales; menús por shell (público / cuenta / admin / empleado).

---

## [0.8.1] — 2026-07-18

### Added

- **Fotos reales de catálogo** en portal público: 22 servicios + hero de inicio.
  - Assets optimizados en `web/public/img/services/*.webp` (1200×900, 4:3) y
    `web/public/img/home/hero.webp` (pipeline **sharp**).
  - Fuentes / guía: `media/salon-images/` (zip del equipo).
  - Script `npm run images:optimize` → `web/scripts/optimize-salon-images.mjs`
    (cover-crop + WebP; ~−68% vs JPG fuente).
- Campo opcional `Service.imageUrl` (Prisma) + seed con rutas `/img/.../*.webp`.
- Componente `ServiceMedia` con **`next/image`** (fill + sizes; sharp en runtime prod).
- `sharp` como dependencia directa (recomendado por Next para Image Optimization).
- Admin: campo opcional «URL de imagen» al crear servicio.
- `KIMI.md` — panorama técnico de referencia.

### Changed

- Home hero usa foto de salón con overlay y floats legibles (`next/image` priority).
- Cards de `/`, `/servicios`, detalle y wizard de agendar muestran miniatura.
- `next.config.ts`: formatos AVIF/WebP para el optimizador de Next.
- **Mobile (≤860px):** hero más bajo (16:10), floats → chips; cards 16:10; CTAs a ancho;
  hamburguesa más visible; safe-area notch.
- **Menú público vs cuenta (Shell A):** el drawer/top bar ya no mezcla todo.
  En el **sitio** solo links del salón + Entrar/Mi cuenta; en **/cuenta** y **/mis-citas**
  menú de cuenta (Mis citas, Cuenta, Volver al sitio, Salir). Puertas Admin/Empleado
  solo dentro del menú de cuenta.
- **Admin / Empleado (Shells B y C):** hamburger con toggle real; footer sticky con
  “Otras áreas” + **Cerrar sesión** siempre visible; topbar sin duplicar Cuenta;
  dashboard KPIs en `kpi-grid` 2×2 en móvil; tablas con scroll horizontal.
- **/sucursales con MapLibre GL:** mapa real (OpenFreeMap liberty), pins sincronizados
  con la lista, sin logo/watermark Mapbox; atribución OSM compacta. Dep `maplibre-gl`.
- Política de versionado reforzada (docs `VERSIONING.md`, `AGENTS.md`, `GROK.md`).

---

## [0.8.0] — 2026-07-18

### Added

- **Contrato de 3 UI shells** (no mezclar navegación):
  - **A Público** — top bar `PublicNav` en `(public)/*` (incluye `/cuenta`, `/mis-citas`).
  - **B Admin** — sidebar `AdminShell` en `/admin/*`.
  - **C Empleado** — sidebar `EmpleadoShell` + layout propio en `/empleado/*`.
- Docs canónicos: [docs/patterns/app-shells.md](./docs/patterns/app-shells.md), [docs/patterns/public-nav.md](./docs/patterns/public-nav.md); actualizados `AGENTS.md`, `ROLES_AND_UI.md`, `DESIGN_SYSTEM.md`, `PHASES.md`.
- Menú **hamburguesa + drawer** en móvil en los tres shells (contenido no empuja el layout).
- Helper [web/src/lib/url.ts](./web/src/lib/url.ts): `appBaseUrl`, `requestPublicOrigin`, `absoluteUrl` (respeta `x-forwarded-*` y `PUBLIC_APP_URL`).
- **Catálogo demo ampliado** (seed): **22 servicios** estilo salones top de Monterrey/NL — cabello, color, barba, uñas, spa (cejas/pestañas/facial), maquillaje; precios MXN realistas. Upsert idempotente.
- Home: contador real de servicios + **6 destacados variados** por categoría.

### Fixed

- Logout / redirects que usaban `req.url` y mandaban al browser a **`http://0.0.0.0:3000`** dentro de Docker.
- Borrado de cookie de sesión con los mismos atributos `path`/`sameSite`/`secure` (logout confiable).
- Separación de menús: cuenta y área pública ya no mezclan árbol de admin/empleado.

### Changed

- `appBaseUrl` de payments reexporta desde `@/lib/url` (un solo origen de verdad).
- Seed de servicios reescrito (ids fijos `seed-svc-*`); personal se re-vincula a todos los servicios activos (María sin categoría barba).

---

## [0.7.3] — 2026-07-16

### Fixed

- **Prisma desync en Docker:** entrypoint `scripts/docker-dev-entrypoint.sh` siempre hace `prisma generate` + assert de modelos antes de arrancar app/worker.
- Seed **idempotente:** ya no resetea contraseñas ni `PlatformSettings` en cada `docker up`.
- Worker espera app **healthy** y no re-siembra ni re-push (evita carreras en `node_modules`).

### Added

- `npm run db:setup` / `db:assert`; docs [docs/DEV_DOCKER.md](./docs/DEV_DOCKER.md).

---

## [0.7.2] — 2026-07-16

### Added

- **Matriz de permisos** editable en Admin (`/admin/permisos`) — roles × capacidades en DB.
- **Matriz de notificaciones** editable (`/admin/matriz-notificaciones`) — evento × audiencia × canales.
- Tablas `RolePermission` y `NotificationMatrixRule`; seed de defaults; `can()` / `requirePermission()`.
- Envios de notificaciones leen la matriz (más preferencias de usuario).
- Docs [docs/RBAC_ADMIN.md](./docs/RBAC_ADMIN.md).

### Changed

- `requireAdmin` usa permiso `admin.access` de la matriz (fallback a rol).

---

## [0.7.1] — 2026-07-16

### Added

- **PWA:** `manifest.webmanifest`, service worker (`/sw.js`), iconos, registro SW.
- **Web Push + VAPID:** claves en env; suscripción por usuario; canal `PUSH` en cola.
- **Campanita** de notificaciones in-app (nav público + topbar admin).
- **Mi cuenta** (`/cuenta`): nombre, email, celular, contraseña; toggles email/push/telegram/in-app.
- **MFA TOTP** opcional (QR + autenticador) y **Passkeys** (WebAuthn) opcionales.
- Login con segundo paso MFA y botón “Entrar con Passkey”.

### Notes

- Correo de bienvenida al registrarse: sí se **encola**; solo se **envía** si Resend está configurado en el tenant.
- VAPID generado para el proyecto en `.env` (no commitear private key).

---

## [0.7.0] — 2026-07-16

### Added

- **Fase 7 — Notificaciones:** BullMQ + Redis, worker real, Resend y Telegram.
- Cola `salon-notifications` (reintentos, backoff, rate limit) y job de recordatorios cada 15 min.
- `NotificationLog` con idempotencia por `eventKey`; canales EMAIL / TELEGRAM / IN_APP.
- Eventos: registro, cita creada/prepagada/cancelada, reasignación, reembolso, ausencia, recordatorios T-24h/T-2h.
- Admin → **Notificaciones** (auditoría de envíos).
- Webhook Telegram `/api/telegram/webhook` para vincular chat (`/start <userId>`).
- Chat ID admin en Configuración → Telegram.
- Docs [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md).

### Changed

- Worker deja de ser stub F3; depende de `bullmq`, `ioredis`, `resend`.

---

## [0.6.0] — 2026-07-16

### Added

- **Fase 6 — Pagos multi-proveedor:** Mercado Pago (Checkout Pro), PayPal (Orders v2), Clip.mx (Checkout v2).
- **Superadmin → Plataforma:** selector de pasarela activa + flags y modo demo.
- **Admin → Configuración → Pagos:** credenciales cifradas por proveedor; política de reembolso en Citas/prepago.
- Modelo `Payment`, `PlatformSettings`, `AbsenceRequest`; reasignación con 3 opciones del cliente.
- Webhooks `/api/payments/webhooks/{mercadopago,paypal,clip}`; captura PayPal al return.
- Flujo prepago real en wizard (redirect checkout o demo si `NONE` / sin keys).
- Documentación [docs/PAYMENTS.md](./docs/PAYMENTS.md).

### Changed

- Cancelación de cita prepagada intenta reembolso según política del tenant.
- Empleado: solicitud de ausencia con candado si hay citas prepagadas.

---

## [0.5.0] — 2026-07-16

### Added

- **App Next.js 15** en `web/` (App Router, TypeScript, Prisma, PostgreSQL 18).
- **Docker Compose:** `app`, `worker` (stub), `postgres`, `redis`, `minio`, `tunnel` (perfil).
- **F3:** Design System CSS, layouts público/admin, healthcheck, seed demo, theme CSS variables.
- **F4:** Auth (login/registro), roles, sesión cookie JWT; Configuración (General, Apariencia colores, Resend, Telegram, Turnstile, Usuarios, Citas/prepago); secretos cifrados AES-GCM.
- **F5:** Catálogo servicios, sucursales, personal, wizard de citas con slots reales, mis citas, cancelación, prepago stub.
- Token Cloudflare en `.env` / `docs/credentials.md` para `salon.freonx.org`.

### Notes

- Puerto local por defecto en este entorno: **3010** (3000 ocupado por otro stack).
- Usuarios seed: `admin@salon.local` / `demo1234` (y empleado, cliente, super).

---

## [0.3.0] — 2026-07-15

### Added

- **Design System** completo desde mockup: tokens de color, tipografía, radius, sombras, layouts ([docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)).
- **Pattern library** base: wizard de cita, sidebar admin, brand-theme, service-card, staff-picker, time-slots, appointment-status, reassignment, secret-fields, minimal-signup, empty-states ([docs/patterns/](./docs/patterns/)).
- **Apariencia por tenant:** Configuración → colores primary/accent documentados (picker en F4).
- **Deploy Cloudflare Tunnel** documentado: `salon.freonx.org`, perfil Compose `tunnel` ([docs/DEPLOY.md](./docs/DEPLOY.md)).
- Plantilla `docs/credentials.example.md`; `docs/credentials.md` gitignored para secretos locales.

### Changed

- Fases 0–2 marcadas hechas; **siguiente = Fase 3** ([docs/PHASES.md](./docs/PHASES.md)).
- Mockup **congelado** como referencia; cliente aprobado; admin base iterativa en app.
- `.gitignore` excluye `docs/credentials.md`.

### Decisions (owner)

- Cliente mockup: OK  
- Admin: empezar con el actual y retocar en marcha  
- Colores configurables en settings: sí (primary + accent)

---

## [0.2.1] — 2026-07-15

### Fixed

- **Admin sidebar inconsistente:** muchas pantallas admin tenían un menú truncado (faltaban secciones). Ahora todas comparten el mismo sidebar completo (Operación / Personas / Análisis / Sistema).
- **Configuración sin submenú navegable:** el diseño en [docs/ROLES_AND_UI.md](./docs/ROLES_AND_UI.md) pedía General · Correo · Telegram · Turnstile · Usuarios · Citas/prepago bajo Configuración; solo había tabs sueltas y un sidebar mínimo en `config.html`. Se restauró el árbol en el sidebar con deep-links (`config.html#correo`, etc.) sincronizados con las pestañas.

### Changed

- Estilos de subnav en sidebar (`sidebar-group`, `sidebar-subnav`) en `mockup/assets/css/main.css`
- JS de tabs con soporte de hash y resaltado del subítem activo en `mockup/assets/js/main.js`

### Feedback owner (2026-07-15)

- Flujo **público**: aprobado en look & feel / navegación
- Flujo **admin**: pendiente de refinamiento (sidebar Configuración corregido en este release)

---

## [0.2.0] — 2026-07-15

### Added

- Mockup estático navegable en [`mockup/`](./mockup/)
- Índice de pantallas: [`mockup/index.html`](./mockup/index.html)
- Flujo público: home, servicios, sucursales/mapa, wizard de cita, confirmación, contacto, login/registro, mis citas, reasignación (3 opciones)
- Admin con sidebar: dashboard, citas, detalle/reasignación, servicios, catálogo, sucursales, personal, clientes, asistencia, comisiones, reportes, configuración (Resend, Telegram, Turnstile, usuarios, prepago)
- Vista empleado: agenda hoy/mañana, checador, comisiones, permiso con candado prepago
- Super Admin: listado de tenants
- Design tokens CSS unisex (verde bosque + terracota + crema) en `mockup/assets/css/main.css`

### Notes

- Sin backend; datos 100% mock. Abrir `mockup/index.html` en el navegador.
- Release de entrega del mockup; corrección de navegación admin en `0.2.1`.

---

## [0.1.0] — 2026-07-15

### Added

- Documentación base del producto y alcance multi-tenant
- [GROK.md](./GROK.md) como índice de contexto para agentes
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/PHASES.md](./docs/PHASES.md), [docs/STACK.md](./docs/STACK.md)
- [docs/SECURITY.md](./docs/SECURITY.md) (CVEs, secretos, versiones estables)
- [docs/PRODUCT.md](./docs/PRODUCT.md), [docs/MOCKUP.md](./docs/MOCKUP.md), [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)
- [docs/PERMISSIONS_MATRIX.md](./docs/PERMISSIONS_MATRIX.md) y [docs/NOTIFICATIONS_MATRIX.md](./docs/NOTIFICATIONS_MATRIX.md)
- [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) (Resend, Telegram, Turnstile)
- [docs/ROLES_AND_UI.md](./docs/ROLES_AND_UI.md), [docs/VERSIONING.md](./docs/VERSIONING.md)
- [docs/patterns/README.md](./docs/patterns/README.md), [docs/COMMISSIONS_RESEARCH.md](./docs/COMMISSIONS_RESEARCH.md)
- Archivo [VERSION](./VERSION) en `0.1.0`

### Notes

- Sin código de aplicación aún; release de **documentación y alineación**.
