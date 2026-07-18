# Arquitectura

Documento vivo. Detalle de producto en [PRODUCT.md](./PRODUCT.md). Stack pinneado en [STACK.md](./STACK.md).

---

## 1. Vista de contexto

```text
                    ┌─────────────────────┐
                    │  Clientes / Empleados│
                    │  Admin / Super Admin │
                    └──────────┬──────────┘
                               │ HTTPS
                    ┌──────────▼──────────┐
                    │ Cloudflare Tunnel   │  salon.freonx.org
                    │ (+ Turnstile en UI) │  (deploy / exposición)
                    └──────────┬──────────┘
                               │  → cloudflared → http://app:3000
┌──────────────────────────────▼──────────────────────────────┐
│                     Docker network                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Next.js    │  │ PostgreSQL │  │ Redis 8 │  │ MinIO   │  │
│  │ (app+API)  │──│ 18.x       │  │         │  │ media   │  │
│  └─────┬──────┘  └────────────┘  └────▲────┘  └─────────┘  │
│        │                              │                     │
│        │         ┌────────────────────┴──────┐              │
│        └────────►│ Workers BullMQ            │              │
│                  │ (email, notif, jobs)      │              │
│                  └────────────┬──────────────┘              │
│  (opcional) tunnel = cloudflared  [perfil Compose: tunnel]  │
└───────────────────────────────┼─────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
         Resend.com      Telegram Bot API    (pagos futuro)

Hostname público y env del tunnel: [DEPLOY.md](./DEPLOY.md).
```

---

## 2. Estilo arquitectónico

| Decisión | Elección |
|----------|----------|
| Tipo | Monolito modular **Next.js** (App Router) + workers separados en el mismo compose |
| Multi-tenancy | **Tenant por negocio** (`business_id` / `tenant_id` en tablas) |
| Sucursales | N sucursales por tenant |
| API | Route Handlers / Server Actions (a definir en F3); validación de permisos en servidor |
| Colas | BullMQ sobre Redis 8 |
| Objetos | MinIO (S3-compatible) |
| Email | Resend (async vía cola) |
| Bot | Telegram (webhook o long-polling en worker) |

---

## 3. Contenedores (objetivo)

| Servicio | Rol |
|----------|-----|
| `app` | Next.js (UI + API) |
| `worker` | Procesos BullMQ (emails, notificaciones, jobs) |
| `postgres` | PostgreSQL 18.x (imagen oficial pinneada) |
| `redis` | Redis 8 (BullMQ) |
| `minio` | Almacenamiento de medios |
| (opcional) `tunnel` | `cloudflared` con `CLOUDFLARE_TUNNEL_TOKEN`; perfil Compose `tunnel` |

Todo el desarrollo corre con **Docker Desktop** localmente.  
Deploy / demo: `https://salon.freonx.org` vía tunnel ([DEPLOY.md](./DEPLOY.md)).

---

## 4. Dominios principales (módulos lógicos)

```text
identity/          usuarios, sesiones, roles
tenancy/           negocios, sucursales
catalog/           servicios, categorías, estilos, media
scheduling/        disponibilidad, citas, reasignación
payments/          prepago, descuentos, reembolsos (F6)
staff/             checador, horarios, comisiones
notifications/     matriz, colas, Resend, Telegram
admin-config/      tokens, parámetros, usuarios
reports/           KPIs admin / empleado
```

Cada módulo debe respetar **aislamiento por tenant**.

---

## 5. Modelo multi-tenant (simplificado)

```text
Platform
  └── Super Admin
  └── Business (tenant)
        ├── Admin(s)
        ├── Branches (sucursales)
        ├── Employees (+ horarios, comisiones)
        ├── Services / Catalog
        ├── Clients
        ├── Appointments
        └── Settings (Resend, Telegram, Turnstile keys de tenant o plataforma*)
```

\* Keys de plataforma vs por-tenant: ver [CONFIGURATION.md](./CONFIGURATION.md).

---

## 6. Seguridad (resumen)

- Validación de permisos **siempre en servidor** (matriz en [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)).  
- Turnstile en formularios públicos y sensibles.  
- Secrets no en git; preferir env / secret store; tokens de integración en DB cifrados o vault.  
- Auditoría de librerías y pin de versiones mayores estables.  

Detalle: [SECURITY.md](./SECURITY.md).

---

## 7. Notificaciones

Flujo típico:

```text
Evento de dominio → publica job BullMQ → worker → canal (email / Telegram / in-app)
                 ↘ consulta matriz de notificaciones (quién / qué canal)
```

Matriz: [NOTIFICATIONS_MATRIX.md](./NOTIFICATIONS_MATRIX.md).

---

## 8. Frontend (admin)

- Layout admin con **sidebar izquierdo** fijo/colapsable.  
- Secciones: Dashboard, Citas, Servicios, Sucursales, Personal, Clientes, Reportes, Configuración.  
- Design System post-mockup: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

---

## 9. Decisiones abiertas (no bloquean F1)

| Tema | Notas |
|------|--------|
| Proveedor de auth de sesión | Credenciales propias vs proveedor externo |
| Pasarela de pagos | A definir en F6 |
| Cifrado de tokens en DB | AES-GCM con key en env vs vault |
| Mapa (provider) | Mapbox / Google / Leaflet OSM |

---

## 10. Principios

1. **Tenant isolation first.**  
2. **Disponibilidad real del profesional** es la fuente de verdad de la agenda.  
3. **Jobs asíncronos** para todo lo que hable con terceros (email, Telegram).  
4. **Minimal client PII** hasta el pago.  
5. **Documentación referenciada**, no monolitos de contexto.
