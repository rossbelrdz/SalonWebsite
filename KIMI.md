# KIMI.md — Panorama de referencia del proyecto Salon

> Referencia de trabajo de Kimi (agente). Complementa a `AGENTS.md` (reglas) y `GROK.md`
> (contexto de entrada): aquí va el **mapa completo y verificado contra código** de qué hay,
> dónde vive y cómo se conecta. Actualizar cuando cambie la estructura.
> Última revisión: 2026-07-19 — v0.8.0, rama `main`, commit `9cc894a` (árbol limpio).

## 1. Panorama en 30 segundos

SaaS **multi-tenant y multi-sucursal** para salones de belleza/barberías. Hoy corre con un
solo tenant "demo" (`TENANT_SLUG`, bootstrap en `web/src/lib/auth.ts:getDefaultTenant`).
Roles: **Super Admin** (plataforma), **Admin** (negocio), **Empleado**, **Cliente**.

Flujo núcleo: cliente elige sucursal → servicio → profesional → horario (wizard `/agendar`),
con **prepago opcional con descuento** (Mercado Pago / PayPal / Clip / demo), cancelación y
reagendado, y **reasignación** de citas con decisión del cliente (aceptar / reagendar /
cancelar con reembolso). Notificaciones asíncronas (email Resend, Telegram, Web Push, in-app)
vía BullMQ + worker aparte.

Estado: **F0–F7 hechas** (docs, mockup, DS, fundaciones, auth, catálogo/citas, pagos,
notificaciones + cuenta/PWA/MFA/RBAC). **Siguiente: F8** (checador, comisiones, reportes).
**F9 parcial** (tunnel listo; hardening pendiente). Live demo: `https://salon.freonx.org`
(Cloudflare Tunnel); local: `http://localhost:3010` (el 3000 del host lo ocupa otro stack).

## 2. Cómo arranca y se opera

- `docker compose up` → postgres:18 + redis:8 + minio + app (Next dev en :3000 interno,
  publicado como `APP_PORT`, default 3000; aquí se usa 3010) + worker (BullMQ, sin puertos).
- `docker compose --profile tunnel up -d` → añade cloudflared → `salon.freonx.org`.
- El entrypoint `web/scripts/docker-dev-entrypoint.sh` corre en app y worker:
  `npm ci` (condicional o `FORCE_NPM_CI=1`) → `prisma generate` (siempre) →
  `prisma db push` (worker: `SKIP_DB_PUSH=1`) → assert de modelos → seed (worker:
  `SKIP_SEED=1`) → `exec` del comando. **No hay migraciones versionadas** (deuda).
- Scripts npm (`web/package.json`): `dev` (turbopack), `build` (prisma generate + next build),
  `db:generate`, `db:push`, `db:seed`, `db:setup`, `db:reset` (**destructivo**),
  `db:assert`, `worker`, `lint`.
- Usuarios seed (pass `demo1234`): `super@`, `admin@`, `empleado@`, `maria@`,
  `cliente@salon.local`. No reescribe passwords salvo `SEED_RESET_PASSWORDS=1`.

## 3. Dónde va cada cosa (guía de colocación)

| Quiero agregar/cambiar… | Va en… |
|---|---|
| Pantalla de marketing/reserva/cuenta | `web/src/app/(public)/<ruta>/page.tsx` → Shell A (top nav) |
| Pantalla de operación del negocio (admin) | `web/src/app/admin/<ruta>/page.tsx` → Shell B (sidebar `AdminShell`) |
| Pantalla del día a día del staff | `web/src/app/empleado/<ruta>/page.tsx` → Shell C (sidebar `EmpleadoShell`) |
| Ítem de menú | **Solo** en el componente de su shell (`PublicNavClient` / `AdminShell` / `EmpleadoShell`); prohibido mezclar árboles (§9) |
| Endpoint HTTP | `web/src/app/api/<dominio>/route.ts` (validación manual, guards por excepción `UNAUTHORIZED`/`FORBIDDEN` → 401/403) |
| Lógica compartida | `web/src/lib/<tema>.ts` (sin capa repositorio; Prisma directo) |
| Modelo/campo DB | `web/prisma/schema.prisma` → `db push` automático al arrancar; dinero en centavos, secretos con sufijo `Enc` (AES-256-GCM) |
| Permiso nuevo | Catálogo en `web/src/lib/rbac/catalog.ts` (`PERMISSION_CATALOG` + `DEFAULT_PERMISSIONS`) → editable en `/admin/permisos` |
| Evento de notificación nuevo | `web/src/lib/notifications/types.ts` (union `EventType`) + función `notify*` en `events.ts` + plantilla en `templates.ts` + defaults en `rbac/catalog.ts` (`NOTIF_EVENT_CATALOG`, `DEFAULT_NOTIFICATION_MATRIX`) |
| Proveedor de pago nuevo | Adaptador en `web/src/lib/payments/<n>.ts` (interfaz `PaymentAdapter`) + enum `PaymentProvider` + credenciales `*Enc` en `TenantSettings` + webhook en `api/payments/webhooks/` |
| Job de fondo / cola | `web/worker/index.ts` (worker BullMQ) + `web/worker/process.ts` (procesamiento) |
| Tokens/estilos UI | `web/src/app/design-system.css` (contrato de clases del mockup); tema por tenant vía `web/src/lib/theme.ts` inyectado en `app/layout.tsx` |
| Doc de tema | `docs/<TEMA>.md` + línea en el índice §10 de `AGENTS.md` |
| Cualquier cambio de producto/fix | **Obligatorio:** entrada en `CHANGELOG.md` `[Unreleased]`; al cerrar lote: `VERSION` + `web/package.json` (ver `docs/VERSIONING.md`) |

