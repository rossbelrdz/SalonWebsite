# AGENTS.md — Base de conocimiento del proyecto Salon

> Contexto para agentes (y humanos) que trabajen en este repo. Actualizar cuando cambien
> arquitectura, deploy, convenciones, UI shells o seguridad.
> Última revisión: 2026-07-18 — shells UI documentados en `docs/patterns/app-shells.md`.

## 1. Qué es

SaaS **multi-negocio (tenant) y multi-sucursal** para salones de belleza y barberías.
UI, rutas, mensajes y docs en **español**; código en inglés. Hoy opera con **un solo
tenant "demo"** (`getDefaultTenant()` en `web/src/lib/auth.ts`, slug vía `TENANT_SLUG`);
el multi-tenant real por request está diferido.

Roles: **Super Admin** (plataforma), **Admin** (negocio), **Empleado**, **Cliente**.
Flujo núcleo: cliente elige sucursal → servicio → profesional → horario; prepago opcional
con descuento; cancelación/reagendado; reasignación de citas con decisión del cliente
(aceptar / reagendar / cancelar con reembolso).

Estado de fases: F0–F7 hechas; **F8 pendiente** (checador, comisiones, reportes) — ver
`docs/PHASES.md`.

## 2. Stack

| Pieza | Detalle | Referencia |
|---|---|---|
| Framework | Next.js 15.5.9 (App Router, Turbopack) + React 19 + TS | `web/package.json` |
| DB | PostgreSQL 18 (Docker) | `docker-compose.yml` |
| ORM | Prisma 6.19, cliente generado en `web/src/generated/prisma` | `web/prisma/schema.prisma` |
| Auth | **Propia** (no NextAuth): JWT HS256 en cookie httpOnly `salon_session` (14d) vía `jose`; bcryptjs | `web/src/lib/session.ts`, `web/src/lib/auth.ts` |
| Estilos | **CSS puro con variables** (sin Tailwind): tokens en `web/src/app/design-system.css` + `globals.css`; componentes mínimos en `web/src/components/ui.tsx` | `docs/DESIGN_SYSTEM.md` |
| Colas | BullMQ sobre Redis 8 (proceso worker aparte) | `web/worker/index.ts` |
| Email | Resend | `web/worker/process.ts` |
| Pagos | Adaptadores propios por fetch: Mercado Pago, PayPal, Clip + modo demo | `web/src/lib/payments/` |
| Notifs | Telegram Bot API, Web Push (VAPID), in-app | `web/src/lib/push.ts`, `web/src/lib/notifications/` |
| Cuenta | MFA TOTP (otplib), Passkeys/WebAuthn (simplewebauthn) | `web/src/lib/mfa.ts`, `web/src/lib/webauthn.ts` |
| Cifrado | AES-256-GCM con `APP_ENCRYPTION_KEY`; campos `*Enc` en DB | `web/src/lib/crypto.ts` |
| Deploy | Docker Compose + perfil `tunnel` (cloudflared) → `https://salon.freonx.org` | `docker-compose.yml`, `docs/DEPLOY.md` |

**No hay tests** ni `middleware.ts` (guards por página/layout/API). MinIO está en compose
pero **sin uso en código**. Turnstile se guarda en settings pero **no se verifica en ningún endpoint**.

## 3. Mapa de directorios

