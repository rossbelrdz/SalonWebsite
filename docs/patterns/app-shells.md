# App Shells — modelo de navegación (OBLIGATORIO)

> **Contrato de producto.** Si un agente o humano toca menús, layouts o rutas nuevas
> (incluidas F8/F9), **leer esto primero**. Mezclar shells es un bug de diseño, no un
> “mejor UX unificado”.

**Estado:** canónico (2026-07-18).  
**Referencia visual:** `mockup/publico/*`, `mockup/admin/*`, `mockup/empleado/*` (congelado).  
**Implementación:** ver tabla al final.

---

## 1. Regla de oro

Hay **exactamente tres shells** (capas de chrome/navegación). Nunca se combinan en un
solo menú ni se reutiliza el top-nav público dentro de admin/empleado.

```text
┌─────────────────────────────────────────────────────────────┐
│  SHELL A — PÚBLICO / CLIENTE                                │
│  Top bar horizontal  ·  rutas (public)                      │
│  mockup/publico/*  →  app/(public)/*                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SHELL B — ADMIN (negocio + superadmin)                     │
│  Sidebar oscuro + topbar  ·  rutas /admin/*                 │
│  mockup/admin/*  →  app/admin/*                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SHELL C — EMPLEADO                                         │
│  Sidebar oscuro (menú reducido) + topbar  ·  /empleado/*    │
│  mockup/empleado/*  →  app/empleado/*                       │
└─────────────────────────────────────────────────────────────┘
```

| Shell | Chrome | Layout Next | Componente |
|-------|--------|-------------|------------|
| **A Público** | Top nav (`.public-nav`) | `app/(public)/layout.tsx` | `PublicNav` → `PublicNavClient` |
| **B Admin** | Sidebar + topbar (`.admin-shell`) | `app/admin/layout.tsx` | `AdminShell` |
| **C Empleado** | Sidebar + topbar (`.admin-shell`) | `app/empleado/layout.tsx` | `EmpleadoShell` |

---

## 2. Qué va en cada shell

### Shell A — Público / cliente

**Siempre** top bar del sitio. Sirve a visitantes y clientes logueados.

| Enlace / acción | Quién | Notas |
|-----------------|-------|--------|
| Inicio, Servicios, Sucursales, Agendar, Contacto | todos | Navegación del **sitio** |
| Mis citas | sesión | Cliente (también staff que reserva como cliente) |
| Cuenta | sesión | Preferencias personales, MFA, push — **no es admin** |
| Entrar / Agendar (CTA) | anónimo | |
| Salir | sesión | |

**Permitido en el chrome público (solo como “puerta” a otro shell):**

- Un botón/enlace **“Admin”** o **“Ir al panel admin”** si `ADMIN` o superadmin.
- Un botón/enlace **“Mi agenda” / “Empleado”** si staff.

Eso **no** es el menú del panel: no listar Dashboard, Citas, Matriz, Config, etc. en el
top bar ni en el drawer móvil público.

**Prohibido en Shell A:**

- Renderizar `.sidebar` de admin.
- Mezclar secciones “Sitio” + menú privado con ítems de operación.
- Meter el árbol de Configuración / matrices / personal en el nav público.
- Usar `AdminShell` o `EmpleadoShell` en rutas `(public)`.

### Shell B — Admin

**Siempre** sidebar izquierdo (desktop) / drawer desde ☰ (móvil). **Nunca** el top-nav
público como menú principal.

| Zona | Contenido |
|------|-----------|
| Sidebar brand | Logo + “Salon Admin” |
| Secciones | Operación, Personas, Sistema (y futuras F8: Asistencia, Comisiones, Reportes) |
| Footer sidebar | Vista empleado · Mi cuenta · Sitio público · Cerrar sesión |
| Topbar | ☰ (móvil) · título · campanita · badge rol · (opcional) Cuenta |

**Prohibido en Shell B:**

- Montar `PublicNav` encima o dentro del layout admin.
- Duplicar en el topbar los links del sitio (Inicio, Servicios…).
- “Unificar” el menú móvil con el drawer público.

### Shell C — Empleado

**Mismo patrón visual que admin** (`.admin-shell` + `.sidebar`), menú **reducido** al
día del staff. **No** es el `PublicNav`.

| Sidebar (actual / F8) | Notas |
|----------------------|--------|
| Agenda hoy | `/empleado` |
| Solicitar permiso | ancla o ruta dedicada |
| (F8) Mañana, Checador, Mis comisiones | mockup `empleado/*` |
| Footer | Vista admin (si aplica) · Mi cuenta · Sitio público · Salir |

**Prohibido en Shell C:** copiar el menú del sitio público o el árbol completo de admin.