## 4. Mapa de directorios anotado

```
Salon/
├── AGENTS.md / GROK.md / KIMI.md   # contexto para agentes (reglas / entrada / panorama)
├── VERSION + CHANGELOG.md          # SemVer + Keep a Changelog (obligatorios por entrega)
├── docker-compose.yml              # postgres, redis, minio, app, worker, tunnel (perfil)
├── .env / .env.example             # infra + APP_ENCRYPTION_KEY, SESSION_SECRET, VAPID, tunnel
├── docs/                           # ~23 docs temáticos + patterns/ (14) — índice en AGENTS.md §10
├── mockup/                         # HTML estático CONGELADO (referencia visual; no tocar)
│   ├── publico/ (11) admin/ (13) empleado/ (5) super/ (1)
│   └── assets/css/main.css         # fuente de verdad visual (tokens + clases contrato)
└── web/                            # app Next.js 15.5.9 + React 19 + TS estricto
    ├── Dockerfile                  # targets dev / builder / runner (runner SIN USO aún)
    ├── scripts/docker-dev-entrypoint.sh + assert-prisma-client.mjs
    ├── prisma/schema.prisma        # 19 modelos + 9 enums
    ├── prisma/seed.ts              # idempotente (upserts); catálogo 22 servicios seed-svc-*
    ├── worker/index.ts + process.ts# BullMQ: salon-notifications + salon-system (c/15min)
    ├── next.config.ts              # VACÍO (sin security headers — deuda)
    ├── public/                     # sw.js (PWA), manifest, iconos
    └── src/
        ├── app/layout.tsx          # <html lang=es> + tema tenant en <style> + PwaRegister
        ├── app/design-system.css   # tokens + clases contrato (1676 líneas); globals.css extra
        ├── app/(public)/           # Shell A: home, servicios, sucursales, contacto, login,
        │                           #   agendar, confirmacion, mis-citas, cuenta, pago/resultado,
        │                           #   reasignacion
        ├── app/admin/              # Shell B: dashboard, citas, servicios, sucursales, personal,
        │                           #   clientes, notificaciones, permisos, matriz-notificaciones,
        │                           #   config (8 tabs), plataforma (superadmin)
        ├── app/empleado/           # Shell C: agenda hoy/mañana + #permiso (ausencias)
        ├── app/api/                # 29 route handlers (§8)
        ├── components/             # PublicNav(+Client), AdminShell, EmpleadoShell,
        │                           #   NotificationBell, MobileMenuToggle, PwaRegister, ui.tsx
        │                           #   (AdminSidebar/EmpleadoNav = re-exports deprecated)
        ├── lib/                    # auth, session, db, crypto, format, theme, slots, url,
        │                           #   mfa, webauthn, push + payments/ + notifications/ + rbac/
        └── generated/prisma/       # cliente Prisma generado
```

## 5. Modelo de datos (`web/prisma/schema.prisma`)

19 modelos (17 negocio + 2 pivotes) y 9 enums (`Role`, `AppointmentStatus`,
`ServiceCategory`, `PaymentProvider`, `PaymentStatus`, `ReassignmentChoice`,
`AbsenceStatus`, `NotificationChannel`, `NotificationStatus`).

- **PlatformSettings** — singleton `id:"default"`: pasarela activa global, enables por
  proveedor, `allowDemoPayments` (default **true** ⚠️).
