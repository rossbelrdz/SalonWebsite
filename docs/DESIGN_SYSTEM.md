# Design System

**Estado:** `activo` (Fase 2) — extraído del mockup estático (`mockup/assets/css/main.css`).  
**Aprobación owner (2026-07-15):**

| Área | Decisión |
|------|----------|
| **Cliente / público** | Aprobado — base fija del producto |
| **Admin** | Arrancar con el mockup actual; **retocar en marcha** |
| **Mockup HTML** | Congelado como referencia visual; no bloquea el código |

Fuente de verdad de tokens en código (cuando exista app): CSS variables / theme tokens del tenant.  
Patrones de uso: [patterns/](./patterns/).

---

## 1. Principios

| Principio | Descripción |
|-----------|-------------|
| Moderno | Espaciado generoso, tipografía clara |
| Fresco / juvenil | Energía sin ser infantil ni agresivo |
| Unisex | Sirve barbería y salón; no rosa cliché ni negro-only “barber” |
| Accesible | Contraste WCAG AA en texto principal |
| Eficiente | Admin denso pero claro; cliente ligero y guiado |
| Multi-marca | Cada **tenant** puede personalizar colores clave (ver §8) |

---

## 2. Tokens de color (defaults de plataforma)

Paleta del mockup — **defaults** cuando el tenant no personaliza.

| Token CSS | Hex | Rol |
|-----------|-----|-----|
| `--bg` | `#f6f3ee` | Fondo de página (warm off-white) |
| `--bg-elevated` | `#fffcf8` | Fondo elevado / hover suave |
| `--surface` | `#ffffff` | Cards, inputs, paneles |
| `--ink` | `#14181f` | Texto principal |
| `--ink-muted` | `#5c6570` | Texto secundario |
| `--border` | `#e6e0d6` | Bordes suaves |
| `--border-strong` | `#cfc6b8` | Bordes enfatizados |
| `--primary` | `#1f4d3a` | Marca principal (verde bosque) — botones primarios, sidebar activo |
| `--primary-hover` | `#163829` | Hover primary |
| `--primary-soft` | `#e8f2ec` | Fondos soft / badges |
| `--accent` | `#e36f4a` | CTAs destacados (coral) — “Agendar”, highlights |
| `--accent-hover` | `#cf5a36` | Hover accent |
| `--accent-soft` | `#fdeee8` | Fondos soft accent |
| `--secondary` | `#2f4a6e` | Secundario frío (info, links de apoyo) |
| `--secondary-soft` | `#e8eef6` | Soft secondary |
| `--success` | `#2a9d6a` | Éxito / confirmada |
| `--success-soft` | `#e6f7ef` | |
| `--warning` | `#c9891a` | Advertencia / pendiente |
| `--warning-soft` | `#fff6e5` | |
| `--danger` | `#c23b3b` | Error / cancelar |
| `--danger-soft` | `#fdecec` | |
| `--info` | `#3a7ca5` | Informativo |

### Contraste (objetivo)

- Texto `--ink` sobre `--bg` / `--surface`: OK AA.  
- Botones primary/accent: texto blanco sobre relleno.  
- Al personalizar (tenant), **validar** que primary/accent mantengan contraste ≥ 4.5:1 con blanco o con `--ink` según uso.

---

## 3. Tipografía

| Token | Valor |
|-------|--------|
| `--font` | `"DM Sans", system-ui, -apple-system, sans-serif` |
| `--font-display` | `"Outfit", var(--font)` |

| Escala | Uso |
|--------|-----|
| Display / H1–H2 | Outfit, letter-spacing −0.02em, line-height ~1.15 |
| Body | DM Sans, 1rem, line-height 1.5 |
| Small | 0.875rem |
| Tiny | 0.75rem (badges, meta) |
| Pesos | 400 regular · 500 medium · 600 semibold · 700 bold |

Carga (mockup / app): Google Fonts `DM Sans` + `Outfit`. En prod se puede self-host.