```
Salon/
├── AGENTS.md                 # este archivo
├── GROK.md / README.md       # contexto de entrada
├── KIMI.md                   # panorama técnico verificado contra código (referencia de trabajo)
├── VERSION / CHANGELOG.md    # SemVer + Keep a Changelog (actual: 0.10.0)
├── docker-compose.yml        # postgres, redis, minio, app, worker, tunnel (perfil)
├── docs/                     # ~22 docs por tema (ver §8) + patterns/ (12 patrones UI)
├── mockup/                   # HTML estático CONGELADO — solo referencia visual
└── web/                      # app Next.js
    ├── Dockerfile            # targets dev y runner (prod; runner NO se usa aún)
    ├── scripts/docker-dev-entrypoint.sh  # npm ci → prisma generate → db push → seed → assert
    ├── prisma/schema.prisma  # 17 modelos + 9 enums
    ├── prisma/seed.ts        # idempotente; tenant demo; usuarios demo1234
    ├── worker/index.ts       # BullMQ: salon-notifications + salon-system (recordatorios c/15min)
    ├── worker/process.ts     # envío Resend/Telegram/WebPush, marca logs SENT/FAILED/SKIPPED
    └── src/
        ├── app/(public)/     # home, agendar (BookingWizard), confirmacion, cuenta,
        │                     # login, mis-citas, pago/resultado, reasignacion, servicios, sucursales
        ├── app/admin/        # dashboard, citas, clientes, config, matrices, personal,
        │                     # servicios, sucursales, plataforma (superadmin) — Shell B
        ├── app/empleado/     # agenda + permiso — Shell C (sidebar, no PublicNav)
        ├── app/api/          # ~30 route handlers
        ├── components/       # PublicNav, AdminShell, EmpleadoShell, NotificationBell, ui.tsx
        ├── lib/              # auth, session, db, crypto, theme, slots, mfa, webauthn, push
        │   ├── payments/     # mercadopago.ts, paypal.ts, clip.ts + orquestador index.ts
        │   ├── notifications/# cola, eventos, templates, resend, telegram
        │   └── rbac/         # catálogo de permisos, matriz, seed de matrices
        └── generated/prisma/ # cliente generado
```

## 4. Modelo de datos (Prisma)

`web/prisma/schema.prisma`. Núcleo:

- **Tenant** 1:1 **TenantSettings** (tema, timezone, % descuento prepago, política de
  reembolso, credenciales cifradas MP/PayPal/Clip/Resend/Telegram/Turnstile).
- **User** (email o phone únicos, `isSuperAdmin`, MFA, prefs notificación) →
  **Membership** (rol por tenant), **EmployeeProfile**, **PushSubscription**, **PasskeyCredential**.
- **Branch** y **Service** (por tenant). EmployeeProfile M:N Branch (`EmployeeBranch`),
  M:N Service (`EmployeeService`), → **WorkSchedule** (1 por día).
- **Appointment**: status CONFIRMED/PREPAID/PENDING/CANCELLED/COMPLETED/REASSIGNMENT_PENDING;
  campos de reasignación (`proposedEmployeeId`, `reassignmentChoice`).
- **Payment** (provider NONE/MERCADOPAGO/PAYPAL/CLIP, montos de reembolso, `rawMeta`).
- **AbsenceRequest** (`blockedByPrepaid`), **RolePermission**, **NotificationMatrixRule**,
  **NotificationLog** (idempotencia por `eventKey`), **PlatformSettings** (singleton:
  pasarela activa global + `allowDemoPayments`).

## 5. Flujos principales

- **Reserva:** `web/src/app/(public)/agendar/BookingWizard.tsx`; slots en `web/src/lib/slots.ts`
  vía `GET /api/slots`; creación en `web/src/app/api/appointments/route.ts` (valida vínculos,
  conflicto de horario, aplica descuento, inicia checkout prepago).
- **Pagos:** `web/src/lib/payments/index.ts` + webhooks en `web/src/app/api/payments/webhooks/{mercadopago,paypal,clip}/route.ts`;
  captura PayPal en `capture-paypal/route.ts`; reembolsos con política por horas (`computeRefundCents`).
- **Reasignación:** `api/appointments/[id]/reassign` → cliente decide en `(public)/reasignacion/`
  (`api/appointments/[id]/reassign-choice`).
- **Auth/cuenta:** `api/auth/{login,logout,register}`, `/cuenta` con MFA (`api/mfa/setup`),
  passkeys (`api/passkey/{register,authenticate}`).