- **Tenant** 1:1 **TenantSettings** — tema (2 hex), timezone, moneda; prepago
  (`prepaidDiscountPct` 10, `minLeadMinutes` 60, `maxLeadDays` 60); reembolso
  (`refundFullHours` 24, `refundPartialPct` 50, `refundNoneHours` 2); recordatorios
  (24h/2h); credenciales `*Enc` (MP, PayPal, Clip, Resend, Telegram, Turnstile).
- **User** (email **o** phone únicos; `isSuperAdmin`; MFA `mfaSecretEnc`; prefs notify*) →
  **Membership** (rol por tenant), **EmployeeProfile**, **PushSubscription**,
  **PasskeyCredential**, citas como cliente.
- **RolePermission** (matriz RBAC por tenant: `roleCode`×`permissionKey`×`allowed`) y
  **NotificationMatrixRule** (`eventType`×`audience` → flags email/telegram/inApp/push).
- **Branch** (horario `openTime/closeTime`) y **Service** (`durationMin`, `priceCents`,
  `category`, `mediaClass`) por tenant.
- **EmployeeProfile** M:N Branch (`EmployeeBranch`), M:N Service (`EmployeeService`),
  1:N **WorkSchedule** (1 fila por `dayOfWeek`).
- **Appointment** — núcleo: `startsAt/endsAt`, `status`
  (CONFIRMED/PREPAID/PENDING/CANCELLED/COMPLETED/REASSIGNMENT_PENDING), `prepaid`,
  `priceCents`, cliente desnormalizado (`clientName/Email/Phone`) + `clientUserId?`,
  reasignación (`proposedEmployeeId`, `reassignmentChoice`).
- **Payment** — `provider`, `status` (PENDING/APPROVED/REJECTED/REFUNDED/PARTIAL_REFUND/
  CANCELLED), `amountCents`, `refundAmountCents?`, `externalId` (preferencia/orden),
  `externalPaymentId` (cobro capturado), `checkoutUrl`, `rawMeta`.
- **NotificationLog** — `eventKey @unique` (`eventType:entityId:channel:tag`) =
  idempotencia + campanita in-app + auditoría. `status` QUEUED/SENT/FAILED/SKIPPED.
- **AbsenceRequest** — `dateFrom/dateTo`, status PENDING/APPROVED/REJECTED/BLOCKED,
  `blockedByPrepaid`, `prepaidCount` (candado anti-prepagos).

**Seed** (`web/prisma/seed.ts`): tenant `demo` + settings; 5 usuarios bcrypt; 2 sucursales
(`seed-branch-centro/polanco`); **22 servicios** `seed-svc-*` (7 HAIR, 4 COLOR, 2 BEARD,
3 NAILS, 4 SPA, 2 MAKEUP; $220–$2,200 MXN); 2 perfiles empleado (Luis/María) en ambas
sucursales, L–S 09:00–18:00, vinculados a todos los servicios (María sin BEARD);
PlatformSettings (sin pisar config); matrices vía `ensureTenantMatrices` (38 permisos × 4
roles + 12 eventos × 4 audiencias). Todo upsert → idempotente.

## 6. Cómo está construido el código (`web/src/lib/`)

Convenciones: server components con Prisma directo + `force-dynamic`; interactividad en
`*Client.tsx`; errores por excepción con sentinelas (`UNAUTHORIZED`/`FORBIDDEN`);
singletons perezosos (Prisma por `globalThis`, cola, Redis); **imports dinámicos para
romper ciclos** (auth↔rbac, payments↔notifications); fetch directo a APIs REST (sin SDKs
de pago); idempotencia como patrón (eventKey, jobId, upserts); zod instalado **sin uso**
(validación manual).

