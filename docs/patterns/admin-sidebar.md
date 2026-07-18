# Sidebar admin

## Problema

Navegación densa de operación del negocio sin perder contexto.

## Cuándo usarlo

- Todas las pantallas **Admin** y **Empleado** (menú filtrado por rol).  
- Super Admin: variante con tenants.

## Anatomía

```text
Brand / logo
Secciones:
  Operación → Dashboard, Citas, Servicios, Catálogo, Sucursales
  Personas  → Personal, Clientes, Asistencia, Comisiones
  Análisis  → Reportes
  Sistema   → Configuración (subnav)
Footer → vista empleado, super, cerrar sesión
```

**Configuración (subnav):**

- General  
- **Apariencia** (colores de marca)  
- Correo (Resend)  
- Telegram  
- Turnstile  
- Usuarios  
- Citas / prepago  

## Variantes

| Rol | Menú |
|-----|------|
| Admin | Completo |
| Empleado | Agenda, checador, comisiones propias, permisos |
| Super Admin | Tenants + config plataforma |

## Comportamiento

- Ítem activo por ruta.  
- Subnav Config abierto si la ruta es config.  
- Móvil: drawer + backdrop.  
- Admin se **retoca en marcha** (orden/labels) sin rediseñar el shell.

## Accesibilidad

- `nav` landmark.  
- Toggle móvil con `aria-expanded`.  
- Focus trap opcional en drawer.

## Referencias

`mockup/admin/*`, [ROLES_AND_UI.md](../ROLES_AND_UI.md).

## Implementación

`components/admin/AdminSidebar.tsx` + layout `app/admin/layout.tsx`.
