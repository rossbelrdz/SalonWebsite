# Configuración del sistema

La sección **Configuración** vive en el **admin** (sidebar izquierdo).  
Cubre integraciones, tokens y parámetros operativos.

Seguridad de secretos: [SECURITY.md](./SECURITY.md).

---

## 1. Niveles de configuración

| Nivel | Quién | Ejemplos |
|-------|--------|----------|
| **Plataforma** | Super Admin | **Pasarela de pago activa**, feature flags, límites SaaS, tunnel |
| **Tenant (negocio)** | Admin | Apariencia, **credenciales de pago**, Resend, Telegram, Turnstile, prepago %, reembolsos |
| **Usuario** | Cada quien | Preferencias de notificación (email / push / telegram / in-app) |

---

## 2. Env vs base de datos (OBLIGATORIO)

| Configuración | Dónde | Notas |
|---------------|--------|--------|
| `POSTGRES_*`, `REDIS_URL`, `MINIO_*` | **Env** (Compose) | Infraestructura |
| `APP_ENCRYPTION_KEY` | **Env** | Cifrado AES-256-GCM de secretos en DB |
| `SESSION_SECRET` | **Env** | JWT cookie `salon_session` |
| `PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_URL` | **Env** | Links absolutos, redirects, plantillas |
| `CLOUDFLARE_TUNNEL_TOKEN` | **Env** (perfil tunnel) | cloudflared |
| `VAPID_*` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Env** | Web Push (empaquetado en build) |
| Resend API key / from | **DB** `TenantSettings` (`resendApiKeyEnc`, …) | Admin → Correo |
| Telegram bot token / enabled | **DB** (`telegramBotTokenEnc`, `telegramEnabled`) | Admin → Telegram |
| Telegram destinos (grupos/canales) | **DB** `TelegramTarget` | Admin → Telegram (catálogo) |
| Chat admin legacy | **DB** `telegramAdminChatId` | Fallback si no hay targets |
| Turnstile site + secret | **DB** (`turnstileSiteKey`, `turnstileSecretEnc`) | Admin → Turnstile |
| MP / PayPal / Clip credentials | **DB** (`*Enc`) | Admin → Pagos |
| Tema, timezone, prepago, reembolsos | **DB** | Admin → Apariencia / Citas |

**Regla:** secretos de producto del tenant **no** van en `.env` de la app. Se guardan
cifrados (`*Enc`) con `APP_ENCRYPTION_KEY`. Ver [NOTIFICATIONS.md](./NOTIFICATIONS.md).

---

## 3. Integraciones (UI + base de datos)

### 3.0 Apariencia (colores de marca)

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| Color primario | Visible | Hex / color picker → CSS `--primary` |
| Color acento | Visible | Hex / color picker → CSS `--accent` |
| Preview | Visible | Botones y badge de muestra |
| Restaurar defaults | Acción | Vuelve a paleta Design System |

- Sección: **Configuración → Apariencia**.  
- Solo Admin del tenant (no empleado).  
- No personalizar danger/success/warning en v1.  
- Patrón: [patterns/brand-theme.md](./patterns/brand-theme.md).  
- Tokens base: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) §8.

### 3.1 Resend (correo)

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| API Key | Secreto | Enmascarado en UI; cifrado AES-GCM en reposo |
| From email / From name | Visible | Dominio verificado en Resend |

Uso: confirmaciones, cancelaciones, reasignaciones, reembolsos, altas de cuenta.  
Envío **siempre** vía worker BullMQ.

### 3.2 Telegram Bot

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| Bot token | Secreto | Emitido por @BotFather; cifrado en DB |
| Activo (sí/no) | Visible | Feature flag del tenant |
| Destinos (`TelegramTarget`) | Visible | Grupos / canales / topics (`messageThreadId`) |
| Default ops | Visible | Flag `isDefaultOps` si la matriz no lista targets |
| Chat ID admin (legacy) | Visible | Fallback si no hay targets activos |

Uso: notificaciones a usuarios vinculados y/o a destinos operativos (matriz).  
Matriz de enrutado: [NOTIFICATIONS.md](./NOTIFICATIONS.md).