| Archivo | Qué exporta / cómo funciona |
|---|---|
| `db.ts` | Singleton Prisma anti-hot-reload. Lo importa casi todo. |
| `session.ts` | JWT HS256 (`jose`) en cookie httpOnly `salon_session`, 14 días, **stateless** (sin lookup DB). `SessionPayload{userId,name,email?,phone?,isSuperAdmin,tenantId?,role?}`. `secure` solo si `PUBLIC_APP_URL` es https. ⚠️ fallback de `SESSION_SECRET` hardcodeado (:19). |
| `auth.ts` | `hashPassword/verifyPassword` (bcrypt 10); `requireSession` → `UNAUTHORIZED`; `requireRole` / `requireAdmin` (matriz `admin.access` con fallback a rol) → `FORBIDDEN`; superadmin bypass; `getDefaultTenant()` (por `TENANT_SLUG`, incluye settings); `hasAdminAccess/hasStaffAccess` para navs. |
| `crypto.ts` | AES-256-GCM envelope `"iv:tag:data"` b64; `encryptSecret/decryptSecret/maskSecret`; clave = SHA-256 de `APP_ENCRYPTION_KEY` (⚠️ fallback hardcodeado :4). |
| `url.ts` | `appBaseUrl` (`PUBLIC_APP_URL`→…→`localhost:3010`), `requestPublicOrigin` (x-forwarded-* → Host → base), `absoluteUrl`. **Nunca** `new URL(path, req.url)` para redirects (bug 0.0.0.0 en Docker). |
| `theme.ts` | `deriveTheme(primary,accent)` (hover/soft calculados), `themeStyleTag()` → `:root{--primary…}`; `isValidHex` anti-XSS. Inyectado por `app/layout.tsx`. |
| `slots.ts` | `getAvailableSlots({employeeId,branchId,serviceId,date})`: ventana = max(apertura sucursal, inicio turno)…min(cierre, fin turno); pasos fijos **30 min**; descarta pasados y traslapes con citas no canceladas. ⚠️ Ignora ausencias y `minLeadMinutes`; usa hora del servidor. |
| `format.ts` | `formatPrice` (es-MX), fechas, labels de estado/categoría, `statusBadgeClass`, `parseTimeToMinutes`. |
| `mfa.ts` | TOTP con otplib: generar secret, verificar token, URL otpauth (issuer "Salon"). Secret cifrado en DB. |
| `webauthn.ts` | Passkeys (`@simplewebauthn/server`): rpID = hostname de `appBaseUrl()`; registro/autenticación, counter + `lastUsedAt`. ⚠️ challenge de autenticación confiado al cliente (replay). |
| `push.ts` | Web Push VAPID: `sendWebPush({userId,title,body,url})` respeta `notifyPush`, borra suscripciones muertas (404/410). |
| `payments/types.ts` | Contrato `PaymentAdapter{createCheckout,refund}`, `CheckoutInput/Result`, `RefundInput/Result`, credenciales por proveedor, `centsToDecimal`. |
| `payments/index.ts` | Orquestador: `getPlatformSettings`, `getActiveProvider` (global, lo fija el superadmin); `credentialsFromSettings` (descifra); `startPrepaidCheckout` (crea Payment PENDING → checkout real, demo si NONE/sin keys y `allowDemoPayments`, o cancela+error); `markPaymentApproved` (idempotente → cita PREPAID + notify vía import dinámico); `computeRefundCents` (política por horas: full/partial/none); `refundAppointmentPayment`. |
| `payments/mercadopago.ts` | Fetch a api.mercadopago.com: preferencias (external_reference = paymentId), refund con `X-Idempotency-Key`, `fetchMpPayment` (fetch-back del webhook). |
| `payments/paypal.ts` | OAuth client_credentials (sandbox/live), Orders v2 create/capture/refund. |
| `payments/clip.ts` | Basic auth key:secret, POST `/v2/checkout` (payment_request_url), refunds. |
| `notifications/types.ts` | `QUEUE_NAME="salon-notifications"`, union `EventType` (12 eventos), `NotificationJobData` (incluye `logId`). |
| `notifications/queue.ts` | `enqueueNotification`: corazón de idempotencia — log por `eventKey` (SENT/QUEUED → skip; FAILED → re-encola); IN_APP = SENT inmediato; `jobId`=eventKey saneado; prioridad high/normal/low; **nunca rompe el request** si Redis cae (log FAILED). |
| `notifications/events.ts` | 8 funciones `notify*` (account.created, appointment.created/prepaid/cancelled, reassignment + resolved, reminder 24h/2h, absence.requested). Cada una: matriz tenant (`getMatrixChannels`) ∩ prefs usuario (`applyUserPrefs`) → encola por canal si hay destinatario (email / telegramChatId / telegramAdminChatId / userId para in-app+push). |
| `notifications/templates.ts` | 9 plantillas ES `{subject,text,html}` con links a `appBaseUrl()`; `escapeHtml` propio. |
| `notifications/resend.ts` / `telegram.ts` / `connection.ts` | Envío Resend; Bot API sendMessage (4000 chars) + setWebhook; singleton IORedis (`maxRetriesPerRequest:null`). |
| `rbac/catalog.ts` | **38 permisos** en 8 grupos (plataforma, config, usuarios, catálogo, citas, pagos, personal —ya incluye claves F8 `staff.attendance.*`, `staff.commissions.*`, `reports.tenant`—, UI admin); `DEFAULT_PERMISSIONS` (SUPER_ADMIN todas, ADMIN 31, EMPLOYEE 7, CLIENT 8); `NOTIF_EVENT_CATALOG` + `DEFAULT_NOTIFICATION_MATRIX`. |
| `rbac/permissions.ts` | `can(session,key,tenantId?)`: superadmin → true; clave ausente → false; caché en memoria TTL 30s; si no hay filas → `ensureTenantMatrices`. `requirePermission` (import dinámico a auth). |
| `rbac/notification-matrix.ts` | `getMatrixChannels` (fallback defaults) + `applyUserPrefs` (intersección con `user.notify*`). |
| `rbac/seed-matrices.ts` | `ensureTenantMatrices(prisma,tenantId,{reset?})` — upsert sin pisar overrides (salvo reset). |

