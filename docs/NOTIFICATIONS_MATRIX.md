# Matriz de notificaciones

Define **quién** recibe **qué**, por **qué canal**, cuando ocurre un evento.

Canales previstos:

| Código | Canal |
|--------|--------|
| `email` | Resend (vía BullMQ) |
| `telegram` | Bot Telegram (si el tenant lo tiene activo y el usuario vinculado) |
| `in_app` | Campana / centro de notificaciones en la app |
| `sms` | Futuro (no prioritario) |

Preferencias: un usuario puede desactivar canales no críticos cuando exista UI de preferencias.  
Eventos **transaccionales críticos** (confirmación de cita, reasignación, reembolso) no deberían poder silenciarse del todo en el canal principal (email o el que usó para registrarse).

---

## 1. Matriz evento × destinatario

Leyenda de celdas: canales por defecto (`email`, `telegram`, `in_app`).  
`—` = no aplica.

| Evento | Cliente | Empleado afectado | Admin tenant | Super Admin |
|--------|---------|-------------------|--------------|-------------|
| Cuenta creada (cliente) | email, in_app | — | — | — |
| Cuenta creada (empleado) | — | email, in_app | in_app | — |
| Cita creada / confirmada | email, telegram*, in_app | email, telegram*, in_app | in_app (opcional digest) | — |
| Cita recordatorio (T-24h / T-2h) | email, telegram* | in_app | — | — |
| Cita cancelada por cliente | email, in_app | email, in_app | in_app | — |
| Cita cancelada por empleado/admin | email, telegram*, in_app | in_app | in_app | — |
| Reasignación propuesta | email, telegram*, in_app | in_app (nuevo staff) | in_app | — |
| Cliente acepta reasignación | email, in_app | email, in_app (ambos staff si aplica) | in_app | — |
| Cliente reagenda | email, in_app | email, in_app | in_app | — |
| Cliente cancela tras reasignación | email, in_app | in_app | in_app | — |
| Prepago exitoso | email, in_app | — | in_app (opcional) | — |
| Reembolso iniciado / completado | email, in_app | — | email, in_app | — |
| Solicitud de permiso empleado | — | in_app | email, in_app | — |
| Permiso aprobado / rechazado | — | email, in_app | — | — |
| Fallo envío email (ops) | — | — | in_app | in_app (opcional) |
| Nuevo tenant creado | — | — | email | in_app, email |

\* `telegram` solo si bot configurado y usuario con chat vinculado.

---

## 2. Prioridad y cola

| Prioridad | Ejemplos | Comportamiento cola |
|-----------|----------|---------------------|
| Alta | Reasignación, reembolso, cancelación día-de | Job inmediato, más reintentos |
| Normal | Confirmación de cita, cuenta creada | Job inmediato |
| Baja | Recordatorios, digests admin | Programable (delay) |

Todos los envíos externos pasan por **BullMQ + Redis 8** (ver [STACK.md](./STACK.md)).

---

## 3. Contenido mínimo por tipo (español)

| Tipo | Debe incluir |
|------|----------------|
| Confirmación cita | Sucursal, servicio, profesional, fecha, hora, política cancelación |
| Reasignación | Motivo breve, nuevo profesional (si ya asignado), 3 acciones (aceptar / reagendar / cancelar) + enlaces |
| Reembolso | Monto, referencia, tiempo estimado |
| Recordatorio | Mismos datos de la cita + cómo cancelar/reagendar |

---

## 4. Anti-spam y buena reputación

- No enviar el mismo evento más de una vez (idempotencia por `event_id`).  
- Agrupar digests admin si el volumen es alto.  
- Backoff en fallos Resend/Telegram.  
- Dead-letter + alerta admin.  
- Turnstile reduce bots que generan citas falsas y correos basura.

---

## 5. Configurabilidad futura

En Configuración del tenant se podrá:

- Activar/desactivar Telegram.  
- Elegir si Admin recibe email por cada cita o solo resumen diario.  
- Plantillas (fase posterior).

La matriz de esta página es el **default de producto** hasta que exista UI de preferencias.
