# Fases del proyecto

Avance ordenado. **No saltar fases** sin acuerdo.  
Estado: `pendiente` | `en_curso` | `hecha` | `bloqueada`

**Actualización owner (2026-07-16):**

- Cliente/público mockup: **aprobado**.  
- Admin: base OK; se retoca en marcha.  
- Mockup HTML: **congelado** (referencia).  
- F3–F7 implementadas en app Next (`web/`) + Docker.  
- Pasarelas: Mercado Pago, PayPal, Clip (selector superadmin).  
- Notificaciones: BullMQ + Resend + Telegram.

---

## Fase 0 — Documentación y alineación

**Estado:** `hecha`  
**Criterio:** alcance documentado. ✅

---

## Fase 1 — Mockup estático (UI)

**Estado:** `hecha`  
**Criterio:** mockup congelado; cliente OK; admin base. ✅

---

## Fase 2 — Design System + Pattern Library

**Estado:** `hecha`  
**Criterio:** tokens + patterns + apariencia tenant. ✅

---

## Fase 3 — Fundaciones técnicas (Docker + app shell)

**Estado:** `hecha` (release `0.5.0`)

### Entregables

- [x] Next.js App Router en `web/`  
- [x] `docker-compose`: app, worker, postgres:18, redis:8, minio  
- [x] Servicio `tunnel` (perfil `tunnel`) + token en `.env`  
- [x] Healthcheck `/api/health`  
- [x] CSS Design System + theme por tenant  
- [x] Layouts público + admin sidebar  
- [x] Schema Prisma multi-tenant + seed demo  

**Criterio:** `docker compose up` levanta el stack. ✅  
**Local:** http://localhost:3010 (puerto 3000 ocupado por otro proyecto del host)

---

## Fase 4 — Auth, roles y configuración

**Estado:** `hecha` (incluida en `0.5.0`)

### Entregables

- [x] Registro/login (nombre + email **o** celular)  
- [x] Roles: Super Admin, Admin, Empleado, Cliente (sesión JWT cookie)  
- [x] Guards en admin/empleado  
- [x] Config: General, **Apariencia**, Correo, Telegram, Turnstile, Usuarios, Citas/prepago  
- [x] Secretos cifrados en DB (`APP_ENCRYPTION_KEY`)  
- [x] Alta/baja usuarios del tenant  

**Pendiente / F7:** envío real Resend/Telegram y Turnstile en formularios públicos.

---

## Fase 5 — Catálogo, sucursales y citas (core)

**Estado:** `hecha` (incluida en `0.5.0`)

### Entregables

- [x] Servicios CRUD admin + catálogo público  
- [x] Sucursales CRUD + listado/mapa mock público  
- [x] Personal (perfiles, sucursales, servicios, horarios en seed)  
- [x] Wizard de cita real (slots por profesional)  
- [x] Confirmación + mis citas + cancelación cliente/admin  
- [x] Prepago **stub** (supersedido por F6)

---

## Fase 6 — Prepago, descuentos y reembolsos

**Estado:** `hecha` (release `0.6.0`)

### Entregables

- [x] Pasarela multi-proveedor: **Mercado Pago**, **PayPal**, **Clip.mx**  
- [x] Superadmin elige proveedor activo (`/admin/plataforma`)  
- [x] Admin tenant configura credenciales (`Configuración → Pagos`)  
- [x] Políticas de reembolso (horas full / parcial % / none)  
- [x] Reasignación + 3 opciones del cliente  
- [x] Candados de ausencias con prepagadas  
- [x] Webhooks + flujo demo si no hay keys  

Detalle: [PAYMENTS.md](./PAYMENTS.md)

---

## Fase 7 — Notificaciones (cola + canales)

**Estado:** `hecha` (release `0.7.0`)

- [x] BullMQ real (worker + colas)  
- [x] Resend + matriz de eventos  
- [x] Telegram bot + webhook vincular chat  
- [x] Rate limit / reintentos / idempotencia  
- [x] Recordatorios T-24h / T-2h  

Detalle: [NOTIFICATIONS.md](./NOTIFICATIONS.md)

---

## Fase 8 — Operación del personal

**Estado:** `pendiente` ← **siguiente de producto**

- [ ] Checador  
- [ ] Comisiones  
- [ ] Reportes  

---

## Fase 9 — Hardening, deploy y Tunnel

**Estado:** `en_curso` parcial (tunnel cableado; hardening pendiente)

- [x] Tunnel compose + token  
- [ ] Backups, políticas MinIO, checklist prod  
- [ ] Release `1.0.0`  

---

## Diagrama

```text
F0–F2 docs/UI ✅
F3 Docker/Next ✅
F4 Auth/Config ✅
F5 Citas core ✅
F6 Prepago / reembolsos / reasignación ✅
F7 Notificaciones ✅
  → F8 Personal  ← siguiente
  → F9 Hardening
```

## Cómo correr

```bash
# desde la raíz del repo
docker compose up -d --build

# con tunnel público salon.freonx.org
docker compose --profile tunnel up -d

# URL local (este entorno)
open http://localhost:3010
```

### Usuarios demo (seed)

| Usuario | Password | Rol |
|---------|----------|-----|
| admin@salon.local | demo1234 | Admin |
| empleado@salon.local | demo1234 | Empleado |
| cliente@salon.local | demo1234 | Cliente |
| super@salon.local | demo1234 | Super Admin |