- **Notificaciones:** eventos en `web/src/lib/notifications/events.ts` → matriz tenant +
  prefs usuario → BullMQ → `NotificationLog` idempotente. Campanita: `components/NotificationBell.tsx`.
- **Admin:** shell `components/AdminShell.tsx`; CRUDs `app/admin/*` + `api/admin/*`.
- **Empleado:** shell `components/EmpleadoShell.tsx` (sidebar; ver §7 shells).
- **PWA:** `web/public/sw.js`, `manifest.webmanifest`, `api/push/subscribe`.

## 6. Deploy y operación

**No hay CI/CD** (sin `.github/`, `vercel.json`). Compose es la vía de deploy.

| Compose | Modo | Comando |
|---------|------|---------|
| **`docker-compose.yml`** | **production** (`next start`) | `docker compose --profile tunnel up -d --build` |
| `docker-compose.dev.yml` | development (Turbopack) | `docker compose -f docker-compose.dev.yml up` |

- **Prod/demo:** `NODE_ENV=production`, imagen target **`runner`** (build en imagen, sin montar
  `./web`). Entrypoint `web/scripts/docker-prod-entrypoint.sh` → prisma generate + db push +
  seed → **`next start`**. Tunnel: `https://salon.freonx.org` (cloudflared → `app:3000`).
- **Dev:** monta código, `next dev --turbopack`, entrypoint `docker-dev-entrypoint.sh`.
- **Worker:** misma imagen; `npx tsx worker/index.ts`, `SKIP_SEED=1` / `SKIP_DB_PUSH=1`.
- **No hay migraciones versionadas** (solo `db push`); deuda conocida.
- Scripts npm: `build`, `start`, `db:generate`, `db:push`, `db:seed`, `db:setup`, `db:reset`,
  `db:assert`.
- **Versionado (OBLIGATORIO):** `CHANGELOG.md` + `VERSION` + `web/package.json` —
  ver `docs/VERSIONING.md`.
- Env: `.env.example` (`APP_ENCRYPTION_KEY`, `SESSION_SECRET`, `PUBLIC_APP_URL`,
  `CLOUDFLARE_TUNNEL_TOKEN`, `VAPID_*`, …).
- **URLs:** `web/src/lib/url.ts`. Nunca `new URL(path, req.url)` para redirects en Docker.
  Prod: `PUBLIC_APP_URL=https://salon.freonx.org`.

⚠️ Compose aún publica Postgres/Redis/MinIO al host (hardening = F9). `cloudflared:latest`
sin pinnear.

## 7. UI shells y navegación (OBLIGATORIO — no re-mezclar)

> **Leer antes de tocar menús, layouts o pantallas nuevas (F8+):**  
> [`docs/patterns/app-shells.md`](docs/patterns/app-shells.md)

Hay **exactamente 3 shells**. Mezclarlos (p. ej. top-nav público con ítems de admin, o
un “menú unificado multi-rol”) es un **bug de diseño** ya cometido y prohibido.

| Shell | Chrome | Rutas | Layout | Componente |
|-------|--------|-------|--------|------------|
| **A Público** | Top bar `.public-nav` | `(public)/*` incl. `/cuenta`, `/mis-citas` | `app/(public)/layout.tsx` | `PublicNav` / `PublicNavClient` |
| **B Admin** | Sidebar + topbar | `/admin/*` | `app/admin/layout.tsx` | `AdminShell` |
| **C Empleado** | Sidebar reducido + topbar | `/empleado/*` | `app/empleado/layout.tsx` | `EmpleadoShell` |

**Reglas:**