### 3.3 Cloudflare Turnstile

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| Site key | Pública | Frontend (login/registro) |
| Secret key | Secreto | Solo servidor; cifrado en DB |

Uso: registro y login. Si hay secret configurado, el token es obligatorio y se
verifica con siteverify. Sin secret, el captcha no se exige (modo dev).

### 3.4 Cloudflare Tunnel

| Campo | Dónde |
|-------|--------|
| Tunnel token | Env / secret de deploy: `CLOUDFLARE_TUNNEL_TOKEN` (no UI de tenant) |
| Hostname público | `https://salon.freonx.org` (acordado) |
| Destino interno | `http://app:3000` (red Docker; se configura en Zero Trust) |
| URL de la app | `PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_URL` = `https://salon.freonx.org` en deploy |

Lo configura el owner en el deploy. Desarrollo local **no** lo requiere.  
Guía completa: **[DEPLOY.md](./DEPLOY.md)**.

---

## 4. Usuarios (desde Configuración o sección Usuarios)

### Empresa (staff)

- Alta / baja de **Admin** y **Empleados**.  
- Asignación de sucursales y servicios que ofrecen.  
- Roles según [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md).

### Clientes

- Alta / baja desde admin.  
- Auto-registro público con datos mínimos:

| Campo | Obligatorio |
|-------|-------------|
| Nombre | Sí |
| Correo electrónico **o** celular | Sí (al menos uno) |
| Contraseña / OTP | Según modelo auth F4 |

**No** pedir dirección, cumpleaños, RFC, etc. en el registro.  
Datos adicionales en el **checkout / prepago**.

---

## 5. Pagos (F6)

Ver guía completa: **[PAYMENTS.md](./PAYMENTS.md)**.

| Quién | Dónde | Qué |
|-------|--------|-----|
| Super Admin | Admin → **Plataforma** | Proveedor: NONE / Mercado Pago / PayPal / Clip |
| Admin tenant | Configuración → **Pagos** | Tokens/keys del proveedor elegido |
| Admin tenant | Configuración → **Citas / prepago** | % descuento + política reembolso (horas / %) |

## 6. Parámetros de negocio

| Parámetro | Descripción |
|-----------|-------------|
| % descuento prepago | Descuento vs pago local |
| Antelación mínima de cita | Ej. 1 h |
| Antelación máxima | Ej. 60 días |
| Política reembolso | `refundFullHours` / `refundPartialPct` / `refundNoneHours` |
| Recordatorios | T-24h, T-2h (F7) |

---

## 7. Modelo de persistencia (orientativo)

```text
tenant_settings
  tenant_id
  theme_primary / theme_accent
  resend_api_key_encrypted, resend_from_email, resend_from_name
  telegram_bot_token_encrypted, telegram_enabled
  telegram_admin_chat_id          # legacy fallback
  turnstile_site_key, turnstile_secret_encrypted
  prepaid_discount_pct, refund_* , remind_*
  …

telegram_target
  tenant_id, label, kind (GROUP|CHANNEL), chat_id
  message_thread_id?, active, is_default_ops

notification_matrix_rule
  event_type, audience, email, telegram, in_app, push
  telegram_mode (USER_LINKED|TARGETS|BOTH)
  telegram_target_ids[]
```

- Nunca loguear valores de secretos.  
- Auditoría: quién cambió tokens (sin guardar el valor nuevo en claro en logs).

---

## 8. Variables de entorno (infra)

Además de la UI, Compose usa `.env` para:

```text
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
REDIS_URL=
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
APP_ENCRYPTION_KEY=
SESSION_SECRET=
APP_PORT=3000

# URLs
# Local:  http://localhost:3000
# Deploy: https://salon.freonx.org
PUBLIC_APP_URL=
NEXT_PUBLIC_APP_URL=

# Solo deploy con perfil Compose "tunnel" — ver DEPLOY.md
CLOUDFLARE_TUNNEL_TOKEN=

# Web Push (build-time NEXT_PUBLIC_*)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

**Pasar el token del tunnel al agente/deploy:** pegar el valor en `.env` (preferido) o en chat de forma puntual; no commitear. Checklist en [DEPLOY.md](./DEPLOY.md) §3.
