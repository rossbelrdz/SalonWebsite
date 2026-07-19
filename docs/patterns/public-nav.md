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

## Anatomía — dos contextos (no un menú con todo)

El drawer / top bar **cambia** según la zona. No se listan sitio + cuenta + admin
en el mismo cajón.

### Contexto A1 — Sitio (home, servicios, agendar, …)

```text
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  Inicio · Servicios · Sucursales · Agendar · Contacto │
│                         [Entrar|Mi cuenta]  [Agendar]        │
└──────────────────────────────────────────────────────────────┘
 Móvil: [Agendar] [☰] — ☰ solo links del sitio + “Entrar” o “Ir a mi cuenta”
```

### Contexto A2 — Cuenta (`/cuenta`, `/mis-citas`)

```text
┌──────────────────────────────────────────────────────────────┐
│ [Mi espacio]  Mis citas · Mi cuenta     [Sitio] [Salir]     │
└──────────────────────────────────────────────────────────────┘
 Móvil: [Agendar] [☰] — Mis citas · Mi cuenta · Volver al sitio · Salir
          (+ “Paneles” solo si admin/empleado, no el árbol)
```

| Zona | Desktop | Móvil |
|------|---------|--------|
| Links | Solo del **contexto actual** (sitio **o** cuenta) | Igual |
| Acciones sesión | Sitio: Entrar/Mi cuenta + Agendar. Cuenta: Sitio + Salir | **Agendar** siempre junto al ☰; resto en el drawer del contexto |
| Puerta Admin/Empleado | **Solo en menú de cuenta**, una línea | Igual |
| Menú operación admin | **nunca** en Shell A | **nunca** |

## Variantes

| Estado | Chrome |
|--------|--------|
| Anónimo (sitio) | Links sitio + Entrar + Agendar |
| Logueado (sitio) | Links sitio + **Mi cuenta** + Agendar (sin Mis citas/Admin en la barra) |
| Logueado (cuenta) | Links cuenta + Volver al sitio + Salir (+ paneles si aplica) |

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
