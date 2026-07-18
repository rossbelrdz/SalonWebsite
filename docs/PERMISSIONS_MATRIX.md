# Matriz de permisos

Leyenda:

| Símbolo | Significado |
|---------|-------------|
| ✅ | Permitido |
| ⚠️ | Permitido con restricciones (mismas reglas de negocio) |
| ❌ | Denegado |
| 🔧 | Solo Super Admin de plataforma |

Ámbitos:

- **Plataforma:** cross-tenant  
- **Tenant:** un negocio  
- **Propio:** solo recursos del usuario  

La autorización se evalúa **en servidor**. Esta matriz es la fuente de verdad de producto; el código debe alinearse a ella.

---

## 1. Roles

| Rol | Código | Ámbito |
|-----|--------|--------|
| Super Admin | `super_admin` | Plataforma |
| Admin | `admin` | Un tenant (negocio) |
| Empleado | `employee` | Sucursal(es) del tenant |
| Cliente | `client` | Sus propios datos y citas |

Un usuario puede tener membership a un tenant con un rol. Super Admin es global.

---

## 2. Matriz por capacidad

### Plataforma y tenants

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Listar todos los negocios | ✅ | ❌ | ❌ | ❌ |
| Crear / suspender negocio | ✅ | ❌ | ❌ | ❌ |
| Impersonar / soporte tenant | ⚠️ | ❌ | ❌ | ❌ |
| Config global de plataforma | 🔧 | ❌ | ❌ | ❌ |

### Configuración del negocio

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Ver configuración del tenant | ✅* | ✅ | ❌ | ❌ |
| Editar tokens Resend / Telegram / Turnstile | ✅* | ✅ | ❌ | ❌ |
| Parámetros prepago / descuentos | ✅* | ✅ | ❌ | ❌ |

\* Super Admin solo en contexto de soporte o si opera el tenant.

### Usuarios

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Alta/baja Admin del tenant | ✅* | ✅ | ❌ | ❌ |
| Alta/baja Empleados | ✅* | ✅ | ❌ | ❌ |
| Alta/baja Clientes | ✅* | ✅ | ❌ | ⚠️ (auto-baja propia) |
| Editar propio perfil | ✅ | ✅ | ✅ | ✅ |
| Asignar roles dentro del tenant | ✅* | ✅ | ❌ | ❌ |

### Catálogo y sucursales

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| CRUD servicios / catálogo / media | ⚠️ | ✅ | ❌ | ❌ |
| CRUD sucursales | ⚠️ | ✅ | ❌ | ❌ |
| Ver catálogo / sucursales públicas | ✅ | ✅ | ✅ | ✅ |

### Citas

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Crear cita (como cliente) | ❌ | ❌ | ❌ | ✅ |
| Ver todas las citas del tenant | ⚠️ | ✅ | ❌ | ❌ |
| Ver citas propias (empleado) | ⚠️ | ✅ | ✅ | ❌ |
| Ver citas propias (cliente) | ⚠️ | ✅ | ⚠️** | ✅ |
| Cancelar cita ajena del tenant | ⚠️ | ✅ | ⚠️ | ❌ |
| Cancelar propia cita | ⚠️ | ✅ | ⚠️ | ✅ |
| Reasignar profesional | ⚠️ | ✅ | ❌ | ❌ |
| Responder reasignación (aceptar/reagendar/cancelar) | ❌ | ❌ | ❌ | ✅ |

\*\* Empleado ve datos de cliente de **sus** citas (mínimos necesarios), no el padrón completo salvo permiso futuro.

### Prepago / reembolsos

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Iniciar prepago | ❌ | ❌ | ❌ | ✅ |
| Ver pagos del tenant | ⚠️ | ✅ | ❌ | ❌ |
| Ejecutar / aprobar reembolso | ⚠️ | ✅ | ❌ | ❌ |
| Ver propios pagos | ❌ | ❌ | ❌ | ✅ |

### Personal y operación

| Capacidad | Super Admin | Admin | Empleado | Cliente |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Checador propio | ❌ | ⚠️ | ✅ | ❌ |
| Ver asistencia de todos | ⚠️ | ✅ | ❌ | ❌ |
| Solicitar permiso / ausencia | ❌ | ⚠️ | ⚠️ | ❌ |
| Aprobar ausencia / forzar reasignación | ⚠️ | ✅ | ❌ | ❌ |
| Ver comisiones propias | ❌ | ✅ | ✅ | ❌ |
| Ver comisiones de todos | ⚠️ | ✅ | ❌ | ❌ |
| Reportes del tenant | ⚠️ | ✅ | ⚠️ (propios) | ❌ |

### Restricciones de negocio (todas las roles)

| Regla | Descripción |
|-------|-------------|
| Citas prepagadas | Cancelación/ausencia disparan flujo de reasignación o reembolso; no “borrar y ya” |
| Disponibilidad | Nadie agenda sobre slot ocupado o fuera de horario del profesional |
| Tenant isolation | Admin/Empleado/Cliente nunca cruzan tenants |

---

## 3. Extensibilidad

- La matriz puede bajar a **permisos granulares** (`appointments:write`, `config:tokens`, …) en DB.  
- Roles predefinidos son **paquetes de permisos**.  
- Cambios a esta matriz = cambio de producto → documentar en CHANGELOG si afecta release.

---

## 4. Implementación (recordatorio F4)

1. Middleware / guards por ruta y Server Action.  
2. Tests: tabla de casos rol × acción.  
3. UI: ocultar acciones no permitidas **y** rechazar en API.