## 7. Flujos principales end-to-end

- **Reserva:** `BookingWizard.tsx` (5 pasos; filtra empleados por vínculos en cliente) →
  `GET /api/slots` (`lib/slots.ts`) → `POST /api/appointments` (valida vínculos
  employee↔service, conflicto de horario check-then-create **sin transacción** — race
  conocida; aplica `prepaidDiscountPct`; si prepaga → `startPrepaidCheckout`) → redirect a
  `checkoutUrl` o `/confirmacion?id=` (demo/prepaid flags).
- **Pago real:** pasarela → webhook `/api/payments/webhooks/{mercadopago|paypal|clip}`
  (MP hace fetch-back de verificación; **PayPal/Clip sin firma** ⚠️) →
  `markPaymentApproved` → cita PREPAID + notificación. PayPal también captura en return
  (`/pago/resultado` → `/api/payments/capture-paypal`, **sin sesión** ⚠️).
- **Cancelación + reembolso:** `POST /api/appointments/[id]/cancel` (owner, o cualquier
  ADMIN/EMPLOYEE ⚠️) → si PREPAID, `computeRefundCents` por política (≥24h: 100%; 2–24h:
  50%; <2h: $0 con defaults) → `refundAppointmentPayment` (pasarela o demo) →
  `notifyAppointmentCancelled` + evento `payment.refunded`.
- **Reasignación:** admin propone → `POST .../reassign` (`requireAdmin`) → status
  REASSIGNMENT_PENDING + notif → cliente en `/reasignacion` (3 cards) →
  `POST .../reassign-choice`: ACCEPT_NEW (cita al propuesto) / RESCHEDULE (nueva fecha,
  valida conflicto) / CANCEL_REFUND (cancela + reembolso).
- **Notificaciones:** evento (código app) → matriz tenant ∩ prefs usuario →
  `enqueueNotification` (log idempotente) → BullMQ `salon-notifications` → worker envía
  (Resend/Telegram/WebPush; sin credenciales → SKIPPED) → log SENT/FAILED. IN_APP no pasa
  por worker. Recordatorios: cola `salon-system` cada 15 min busca citas a T-24h/T-2h
  (±30 min) sin log previo → `notifyReminder`.
- **Auth:** login (`/login`, email/phone + pass; 2º paso MFA si `mfaEnabled`; passkey con
  `@simplewebauthn/browser`) → cookie JWT 14d. Registro mínimo (nombre + email o phone).
  Guards por layout (server) + por API (excepciones). Logout limpia cookie con mismos
  atributos (fix 0.8.0).
- **Ausencias:** empleado solicita en `/empleado#permiso` → `POST /api/absences` (⚠️
  acepta `employeeId` arbitrario) → si hay prepagadas en rango: `BLOCKED`; admin aprueba/
  rechaza (PATCH, recheckea prepagadas).

## 8. Rutas: páginas y API

Páginas (todas server components + Prisma directo + `force-dynamic`, salvo `/login` que
es client puro; guards por layout):

- **Shell A `(public)/`:** `/` (home, 6 destacados), `/servicios` + `/servicios/[id]`,
  `/sucursales`, `/contacto` (UI-only), `/login` (login+registro+MFA+passkey), `/agendar`
  (BookingWizard, reserva anónima OK), `/confirmacion?id=` (**IDOR** conocido: PII +
  checkoutUrl), `/mis-citas` (sesión), `/cuenta` (sesión; `AccountClient`: perfil, pass,
  prefs, push, MFA, passkeys + puertas a panels), `/pago/resultado`, `/reasignacion`
  (sesión + ownership).
