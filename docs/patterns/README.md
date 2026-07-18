# Pattern Library

Catálogo de **patrones de UI y UX** reutilizables.

**Estado:** activo (Fase 2) — base extraída del mockup + decisiones de producto.  
Design tokens: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).

---

## Cómo usar

1. Leer el patrón **antes** de inventar un flujo nuevo.  
2. En código, el componente real se enlaza al final de cada archivo.  
3. Admin puede retocarse en marcha; si cambia un patrón, actualizar este doc en el mismo PR.

---

## Índice

| Patrón | Archivo | Prioridad app |
|--------|---------|---------------|
| Wizard de cita | [booking-wizard.md](./booking-wizard.md) | Core F5 |
| Sidebar admin | [admin-sidebar.md](./admin-sidebar.md) | F3–F4 |
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

## Relación con código

```text
docs/patterns/     →  contrato de producto/UX
src/components/    →  implementación (F3+)
mockup/            →  referencia visual congelada
```
