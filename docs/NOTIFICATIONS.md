# Notificaciones (Fase 7)

Implementación de la [matriz](./NOTIFICATIONS_MATRIX.md) con **BullMQ + Redis 8**, **Resend** y **Telegram**.

## Arquitectura

```text
App (Next)  --enqueue-->  Redis (BullMQ)  --worker-->  Resend / Telegram API
                |                                          |
                +--> NotificationLog (Postgres)  <---------+
                     (idempotencia + in-app + auditoría)
```

| Pieza | Ubicación |
|-------|-----------|
| Encolar | `web/src/lib/notifications/queue.ts` |
| Eventos de producto | `web/src/lib/notifications/events.ts` |
| Plantillas ES | `web/src/lib/notifications/templates.ts` |
| Worker | `web/worker/index.ts` + `process.ts` |
| Auditoría admin | `/admin/notificaciones` |
| In-app API | `GET /api/notifications` |
| Telegram webhook | `POST /api/telegram/webhook` |

## Colas

| Cola | Uso |
|------|-----|
| `salon-notifications` | Email + Telegram (reintentos 5, backoff exponencial, rate limit 20/s) |
| `salon-system` | Job repetible cada 15 min → recordatorios T-24h / T-2h |

## Canales

| Canal | Cuándo se envía |
|-------|-----------------|
| **EMAIL** | Si hay Resend API key + from email del tenant y destinatario con correo |
| **TELEGRAM** | Bot activo + token + `telegramChatId` del usuario (o chat admin) |
| **IN_APP** | Siempre se registra en `NotificationLog` (sin pasar por red externa) |

Sin credenciales: el job queda **SKIPPED** (no rompe el flujo de citas).

## Eventos cableados

| Evento | Disparador |
|--------|------------|
| `account.created` | Registro |
| `appointment.created` | Cita sin prepago |
| `appointment.prepaid` | Prepago demo o webhook pagado |
| `appointment.cancelled` | Cancelación (+ reembolso si aplica) |
| `appointment.reassignment` | Admin reasigna |
| `appointment.reassignment_accepted` / `rescheduled` / cancel tras reasignación | Cliente elige opción |
| `appointment.reminder_24h` / `_2h` | Worker cada 15 min |
| `absence.requested` | Solicitud de ausencia empleado |
| `payment.refunded` | Tras cancelación con reembolso |

Idempotencia: `eventKey` único (`eventType:entityId:channel:role`).

## Configuración tenant

**Configuración → Correo (Resend)**

- API Key (cifrada)
- From email / name (dominio verificado en Resend)

**Configuración → Telegram**

- Bot token (@BotFather)
- Activo sí/no
- Chat ID admin (avisos operativos)

### Vincular usuario a Telegram

1. Usuario escribe al bot: `/start <userId>`  
2. Webhook guarda `User.telegramChatId`.  
3. Publica webhook:  
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://salon.freonx.org/api/telegram/webhook`

## Recordatorios

Por tenant: `remindHoursBefore` (default 24) y `remindHoursBefore2` (default 2).  
Ventana ±30 min sobre la hora objetivo; no reenvía si ya hay log SENT/QUEUED.

## Variables

| Env | Uso |
|-----|-----|
| `REDIS_URL` | Colas (compose: `redis://redis:6379`) |
| `APP_ENCRYPTION_KEY` | Descifrar secrets en el worker |
| `PUBLIC_APP_URL` | Enlaces en plantillas |
