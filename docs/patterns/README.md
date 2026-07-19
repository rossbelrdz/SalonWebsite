# Pattern Library

Catálogo de **patrones de UI y UX** reutilizables.

**Estado:** activo — base del mockup + decisiones de producto.  
Design tokens: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).  
**Shells / navegación (leer primero):** [app-shells.md](./app-shells.md).

---

## Cómo usar

1. **Antes de tocar menús o layouts:** [app-shells.md](./app-shells.md) (contrato obligatorio).  
2. Leer el patrón del flujo **antes** de inventar UI nueva.  
3. En código, el componente real se enlaza al final de cada archivo.  
4. Si cambia un patrón, actualizar el doc **en el mismo cambio** (PR / commit).  
5. Admin se puede retocar en marcha; **no** se puede “unificar” shells.

---

## Índice

### Estructura de app (prioridad máxima)

| Patrón | Archivo | Notas |
|--------|---------|--------|
| **App shells (3 áreas)** | [app-shells.md](./app-shells.md) | **Canónico** — no mezclar público / admin / empleado |
| Nav público (top bar) | [public-nav.md](./public-nav.md) | Shell A |
| Sidebar admin / empleado | [admin-sidebar.md](./admin-sidebar.md) | Shells B y C |

### Flujos y componentes

| Patrón | Archivo | Prioridad app |
|--------|---------|---------------|
| Wizard de cita | [booking-wizard.md](./booking-wizard.md) | Core F5 |
| Apariencia / colores de marca | [brand-theme.md](./brand-theme.md) | F4 (config) |
| Card de servicio | [service-card.md](./service-card.md) | F5 |
| Selector de profesional | [staff-picker.md](./staff-picker.md) | F5 |
| Slots de horario | [time-slots.md](./time-slots.md) | F5 |
| Estados de cita (badges) | [appointment-status.md](./appointment-status.md) | F5 |
| Reasignación (3 opciones) | [reassignment-flow.md](./reassignment-flow.md) | F6 |
| Formulario de secretos | [secret-fields.md](./secret-fields.md) | F4 |
| Registro mínimo cliente | [minimal-signup.md](./minimal-signup.md) | F4 |
| Empty states | [empty-states.md](./empty-states.md) | transversal |

---

## Plantilla de patrón

```markdown
# Nombre del patrón

## Problema
## Cuándo usarlo / cuándo no
## Anatomía
## Variantes
## Comportamiento
## Accesibilidad
## Referencias de mockup
## Implementación (código)
```

---

## Relación con código y mockup

```text
mockup/            →  referencia visual CONGELADA (fuente de verdad de shells)
docs/patterns/     →  contrato de producto/UX
docs/DESIGN_SYSTEM.md → tokens + layouts
docs/ROLES_AND_UI.md  → menús por rol
web/src/components →  PublicNav, AdminShell, EmpleadoShell, ui.tsx
web/src/app/...    →  un layout por shell; no anidar shells
```

### Mapa mockup → shell

| Carpeta mockup | Shell | App |
|----------------|-------|-----|
| `mockup/publico/` | A top-nav | `app/(public)/` |
| `mockup/admin/` | B sidebar | `app/admin/` |
| `mockup/empleado/` | C sidebar | `app/empleado/` |
| `mockup/super/` | B (ítems plataforma) | `app/admin/plataforma` |