1. Mockup manda la estructura: `mockup/publico` → A, `mockup/admin` → B, `mockup/empleado` → C (empleado = sidebar, **no** public-nav).
2. No importar `PublicNav` en admin/empleado; no importar shells B/C en `(public)`.
3. Móvil: cada shell tiene **su** drawer ☰ (mismo patrón visual, **distinto contenido**).
4. En el sitio público solo se permiten **puertas** de una línea (“Admin”, “Mi agenda”), no el árbol de operación.
5. Superadmin: bypass de permisos en lógica; UI sigue siendo Shell B.
6. Pantalla nueva → asignar shell con la tabla de `app-shells.md` → ítem de menú solo en ese shell → actualizar `docs/ROLES_AND_UI.md` si cambia el árbol.

Patrones: `docs/patterns/public-nav.md`, `docs/patterns/admin-sidebar.md`.  
Roles/menús: `docs/ROLES_AND_UI.md`. Tokens: `docs/DESIGN_SYSTEM.md` §5.

## 8. Convenciones de código

- **Pruebas UI / browser (OBLIGATORIO):** usar **`agent-browser`** (`agent-browser skills get core`).
  No CDP/Playwright improvisado ni Chromium de cachés viejos. Detalle: `GROK.md` §8.
- **Changelog + versión + commit + push en cada entrega de código** (OBLIGATORIO):
  1. Actualizar `CHANGELOG.md` (sección de la versión), `VERSION` y `web/package.json`.
  2. `git add` (nunca `.env` ni secretos) → `git commit` con mensaje claro.
  3. `git push` a la rama de trabajo (`develop` / la del PR).
  Ver §6 y `docs/VERSIONING.md`. Sin esto se pierde el historial (regla del equipo, 2026-07-18).
- UI/rutas/mensajes/docs en español; código en inglés.
- Server Components por defecto con Prisma directo en página (`export const dynamic =
  "force-dynamic"`); interactividad en componentes cliente (`*Client.tsx` o nombre de acción).
- Sin capa repositorio; lógica compartida en `web/src/lib/`; alias `@/`.
- Guards por excepción: `requireSession/requireRole/requirePermission` lanzan
  `Error("UNAUTHORIZED"/"FORBIDDEN")` (`web/src/lib/auth.ts`, `web/src/lib/rbac/permissions.ts`);
  superadmin hace bypass; caché de permisos en memoria 30s.
- RBAC en DB (`RolePermission`), editable en `/admin/permisos`.
- Dinero en centavos (`priceCents`); secretos cifrados con sufijo `Enc`.
- Notificaciones siempre asíncronas (nunca en el request HTTP), `eventKey` idempotente.
- Imports dinámicos para romper ciclos (payments ↔ notifications, auth ↔ rbac).
- Clases CSS del mockup como contrato (`.btn`, `.card`, `.badge`, `.sidebar`, `.public-nav`…);
  tema por tenant inyectado en `<style>` desde `app/layout.tsx` (`web/src/lib/theme.ts`).
- zod instalado pero **sin uso** — validación manual en handlers.

## 9. Seguridad — estado actual (auditoría 2026-07-18)

Documentación previa: `docs/ACCOUNT_SECURITY.md`, `docs/AUDIT_2026-07-16.md` (sus P0/P1 de
seguridad siguen mayormente abiertos).

**Críticos abiertos:**
1. Seed crea `super@salon.local` con `demo1234` y corre por defecto en el stack del tunnel
   (`web/prisma/seed.ts`, `docker-compose.yml` SKIP_SEED=0).
2. `SESSION_SECRET`/`APP_ENCRYPTION_KEY` con placeholders en `.env` reales y fallbacks
   hardcodeados (`web/src/lib/session.ts:19`, `web/src/lib/crypto.ts:4`) → JWT falsificables
   con `isSuperAdmin:true` y secretos de DB descifrables.
3. Webhooks PayPal/Clip sin verificación de firma → marcar prepagos sin pagar
   (`web/src/app/api/payments/webhooks/{paypal,clip}/route.ts`); MP sí hace fetch-back.
4. `allowDemoPayments` default `true` + provider `NONE` → prepago auto-aprobado sin cobro.