- **Shell B `/admin/`** (layout exige `hasAdminAccess`; permisos finos en las APIs):
  `/admin` (KPIs), `/admin/citas` (+`ReassignButton`, `AdminCancelButton`),
  `/admin/servicios`, `/admin/sucursales`, `/admin/personal` (solo lectura),
  `/admin/clientes`, `/admin/notificaciones` (auditoría log), `/admin/permisos` (matriz
  RBAC), `/admin/matriz-notificaciones`, `/admin/config` (8 tabs: General, Apariencia,
  Pagos MP/PayPal/Clip, Correo, Telegram, Turnstile, Usuarios, Citas/prepago — GET solo
  expone flags `hasX`), `/admin/plataforma` (solo superadmin: pasarela global, enables,
  demo payments).
- **Shell C `/empleado/`** (layout exige `hasStaffAccess`): `/empleado` (agenda hoy/mañana
  + `#permiso` con `AbsenceForm`).

API (29 handlers; guard entre paréntesis):

- **Auth:** `POST /api/auth/login` (público; MFA 2 pasos con `mfaPendingToken`; sin rate
  limit), `GET|POST /api/auth/logout`, `POST /api/auth/register` (409 si existe —
  enumeración).
- **Citas:** `POST /api/appointments` (opcional; anónimo OK), `POST …/[id]/cancel`
  (owner/ADMIN/EMPLOYEE), `POST …/[id]/reassign` (requireAdmin), `POST
  …/[id]/reassign-choice` (owner/admin), `GET /api/slots` (público), `GET|POST|PATCH
  /api/absences` (rol ADMIN|EMPLOYEE; PATCH requireAdmin).
- **Pagos:** `POST /api/payments/capture-paypal` (**sin guard**), webhooks
  `mercadopago` (fetch-back OK) / `paypal` / `clip` (**sin firma**).
- **Admin (requireAdmin salvo nota):** `GET|PATCH /api/admin/settings` (9 secciones;
  cifra secretos), `POST|PATCH /api/admin/users` (pass default `demo1234`),
  `POST|PATCH /api/admin/services`, `POST|PATCH /api/admin/branches`,
  `GET /api/admin/notifications`, `GET|PUT|POST /api/admin/permissions`
  (`tenant.permissions.edit`), `GET|PUT /api/admin/notification-matrix`
  (`tenant.notifications.matrix`).
- **Plataforma/cuenta/seguridad:** `GET|PATCH /api/platform` (isSuperAdmin),
  `GET|PATCH /api/account` (sesión), `POST|PATCH /api/mfa/setup` (sesión; disable sin
  re-auth ⚠️), `GET|POST /api/passkey/register` (sesión; challenges en `Map` en memoria),
  `GET|POST /api/passkey/authenticate` (público; **replay** ⚠️), `GET|POST|DELETE
  /api/push/subscribe`, `GET /api/notifications` (campanita, 40 últimas IN_APP),
  `POST /api/telegram/webhook` (`/start <userId>`; sin token firmado ⚠️),
  `GET /api/health` (expone `e.message` ⚠️; usado por healthcheck compose).

## 9. UI: 3 shells (contrato — no re-mezclar)

Regla de oro (`docs/patterns/app-shells.md`): **exactamente 3 shells**; mezclarlos es bug
de diseño (ya pasó una vez).

| Shell | Chrome | Rutas | Layout | Componente |
|---|---|---|---|---|
| **A Público** | top bar `.public-nav` | `(public)/*` (incluye `/cuenta`, `/mis-citas`) | `app/(public)/layout.tsx` | `PublicNav` → `PublicNavClient` |
| **B Admin** | sidebar + topbar | `/admin/*` | `app/admin/layout.tsx` | `AdminShell` |
| **C Empleado** | sidebar reducido + topbar | `/empleado/*` | `app/empleado/layout.tsx` | `EmpleadoShell` |

- En el sitio público solo **puertas** de una línea ("Admin", "Mi agenda"); nunca el
  árbol de operación. Móvil: cada shell tiene su propio drawer ☰ overlay (contenido
  distinto). Superadmin: bypass de permisos, pero UI = Shell B (+link Plataforma).
- Menú admin: Dashboard · Citas · Servicios · Sucursales · Personal · Clientes ·
  Notificaciones · Permisos · Matriz notifs · Configuración · Plataforma*; footer:
  Vista empleado · Mi cuenta · Sitio público · Salir. (* solo superadmin)
- Menú empleado: Agenda hoy · Solicitar permiso; footer: Vista admin (si aplica) ·
  Mi cuenta · Sitio público · Salir.
- Tema: 2 colores hex por tenant (`/admin/config` → Apariencia) → `theme.ts` deriva
  variantes → `<style>` en `app/layout.tsx`. Sin dark mode en v1.
