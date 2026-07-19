# Sidebar admin / empleado — Shells B y C

## Problema

Navegación densa de **operación** (negocio o día del staff) sin perder contexto y sin
mezclarse con el sitio público.

## Cuándo usarlo

| Shell | Rutas | Componente |
|-------|--------|------------|
| **B Admin** | `/admin/*` | `AdminShell` |
| **C Empleado** | `/empleado/*` | `EmpleadoShell` |

Ambos reutilizan el **mismo esqueleto CSS** (`.admin-shell`, `.sidebar`, `.admin-topbar`)
con **distinto árbol de enlaces**. Ver contrato: [app-shells.md](./app-shells.md).

## Cuándo NO usarlo

- Rutas públicas / cliente → [public-nav.md](./public-nav.md)  
- No montar este sidebar “encima” del PublicNav  
- No listar el árbol admin dentro del drawer del sitio  

## Anatomía (Admin — Shell B)

```text
┌──────────────────┬─────────────────────────────┐
│  LOGO Admin      │  ☰ (móvil)  Topbar          │
│                  ├─────────────────────────────┤
│  Operación       │                             │
│   Dashboard      │     Contenido               │
│   Citas          │                             │
│   Servicios      │                             │
│   Sucursales     │                             │
│  Personas        │                             │
│   Personal       │                             │
│   Clientes       │                             │
│  Sistema         │                             │
│   Notifs / matrices / Config / Plataforma*     │
│  ──────────────  │                             │
│  Vista empleado  │                             │
│  Mi cuenta       │                             │
│  Sitio público   │                             │
│  Cerrar sesión   │                             │
└──────────────────┴─────────────────────────────┘
* Plataforma: solo superadmin
```

### Empleado (Shell C) — menú reducido

```text
Mi día
  Agenda hoy
  Solicitar permiso
  (F8: Mañana, Checador, Mis comisiones)
Footer: Vista admin? · Mi cuenta · Sitio público · Salir
```

Mockup: `mockup/empleado/agenda.html` usa **admin-shell + sidebar**, no public-nav.

## Variantes por rol

| Ítem | Super Admin | Admin | Empleado |
|------|:-----------:|:-----:|:--------:|
| Dashboard / operación completa | ✅ | ✅ | ❌ |
| Plataforma | ✅ | ❌ | ❌ |
| Agenda propia (shell C) | puerta | puerta | ✅ |
| Config / matrices | ✅* | ✅* | ❌ |

\* Según matriz RBAC en DB (`/admin/permisos`); superadmin bypasea en lógica.

Detalle de menú y config: [ROLES_AND_UI.md](../ROLES_AND_UI.md).

## Comportamiento

- Ítem activo por ruta (`/admin` exacto; resto `startsWith`).  
- Desktop: sidebar sticky a la izquierda.  
- **Móvil (≤900px):** sidebar off-canvas; ☰ en topbar; backdrop; no empuja el grid.  
- Al cambiar de ruta se cierra el drawer.  
- Escape cierra el drawer.  
- Footer: **puertas** a otros shells (empleado, sitio, cuenta), no el menú completo del otro shell.

## Accesibilidad

- Landmark `nav` en sidebar.  
- Toggle ☰: `aria-expanded`, `aria-controls` apuntando al `id` del aside.  
- Backdrop clicable con `aria-label="Cerrar menú"`.

## Referencias

- `mockup/admin/*`, `mockup/empleado/*`  
- [app-shells.md](./app-shells.md), [ROLES_AND_UI.md](../ROLES_AND_UI.md)  
- CSS: `web/src/app/design-system.css` (bloque Admin shell)

## Implementación

| Pieza | Path |
|-------|------|
| Admin shell | `web/src/components/AdminShell.tsx` |
| Admin layout | `web/src/app/admin/layout.tsx` |
| Empleado shell | `web/src/components/EmpleadoShell.tsx` |
| Empleado layout | `web/src/app/empleado/layout.tsx` |
| Toggle | `web/src/components/MobileMenuToggle.tsx` |

`AdminSidebar.tsx` está **deprecated** (reexport de `AdminShell`).
