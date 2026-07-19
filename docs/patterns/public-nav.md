# Nav público (top bar) — Shell A

## Problema

Navegación del **sitio del salón** (cliente/visitante) sin confundirla con paneles
privados de operación.

## Cuándo usarlo

- Todas las rutas bajo `app/(public)/*`: home, servicios, sucursales, agendar, contacto,
  login, mis-citas, cuenta, confirmación, pago, reasignación.
- **Único** chrome de esas páginas.

## Cuándo NO usarlo

- `/admin/*` → [admin-sidebar](./admin-sidebar.md) / [app-shells](./app-shells.md)  
- `/empleado/*` → `EmpleadoShell`  
- No como “menú universal” multi-rol

## Anatomía

```text
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  Inicio · Servicios · Sucursales · Agendar · Contacto │
│                              [Mis citas]  [Cuenta|Entrar] CTA│
└──────────────────────────────────────────────────────────────┘
 Móvil: logo | campanita | ☰  → drawer con los MISMOS links del sitio
```

| Zona | Desktop | Móvil |
|------|---------|--------|
| Links sitio | fila en barra | lista en drawer |
| Acciones sesión | botones a la derecha | en el drawer |
| Puerta a Admin/Empleado | 1 botón secundario máx. por área | enlace “Ir al panel…” al final, no árbol de menú |
| Menú operación (citas admin, config…) | **nunca** | **nunca** |

## Variantes

| Estado | Chrome |
|--------|--------|
| Anónimo | Links sitio + Entrar + Agendar |
| Cliente | + Mis citas + Cuenta + Salir (+ campanita) |
| Staff en sitio público | Igual que cliente + puerta “Admin” y/o “Mi agenda” |

## Comportamiento

- Sticky top; altura `--nav-h`.  
- Ítem activo por pathname.  
- Móvil: drawer overlay (no empuja layout); Escape / backdrop / navegación cierran.  
- `/cuenta` y `/mis-citas` **permanecen** en este shell (cuenta personal).

## Accesibilidad

- `<nav aria-label="Sitio público">`  
- Toggle con `aria-expanded` / `aria-controls`  
- Drawer `role="dialog"` + `aria-modal` cuando abierto  

## Referencias

- Mockup: `mockup/publico/home.html`, resto de `mockup/publico/*`  
- Contrato shells: [app-shells.md](./app-shells.md)  
- Tokens: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)

## Implementación

- `web/src/components/PublicNav.tsx` (server: sesión)  
- `web/src/components/PublicNavClient.tsx` (cliente: pathname, drawer)  
- `web/src/app/(public)/layout.tsx`  
- Clases: `.public-nav`, `.nav-links`, `.mobile-nav-drawer`, …