---

## 3. Móvil — misma *forma*, distinto *contenido*

En **los tres shells** el menú denso se oculta y se abre con **hamburguesa ☰** para no
empujar el layout. Eso **no** significa un solo menú compartido.

| Shell | Móvil |
|-------|--------|
| Público | Drawer con **links del sitio** + cuenta + (si aplica) 1–2 puertas a otros shells |
| Admin | El **mismo sidebar** se convierte en drawer; backdrop; se cierra al navegar |
| Empleado | Igual que admin, con el menú de empleado |

**Anti-patrón (ya cometido y prohibido de nuevo):**

> “Para todos los modos uso el mismo PublicNav y le meto Admin + Empleado + matrices.”

Resultado: en `/cuenta` el usuario ve menú público mezclado con área privada → confusión.

---

## 4. Rutas y ownership

| Prefijo / grupo | Shell | Mockup |
|-----------------|-------|--------|
| `app/(public)/*` | A | `mockup/publico/*` |
| `app/admin/*` | B | `mockup/admin/*` |
| `app/empleado/*` | C | `mockup/empleado/*` |
| `app/api/*` | — (sin UI) | — |

### Caso especial: `/cuenta` y `/mis-citas`

Viven en **Shell A** (público). Son **cuenta de persona**, no paneles de operación.

- Cliente: solo chrome público.
- Staff/admin que abre Cuenta: sigue viendo chrome **público**; puede volver al panel
  con la **puerta** “Admin” / “Mi agenda” o con una tarjeta “Accesos de trabajo” en la
  página (no con un sidebar admin inyectado).

### Caso especial: Super Admin

- Panel de plataforma: **Shell B** (`/admin/plataforma`, etc.).
- Bypass de permisos en lógica: sí. **Shell propio “super” con top-nav público: no.**

---

## 5. Diagramas de decisión (para agentes)

```text
¿La pantalla es operación del negocio o plataforma?
  SÍ → Shell B (AdminShell) bajo /admin/*
  NO ↓

¿La pantalla es el día a día del staff (agenda, checador, comisiones propias)?
  SÍ → Shell C (EmpleadoShell) bajo /empleado/*
  NO ↓

¿Es marketing, reserva, login, mis citas, cuenta personal, confirmación, pago?
  SÍ → Shell A (PublicNav) bajo (public)/
```

Al **añadir una pantalla F8/F9**:

1. Asignar shell con la tabla de arriba.  
2. Añadir el ítem **solo** en el sidebar o nav de **ese** shell.  
3. No tocar los otros shells salvo un enlace “puerta” de una palabra.  
4. Actualizar este doc y el mockup map si el menú cambia.

---

## 6. Checklist de PR (UI / navegación)

- [ ] La ruta nueva cae en el layout del shell correcto.  
- [ ] No se importa `PublicNav` dentro de admin/empleado.  
- [ ] No se importa `AdminShell` / `EmpleadoShell` dentro de `(public)`.  
- [ ] El menú móvil del shell solo lista ítems de **ese** shell (+ puertas).  
- [ ] En móvil el drawer no empuja el contenido (overlay).  
- [ ] Se contrastó con la carpeta mockup del área.  
- [ ] Se actualizó [ROLES_AND_UI.md](../ROLES_AND_UI.md) si cambió el árbol de menú.

---

## 7. Implementación (código)

| Pieza | Path |
|-------|------|
| Layout público | `web/src/app/(public)/layout.tsx` |
| Nav público | `web/src/components/PublicNav.tsx`, `PublicNavClient.tsx` |
| Layout admin | `web/src/app/admin/layout.tsx` |
| Shell admin | `web/src/components/AdminShell.tsx` |
| Layout empleado | `web/src/app/empleado/layout.tsx` |
| Shell empleado | `web/src/components/EmpleadoShell.tsx` |
| Toggle ☰ | `web/src/components/MobileMenuToggle.tsx` |
| Estilos | `web/src/app/design-system.css` (`.public-nav`, `.admin-shell`, `.sidebar`, drawers) |
| Tokens / layouts | [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) §5 |
| Menús por rol | [ROLES_AND_UI.md](../ROLES_AND_UI.md) |
| Sidebar detalle | [admin-sidebar.md](./admin-sidebar.md) |
| Nav público detalle | [public-nav.md](./public-nav.md) |

---

## 8. Referencias mockup

- Público: `mockup/publico/home.html` → `<header class="public-nav">`  
- Admin: `mockup/admin/index.html` → `<div class="admin-shell"><aside class="sidebar">`  
- Empleado: `mockup/empleado/agenda.html` → **mismo** `admin-shell` + sidebar reducido (no public-nav)
