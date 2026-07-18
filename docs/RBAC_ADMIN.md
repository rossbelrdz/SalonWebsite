# Matrices en Admin (permisos + notificaciones)

Las matrices de producto ya **no viven solo en markdown**: se persisten por tenant y se editan en el panel.

## Dónde

| Pantalla | Ruta | Permiso requerido |
|----------|------|-------------------|
| Matriz de permisos | `/admin/permisos` | `tenant.permissions.edit` |
| Matriz de notificaciones | `/admin/matriz-notificaciones` | `tenant.notifications.matrix` |
| Log de envíos | `/admin/notificaciones` | `admin.notifications.log` |

Sidebar → **Sistema**.

## Permisos

- Catálogo de claves: `web/src/lib/rbac/catalog.ts` (`PERMISSION_CATALOG`).
- Valores por rol: tabla `RolePermission` (`roleCode` × `permissionKey` × `allowed`).
- Evaluación: `can(session, key)` / `requirePermission(key)`.
- Defaults: `DEFAULT_PERMISSIONS` (alineados a `PERMISSIONS_MATRIX.md`).
- Botón **Restaurar defaults** en la UI.

Roles configurables en matriz: `ADMIN`, `EMPLOYEE`, `CLIENT`.

### Super Admin (regla fija)

- Usuario con `isSuperAdmin=true` **siempre** pasa `can()` / `requirePermission()` (bypass total).
- En la UI de permisos, la columna Super Admin va **marcada y deshabilitada**.
- La API **ignora** cualquier intento de quitar permisos a `SUPER_ADMIN` y reafirma `allowed: true`.

## Notificaciones

- Eventos y audiencias: `NOTIF_EVENT_CATALOG` + `NOTIF_AUDIENCES`.
- Valores: tabla `NotificationMatrixRule` (email / telegram / inApp / push).
- Envíos: `dispatchChannels` lee la matriz y aplica preferencias del usuario.
- Defaults: `DEFAULT_NOTIFICATION_MATRIX` (alineados a `NOTIFICATIONS_MATRIX.md`).

## Notas

- Caché en memoria ~30s (`clearPermissionCache` / `clearNotificationMatrixCache` al guardar).
- El markdown de docs sigue como **referencia de producto**; la fuente operativa es la DB + UI.
- Nuevas capacidades de código: agregar clave al catálogo y re-seed (o fila al guardar en UI tras actualizar catálogo).
