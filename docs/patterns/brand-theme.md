# Apariencia / colores de marca (tenant)

## Problema

Cada salón/barbería quiere sentirse “suyo” sin un rediseño completo.  
El owner pidió **selectores de color en Configuración** para piezas clave.

## Cuándo usarlo

- Admin → **Configuración → Apariencia**.  
- Al renderizar el sitio público y el admin del **mismo tenant** (misma marca).

## Cuándo no

- No exponer pickers de danger/success/warning (semántica fija).  
- No dejar que un tenant rompa contraste sin aviso (validar o soft-warn).  
- Empleado y cliente **no** editan la marca.

## Anatomía

1. **Primary color** — picker + campo hex.  
2. **Accent color** — picker + campo hex.  
3. **Preview** — botón primary, botón accent, badge, link.  
4. **Restaurar defaults** — vuelve a paleta plataforma (Design System).  
5. (Futuro) Logo upload — puede vivir en General; la paleta aquí.

## Variantes

| Nivel | Qué guarda |
|-------|------------|
| Plataforma | Defaults en CSS (`#1f4d3a`, `#e36f4a`, …) |
| Tenant | `theme_primary`, `theme_accent` (hex) |
| Usuario | — (no en v1) |

Opcional v1.1: `theme_bg`, `theme_surface`.

## Comportamiento

- Guardar → aplica en la siguiente carga (o hot-inject CSS variables).  
- Hex inválido → error de formulario, no guardar.  
- Si contraste primary-on-white &lt; 4.5:1 → warning no bloqueante (“puede verse mal en botones”).  
- Sidebar admin y CTAs públicos usan los mismos tokens.

## Accesibilidad

- Labels visibles (“Color primario”, no solo el swatch).  
- Hex editable por teclado.  
- Preview con texto real, no solo el círculo de color.

## Referencias

- Tokens: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) §8  
- Config: [CONFIGURATION.md](../CONFIGURATION.md)  
- Mockup config actual: `mockup/admin/config.html` (añadir pestaña Apariencia en app real; mockup puede quedarse sin ella)

## Implementación (código)

```text
tenant_settings.theme_primary
tenant_settings.theme_accent
→ CSS variables en layout del tenant
```

Componente previsto: `components/admin/ThemeSettingsForm.tsx` + `lib/theme.ts`.
