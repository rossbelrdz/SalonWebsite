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
| Destinos Telegram | `TelegramTarget` + `/api/admin/telegram-targets` |
| Matriz admin | `/admin/matriz-notificaciones` |
| Auditoría admin | `/admin/notificaciones` |
| In-app API | `GET /api/notifications` |
| Telegram webhook | `POST /api/telegram/webhook` |

## Colas

| Cola | Uso |
|------|-----|
| `salon-notifications` | Email + Telegram + Push (reintentos 5, backoff exponencial) |
| `salon-system` | Job repetible cada 15 min → recordatorios T-24h / T-2h |

## Canales

| Canal | Cuándo se envía |
|-------|-----------------|
| **EMAIL** | Resend API key + from del tenant y destinatario con correo |
| **TELEGRAM** | Bot activo + token + destino resuelto (usuario vinculado y/o `TelegramTarget`) |
| **IN_APP** | `NotificationLog` (campanita; sin red externa) |
| **PUSH** | Web Push VAPID + suscripción del usuario |

Sin credenciales: el job queda **SKIPPED** (no rompe el flujo de citas).

## Enrutado Telegram (matriz × destinos)

Por regla de matriz (`NotificationMatrixRule`):

| `telegramMode` | Destinos |
|----------------|----------|
| `USER_LINKED` (default) | `User.telegramChatId` del destinatario |
| `TARGETS` | IDs en `telegramTargetIds`, o targets `isDefaultOps`, o fallback `telegramAdminChatId` |
| `BOTH` | Usuario vinculado **y** targets operativos |

Cada destino genera un `eventKey` único (anti-duplicado). Topics de supergrupo: `messageThreadId` en el target y en el job del worker.

Defaults de seed: CLIENT/EMPLOYEE → `USER_LINKED`; ADMIN en ausencia/cancelación con telegram → `TARGETS`.

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

Idempotencia: `eventKey` único (`eventType:entityId:channel:role[:destino]`).

## Plantillas de correo (ejemplos)

Textos reales en `web/src/lib/notifications/templates.ts`. Resumen:

| Plantilla | Subject (ej.) | Contenido clave |
|-----------|---------------|-----------------|
| `tplAccountCreated` | Bienvenido a {tenant} | Saludo, correo, link agendar |
| `tplAppointmentCreated` | Cita confirmada: {servicio} | Servicio, sucursal, profesional, fecha, total; política de cancelación (horas de reembolso); link mis-citas |
| `tplAppointmentPrepaid` | Prepago recibido: {servicio} | Igual que confirmación, marcada prepagada |
| `tplAppointmentCancelled` | Cita cancelada: {servicio} | Quién canceló, fecha, reembolso si aplica, link agendar |
| `tplReassignment` | Acción requerida: reasignación de cita | Profesional actual/propuesto, nota, link decisión |
| `tplReminder` | Recordatorio (~24 h / ~2 h): {servicio} | Resumen + link ver/cancelar |
| `tplRefund` | Reembolso de cita: {monto} | Monto, servicio, fecha, **ID de cita**, nota de acreditación |
| `tplStaffAppointment` | {headline}: {servicio} | Cliente, servicio, fecha, sucursal |
| `tplAbsenceAdmin` | Solicitud de ausencia / bloqueada | Empleado, rango, candado prepago |

Si hay nombre de tenant, se usa en saludo/asunto cuando aplica.

## Configuración tenant

**Configuración → Correo (Resend)**

- API Key (cifrada)
- From email / name (dominio verificado en Resend)

**Configuración → Telegram**

- Bot token (@BotFather), activo sí/no
- Catálogo de destinos: label, kind (GROUP/CHANNEL), chatId, threadId opcional, default ops
- Chat ID admin legacy (fallback)

### Vincular usuario a Telegram

1. Usuario escribe al bot: `/start <userId>`  
2. Webhook guarda `User.telegramChatId`.  
3. Publica webhook:  
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://salon.freonx.org/api/telegram/webhook`

## Recordatorios

Por tenant: `remindHoursBefore` (default 24) y `remindHoursBefore2` (default 2).  
Ventana ±30 min sobre la hora objetivo; no reenvía si ya hay log SENT/QUEUED.

## Variables (infra)

| Env | Uso |
|-----|-----|
| `REDIS_URL` | Colas (compose: `redis://redis:6379`) |
| `APP_ENCRYPTION_KEY` | Descifrar secrets en el worker |
| `PUBLIC_APP_URL` | Enlaces en plantillas |

Credenciales Resend/Telegram/Turnstile: **DB por tenant**, no env. Ver [CONFIGURATION.md](./CONFIGURATION.md).
