# Estados de cita (badges)

## Problema

Comunicar de un vistazo el estado de una cita en listas admin/cliente.

## Variantes (badges)

| Estado | Badge | Token soft |
|--------|-------|------------|
| Confirmada | success | `--success` |
| Prepagada | accent / info | `--accent` o `--secondary` |
| Pendiente | warning | `--warning` |
| Cancelada | danger / neutral | `--danger` |
| Reasignación pendiente | warning | `--warning` |
| Completada | neutral / success | — |

Clases: `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-accent`, `.badge-info`, `.badge-neutral`.

## Cuándo no

- No usar color solo: siempre texto del estado.  
- No recolorar badges semánticos con el theme del tenant (primary/accent de marca ≠ danger).

## Referencias

Admin citas, mis citas — `mockup/admin/citas.html`, `mockup/publico/mis-citas.html`.