**Altos:** passkey login confía en el challenge del cliente (replay; `api/passkey/authenticate/route.ts`);
sin rate limiting en login/TOTP/registro/citas y Turnstile nunca se verifica; JWT 14d stateless
sin revocación ni revalidación en DB; vinculación de Telegram sin token firmado
(`api/telegram/webhook/route.ts`); Postgres/Redis/MinIO publicados con credenciales dev;
`capture-paypal` sin sesión con condición de aprobación laxa.

**Medios (resumen):** IDOR en `/confirmacion?id=` (PII + checkoutUrl); cualquier EMPLOYEE
cancela cualquier cita con reembolso; MFA pending sin TTL y disable sin re-auth; cero security
headers (`next.config.ts` vacío, sin `middleware.ts`); race de doble booking (check-then-create
sin transacción); passwords mínimo 6 y default `demo1234`; `npm audit`: 5 vulns en prod
(4 altas en `next@15.5.9`, fix en 15.5.20); enumeración de usuarios en registro; `/api/health`
expone `e.message`; ausencias con `employeeId` arbitrario.

**Bien implementado:** bcrypt; cookies httpOnly/sameSite/secure; AES-256-GCM con iv/tag;
API de settings solo expone flags `hasX` (nunca valores); SQL 100% Prisma parametrizado;
AuthZ admin con matriz RBAC por tenant; layouts de páginas protegidos server-side; sin mass
-assignment; webhook MP con fetch-back; XSS controlado (`isValidHex` en colores de tema);
sin logging de secretos; CORS same-origin por defecto.

Prioridad sugerida: rotar secrets + no sembrar superadmin demo fuera de local → firmas de
webhook + `allowDemoPayments=false` fuera de dev → rate limit + Turnstile real en login →
revalidar sesión contra DB → security headers + `next@15.5.20`.

## 10. Índice de docs/

| Doc | Tema |
|---|---|
| `docs/patterns/app-shells.md` | **Contrato UI: 3 shells** (público / admin / empleado) — leer antes de menús |
| `docs/ROLES_AND_UI.md` | Roles + menús por shell |
| `docs/DESIGN_SYSTEM.md` | Tokens, layouts, componentes |
| `docs/patterns/` | Pattern library (nav, sidebar, wizard, …) |
| `docs/ARCHITECTURE.md` | Monolito modular + workers, módulos de dominio |
| `docs/STACK.md` | Versiones pinneadas (Node 22, Postgres 18, Redis 8) |
| `docs/SECURITY.md` | Seguridad como requisito de diseño |
| `docs/PRODUCT.md` | Negocio y flujos funcionales |
| `docs/PHASES.md` | Fases F0–F9 y estado (siguiente: F8) |
| `docs/DESIGN_SYSTEM.md` + `docs/patterns/` | Tokens, layouts por rol, pattern library |
| `docs/PERMISSIONS_MATRIX.md`, `docs/RBAC_ADMIN.md` | Matriz de permisos |
| `docs/NOTIFICATIONS.md`, `docs/NOTIFICATIONS_MATRIX.md` | Sistema de notificaciones |
| `docs/PAYMENTS.md` | Proveedores, webhooks, modo demo |
| `docs/CONFIGURATION.md` | Sección Configuración del admin (⚠️ lista de env desactualizada) |
| `docs/ACCOUNT_SECURITY.md` | Cuenta/PWA/push/MFA/passkeys |
| `docs/DEPLOY.md` | Docker + Cloudflare Tunnel (⚠️ §4 redactada como futuro, ya existe) |
| `docs/DEV_DOCKER.md` | Anti-desync Prisma/Docker |
| `docs/AUDIT_2026-07-16.md` | Auditoría multi-agente (P0/P1 de seguridad abiertos) |
| `docs/VERSIONING.md` | SemVer y releases |
| `docs/MOCKUP.md`, `docs/ROLES_AND_UI.md`, `docs/COMMISSIONS_RESEARCH.md` | Mockup, roles, F8 |
