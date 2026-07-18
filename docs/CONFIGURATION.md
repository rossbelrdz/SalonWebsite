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
| **Usuario** | Cada quien | Preferencias de notificación (futuro) |

---

## 2. Integraciones (UI + base de datos)

### 2.0 Apariencia (colores de marca)

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

### 2.1 Resend (correo)

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| API Key | Secreto | Enmascarado en UI; cifrado en reposo recomendado |
| From email / From name | Visible | Dominio verificado en Resend |
| Reply-to | Visible | Opcional |

Uso: confirmaciones, cancelaciones, reasignaciones, reembolsos, altas de cuenta.  
Envío **siempre** vía worker BullMQ.

### 2.2 Telegram Bot

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| Bot token | Secreto | Emitido por @BotFather |
| Bot username | Visible | Informativo |
| Activo (sí/no) | Visible | Feature flag del tenant |
| Webhook secret | Secreto | Si se usa webhook |

Uso opcional: agendar citas y/o enviar notificaciones.  
Si está inactivo, la matriz de notificaciones omite `telegram`.

### 2.3 Cloudflare Turnstile

| Campo | Visibilidad | Notas |
|-------|-------------|--------|
| Site key | Pública | Puede exponerse al frontend |
| Secret key | Secreto | Solo servidor |
| Modo | Visible | managed / non-interactive / invisible (según cuenta CF) |

Uso: registro, login, contacto, crear/cancelar cita (público).

### 2.4 Cloudflare Tunnel

| Campo | Dónde |
|-------|--------|
| Tunnel token | Env / secret de deploy: `CLOUDFLARE_TUNNEL_TOKEN` (no UI de tenant) |
| Hostname público | `https://salon.freonx.org` (acordado) |
| Destino interno | `http://app:3000` (red Docker; se configura en Zero Trust) |
| URL de la app | `PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_URL` = `https://salon.freonx.org` en deploy |

Lo configura el owner en el deploy. Desarrollo local **no** lo requiere.  
Guía completa (dashboard Cloudflare, checklist, Compose perfil `tunnel`): **[DEPLOY.md](./DEPLOY.md)**.

---

## 3. Usuarios (desde Configuración o sección Usuarios)

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

## 4. Pagos (F6)

Ver guía completa: **[PAYMENTS.md](./PAYMENTS.md)**.

| Quién | Dónde | Qué |
|-------|--------|-----|
| Super Admin | Admin → **Plataforma** | Proveedor: NONE / Mercado Pago / PayPal / Clip |
| Admin tenant | Configuración → **Pagos** | Tokens/keys del proveedor elegido |
| Admin tenant | Configuración → **Citas / prepago** | % descuento + política reembolso (horas / %) |

## 5. Parámetros de negocio

| Parámetro | Descripción |
|-----------|-------------|
| % descuento prepago | Descuento vs pago local |
| Antelación mínima de cita | Ej. 1 h |
| Antelación máxima | Ej. 60 días |
| Política reembolso | `refundFullHours` / `refundPartialPct` / `refundNoneHours` |
| Recordatorios | T-24h, T-2h (F7) |

---

## 6. Modelo de persistencia (orientativo)

```text
tenant_settings
  tenant_id
  theme_primary          # hex, opcional (null = default plataforma)
  theme_accent           # hex, opcional
  resend_api_key_encrypted
  resend_from_email
  telegram_bot_token_encrypted
  telegram_enabled
  turnstile_site_key
  turnstile_secret_encrypted
  prepaid_discount_pct
  ...
  updated_at
  updated_by
```

- Nunca loguear valores de secretos.  
- Auditoría: quién cambió tokens (sin guardar el valor nuevo en claro en logs).

---

## 6. Variables de entorno (infra)

Además de la UI, el compose usará `.env` para:

```text
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
REDIS_URL=
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
APP_ENCRYPTION_KEY=
APP_PORT=3000

# URLs
# Local:  http://localhost:3000
# Deploy: https://salon.freonx.org
PUBLIC_APP_URL=
NEXT_PUBLIC_APP_URL=

# Opcional plataforma:
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN=

# Solo deploy con perfil Compose "tunnel" — ver DEPLOY.md
CLOUDFLARE_TUNNEL_TOKEN=
```

Prioridad (a definir en F3/F4): env de plataforma como fallback si el tenant no tiene keys propias.

**Pasar el token del tunnel al agente/deploy:** pegar el valor en `.env` (preferido) o en chat de forma puntual; no commitear. Checklist en [DEPLOY.md](./DEPLOY.md) §3.