- Clases contrato del mockup: `.btn`, `.card`, `.badge`, `.sidebar`, `.public-nav`,
  `.admin-shell`, `.stepper`, `.slot-grid`… (`design-system.css`).

## 10. Infra, worker y PWA

- **Compose:** postgres:18 (5432), redis:8-alpine (6379), minio:latest **sin uso en
  código** (9000/9001), app (target dev, `APP_PORT`→3000), worker (mismo build, `npx tsx
  worker/index.ts`, `SKIP_SEED/DB_PUSH=1`, depende de app healthy `/api/health`), tunnel
  (`cloudflare/cloudflared:latest` sin pinnear, perfil `tunnel`). ⚠️ Publica
  Postgres/Redis/MinIO al host con credenciales dev (deuda F9).
- **Dockerfile:** dev (npm ci + prisma generate en build; compose monta `./web:/app` +
  volumen `web_node_modules`), builder, runner (prod, usuario nextjs; **ningún compose lo
  usa**; "prod" corre `next dev` con `NODE_ENV=development`).
- **Worker** (`web/worker/`): `index.ts` — cola `salon-notifications` (concurrency 5,
  limiter 20/s) + `salon-system` (repeatable "reminders" cada 15 min + primera pasada al
  arrancar); shutdown limpio SIGINT/SIGTERM. `process.ts` — envío real por canal
  (Resend / Telegram fetch / WebPush vía import dinámico; IN_APP → SENT directo), marca
  log SENT/FAILED/SKIPPED (FAILED re-lanza para retry); ⚠️ **duplica** `decryptSecret`
  (no importa `src/lib/crypto.ts`) y el worker usa imports relativos, no alias `@/`.
- **PWA:** `public/sw.js` (network-first para navegaciones con fallback a `/`; push +
  notificationclick; el comentario "cache-first static" no está implementado),
  `manifest.webmanifest`, iconos 192/512. Registro: `components/PwaRegister.tsx`.
- **Env** (raíz `.env.example`): Postgres/Redis/MinIO, `APP_PORT`, `APP_ENCRYPTION_KEY`,
  `SESSION_SECRET`, `TENANT_SLUG`, `PUBLIC_APP_URL`/`NEXT_PUBLIC_APP_URL`,
  `CLOUDFLARE_TUNNEL_TOKEN`, `VAPID_*`, integraciones opcionales (Resend/Turnstile/
  Telegram). `web/.env.example` para dev en host sin Docker.

## 11. Historial de cambios (resumen del CHANGELOG)

Git: 4 commits en `main` (`0a7eb41` initial → … → `9cc894a` HEAD), árbol limpio.

- **0.1.0** (2026-07-15): solo documentación base (F0).
- **0.2.0/0.2.1**: mockup estático navegable (F1) + fix sidebar admin.
- **0.3.0**: Design System + pattern library desde mockup; mockup congelado; deploy tunnel
  documentado (F2).
- **0.5.0** (2026-07-16): app Next + Docker (F3); auth/roles/config + secretos cifrados
  (F4); catálogo, sucursales, personal, wizard con slots reales, mis-citas (F5).
- **0.6.0**: pagos multi-proveedor MP/PayPal/Clip + reembolsos + reasignación + candado
  ausencias (F6).
- **0.7.0**: notificaciones BullMQ + Resend + Telegram + recordatorios (F7).
- **0.7.1**: PWA, Web Push, campanita, `/cuenta` (prefs), MFA TOTP, passkeys.
- **0.7.2**: matrices RBAC y de notificaciones editables en admin.
- **0.7.3**: fix desync Prisma/Docker, seed idempotente, worker tras app healthy.
- **0.8.0** (2026-07-18): contrato 3 shells + drawers móviles; `lib/url.ts` (fix redirects
  0.0.0.0); catálogo demo 22 servicios estilo MTY; home con contadores reales.
- **[Unreleased]:** política de versionado reforzada. Planeado: F8, hardening F9.

## 12. Qué sigue

**F8 — Operación del personal (pendiente, siguiente de producto):** checador, comisiones,
reportes. Colocación ya decidida: checador propio + comisiones propias → Shell C
(`/empleado`); asistencia/comisiones/reportes del negocio → Shell B (`/admin`). El mockup
ya tiene las pantallas: `mockup/empleado/{checador,comisiones}.html` (E-03/E-04),
`mockup/admin/{asistencia,comisiones,reportes}.html` (A-10/A-11/A-12). Los permisos RBAC
de F8 **ya están sembrados** en `rbac/catalog.ts` (`staff.attendance.own/all`,
`staff.absence.*`, `staff.commissions.own/all`, `reports.tenant`).
`docs/COMMISSIONS_RESEARCH.md` es **placeholder** (sin investigación; modelos candidatos
A–D, recomendación pospuesta, probable B: % por categoría/empleado o C: fijo+%).

