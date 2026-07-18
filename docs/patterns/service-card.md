# Card de servicio

## Problema

Mostrar un servicio de forma atractiva y accionable (catálogo y wizard).

## Anatomía

- Imagen (ratio consistente)  
- Nombre  
- Duración + precio  
- Badge categoría (H / M / unisex) opcional  
- CTA “Agendar” o selección en wizard  

Clases mockup: `.card`, `.card-hover`, `.card-selectable`.

## Variantes

| Contexto | Interacción |
|----------|-------------|
| Catálogo público | Link a detalle o agendar |
| Wizard | Seleccionable (`.is-selected`) |
| Admin lista | Editar / activar |

## Accesibilidad

- Si toda la card es clickeable: un solo foco, nombre accesible.  
- Precio y duración en texto, no solo iconos.

## Referencias

P-02, P-03, P-07 — `mockup/publico/servicios.html`, `servicio.html`, `agendar.html`.