---

## 4. Forma, sombra, layout

| Token | Valor |
|-------|--------|
| `--radius-sm` | 8px |
| `--radius` | 14px |
| `--radius-lg` | 22px |
| `--radius-full` | 999px (botones, chips) |
| `--shadow-sm` | `0 1px 2px rgba(20, 24, 31, 0.05)` |
| `--shadow` | `0 8px 28px rgba(20, 24, 31, 0.08)` |
| `--shadow-lg` | `0 18px 50px rgba(20, 24, 31, 0.12)` |
| `--nav-h` | 72px |
| `--sidebar-w` | 260px |
| `--container` | 1180px |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` |

### Motion

- 150–250 ms en hover/focus.  
- `transform: scale(0.98)` en `:active` de botones.  
- Sin parallax ni animaciones que distraigan en el wizard de citas.

---

## 5. Layouts (tres shells — no mezclar)

> **Contrato:** [patterns/app-shells.md](./patterns/app-shells.md).  
> El mockup define **tres** áreas de chrome. Unificar menús entre ellas es un error.

| Shell | Contexto | Estructura | App | Mockup |
|-------|----------|------------|-----|--------|
| **A** | Cliente / público | **Top nav** (`.public-nav`); drawer ☰ en móvil con *los mismos* links del sitio; `container` max 1180px | `app/(public)/*` | `mockup/publico/*` |
| **B** | Admin (+ superadmin) | **Sidebar** + topbar + content (`.admin-shell`); sidebar drawer en ≤900px | `app/admin/*` | `mockup/admin/*` |
| **C** | Empleado | **Mismo shell visual que B**, menú reducido “Mi día” | `app/empleado/*` | `mockup/empleado/*` |

### Clases CSS de contrato (no renombrar a la ligera)

| Shell | Clases clave |
|-------|----------------|
| A | `.public-nav`, `.nav-links`, `.nav-actions`, `.mobile-nav-drawer` |
| B/C | `.admin-body`, `.admin-shell`, `.sidebar`, `.admin-topbar`, `.admin-content`, `.sidebar-open` |

### Anti-patrones (prohibidos)

- Montar `PublicNav` dentro de admin o empleado.  
- Meter el árbol de operación (Dashboard, Config, matrices…) en el top-nav o drawer público.  
- Un solo componente de menú “para todos los roles” que combine sitio + panel.  
- Empujar el layout con un sidebar fijo en móvil (usar drawer overlay).

Menús por rol: [ROLES_AND_UI.md](./ROLES_AND_UI.md).  
Patrones: [app-shells](./patterns/app-shells.md) · [public-nav](./patterns/public-nav.md) · [admin-sidebar](./patterns/admin-sidebar.md).

---

## 6. Componentes base (contrato)

Implementar en código reutilizando estas clases del mockup como referencia de nombre:

| Componente | Clases / variantes mockup | Patrón |
|------------|---------------------------|--------|
| Button | `.btn` + primary, accent, secondary, ghost, danger, sm, block | — |
| Badge | `.badge` + accent, success, warning, danger, info, neutral | [appointment-status](./patterns/appointment-status.md) |
| Card | `.card`, `.card-body`, `.card-hover`, `.card-selectable` | [service-card](./patterns/service-card.md) |
| Form | `.form-group`, `.form-label`, `.form-hint`, `.form-control`, secret | [secret-fields](./patterns/secret-fields.md) |
| Tabs | `.tabs` / `.tab` + paneles `data-tab-panel` | Config admin |
| Public nav | `.public-nav`, drawer móvil | [public-nav](./patterns/public-nav.md), [app-shells](./patterns/app-shells.md) |
| Sidebar (admin/empleado) | `.sidebar`, `.sidebar-subnav`, groups | [admin-sidebar](./patterns/admin-sidebar.md) |
| Stepper / wizard | pasos de cita | [booking-wizard](./patterns/booking-wizard.md) |
| Time slots | chips de horario | [time-slots](./patterns/time-slots.md) |
| Empty / skeleton | estados vacíos | [empty-states](./patterns/empty-states.md) |
| Theme pickers | color inputs en Config → Apariencia | [brand-theme](./patterns/brand-theme.md) |

Iconografía: **Lucide** (o set único equivalente) en F3 — no mezclar packs.

---

## 7. Dark mode

**No** en v1. La personalización de tenant es sobre la paleta clara (warm).  
Si más adelante: tokens duales `--*-dark` sin romper overrides de marca.

---

## 8. Personalización de marca por tenant (Apariencia)

**Requisito owner:** en **Configuración** poder elegir colores de ciertas piezas.

### 8.1 Qué se puede personalizar (v1)

| Clave | Token afectado | Uso en UI |
|-------|----------------|-----------|
| Color primario | `--primary` (+ hover/soft derivados o guardados) | Botones primary, sidebar activo, links de marca, badges soft |
| Color acento | `--accent` (+ hover/soft) | CTAs “Agendar”, highlights, badges accent |
| (Opcional v1.1) Fondo página | `--bg` | Ambiente del sitio público |
| (Opcional v1.1) Superficie | `--surface` | Cards |

**No** personalizable en v1 (fijos de plataforma para coherencia y a11y):

- `--danger`, `--success`, `--warning` (semántica de estado)  
- Tipografías del sistema  
- Radius / sombras globales  

### 8.2 Dónde se configura

Admin → **Configuración → Apariencia** (nueva pestaña junto a General, Correo, …).

- Selectores de color (input `type="color"` + hex editable).  
- Preview en vivo (botón primary, botón accent, chip).  
- Botón “Restaurar defaults de Salon”.  
- Guardado por `tenant_id` en settings.

Patrón UX: [patterns/brand-theme.md](./patterns/brand-theme.md).  
Modelo de datos orientativo: [CONFIGURATION.md](./CONFIGURATION.md).

### 8.3 Aplicación técnica (F3+)

```text
1. Defaults en CSS :root (plataforma)
2. Tenant settings → theme_primary, theme_accent (hex)
3. Server/layout inyecta <style>:root { --primary: …; --accent: …; }
   o class en <html data-tenant-theme>
4. Derivados (hover/soft): o se guardan, o se calculan (lighten/darken) en servidor
```

Super Admin puede tener defaults de plataforma; cada negocio override.

---

## 9. Mapa mockup → implementación

| Mockup | Shell | App (runtime) |
|--------|-------|----------------|
| `mockup/publico/*` | A top-nav | `web/src/app/(public)/*` + `PublicNav` |
| `mockup/admin/*` | B sidebar | `web/src/app/admin/*` + `AdminShell` |
| `mockup/empleado/*` | C sidebar | `web/src/app/empleado/*` + `EmpleadoShell` |
| `mockup/super/*` | B (ítems plataforma) | `/admin/plataforma` |
| `mockup/assets/css/main.css` | tokens | `web/src/app/design-system.css` + `globals.css` |

El mockup está **congelado** como referencia visual; no es el runtime.  
Al dudar de un menú o layout, **abrir el HTML del mockup del área** y [app-shells](./patterns/app-shells.md).

---

## 10. Checklist Fase 2

- [x] Tokens volcados desde mockup  
- [x] Principios y layouts (**3 shells** documentados)  
- [x] Apariencia / colores por tenant documentada  
- [x] Patterns base en `docs/patterns/` (incl. app-shells, public-nav, admin-sidebar)  
- [x] Admin: iterativo (no bloquea F3)  
- [x] Contrato anti-mezcla de menús (2026-07-18)  
- [ ] Checklist contraste formal al implementar componentes en código (F3)  

**Criterio de salida F2:** se puede implementar UI en Next sin reinventar estilos ni flujos clave.  
**Regresión a evitar:** unificar nav público con sidebar admin “por comodidad móvil”.