**F9 — Hardening/deploy (parcial):** tunnel ✅; pendiente backups, políticas MinIO,
checklist prod, compose prod (target runner), migraciones versionadas, release 1.0.0.
Detalle real en `docs/AUDIT_2026-07-16.md` (bloques A–E).

## 13. Deuda técnica y seguridad (auditoría 2026-07-16, mayormente abierta)

Críticos: seed siembra `super@salon.local`/`demo1234` en el stack del tunnel;
`SESSION_SECRET`/`APP_ENCRYPTION_KEY` con fallbacks hardcodeados (JWT falsificable,
secretos descifrables); webhooks PayPal/Clip sin firma; `allowDemoPayments=true` por
defecto. Altos: passkey authenticate con replay; sin rate limiting ni Turnstile real;
JWT 14d sin revocación; vinculación Telegram sin token firmado; puertos dev publicados;
`capture-paypal` sin sesión. Medios: IDOR `/confirmacion?id=`; cualquier EMPLOYEE cancela
cualquier cita; MFA disable sin re-auth; cero security headers (`next.config.ts` vacío);
race doble booking (sin transacción); `next@15.5.9` con 4 vulns altas (fix en 15.5.20);
`/api/health` expone errores; ausencias con `employeeId` arbitrario. Bien: bcrypt, cookies
httpOnly/sameSite, AES-GCM correcto, settings solo expone `hasX`, SQL parametrizado
(Prisma), RBAC por tenant, sin mass-assignment, webhook MP con fetch-back.

Deuda no-seguridad: sin tests; sin migraciones (`db push`); `slots.ts` ignora ausencias y
`minLeadMinutes`; worker duplica `decryptSecret`; sw.js sin cache-first real; MinIO sin
uso; `docs/CONFIGURATION.md` y varios docs desactualizados (§14).

## 14. Discrepancias docs ↔ realidad (verificado)

1. Puerto local: DEPLOY.md dice 3000; realidad y README/PHASES/GROK: **3010**.
2. DEPLOY.md §4/§6 redactado "en futuro" pero F3/F4 ya existen y el tunnel opera.
3. DEPLOY.md prescribe no publicar 5432/6379/9000; el compose **sí los publica**.
4. `ARCHITECTURE.md` §9 "decisiones abiertas" obsoleto (auth y pasarela ya resueltas);
   `STACK.md` menciona Tailwind "a definir" — la app usa **CSS puro**.
5. Turnstile: se guarda en settings y los patterns lo dan por hecho, pero **no se
   verifica en ningún endpoint**.
6. `NOTIFICATIONS_MATRIX.md`: 17 eventos y sin canal push; la app cablea 12 eventos y
   **sí tiene push**.
7. `PERMISSIONS_MATRIX.md` pide tests y middleware: no existen (guards por página/API).
8. `SECURITY.md` es aspiracional (rate limit, headers, Zod: nada implementado).
9. README lista 3 usuarios demo; son 5 (incluye `super@` y `maria@`).
10. sw.js: comentario cache-first ≠ código (network-first solo navegaciones).

## 15. Convenciones obligatorias al editar

1. **Changelog + versión en cada entrega** (`docs/VERSIONING.md`): `[Unreleased]` en la
   misma sesión; al cerrar lote, bump `VERSION` + `web/package.json`. Prohibido commitear
   features "en silencio".
2. UI/rutas/mensajes/docs en **español**; código en inglés. Dinero en centavos; secretos
   `*Enc`; URLs con `lib/url.ts` (nunca `req.url` para redirects).
3. **Shells:** pantalla nueva → asignar shell A/B/C → ítem solo en ese shell → actualizar
   `docs/ROLES_AND_UI.md` si cambia el árbol. Prohibidos imports cruzados de navs.
4. Notificaciones siempre asíncronas (nunca en el request HTTP), `eventKey` idempotente;
   la cola nunca rompe el request.
5. Guards por excepción (`requireSession/requireRole/requirePermission`); superadmin
   bypass; permisos finos en APIs (las páginas admin solo exigen `hasAdminAccess`).
6. Clases CSS del mockup como contrato; tema por tenant solo primary+accent; sin Tailwind.
7. Seed siempre idempotente (upserts); no pisar passwords/matrices/config salvo flags
   `SEED_RESET_*`.
