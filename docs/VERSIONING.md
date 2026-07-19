# Control de versiones

## Regla obligatoria (agentes y humanos)

> **Cada vez que se implementen cambios de producto, bugfix, seguridad o deploy,
> hay que dejar rastro en el changelog y en la versión.** No se da por cerrada una
> tarea de código sin actualizar el historial.

| Qué | Dónde | Cuándo |
|-----|--------|--------|
| Descripción del cambio | [`CHANGELOG.md`](../CHANGELOG.md) | **Siempre** en la misma sesión/PR del cambio |
| Número de versión | [`VERSION`](../VERSION) (fuente de verdad) | Al cerrar un lote entregable (release) |
| Alineación npm | [`web/package.json`](../web/package.json) `version` | Junto con `VERSION` |
| Política / este doc | [`docs/VERSIONING.md`](./VERSIONING.md) | Si cambia la convención |

### Cómo escribir el rastro

1. **Mientras se trabaja:** anotar en `## [Unreleased]` de `CHANGELOG.md` (secciones
   `Added` / `Changed` / `Fixed` / `Security` / `Removed`). Así no se pierde el detalle.
2. **Al entregar / merge / push de un lote usable:**  
   - decidir SemVer (tabla abajo),  
   - subir [`VERSION`](../VERSION) y `web/package.json`,  
   - mover lo de `[Unreleased]` a `## [X.Y.Z] — YYYY-MM-DD`,  
   - actualizar referencias sueltas (`AGENTS.md`, `GROK.md` si citan la versión).  
3. **Solo docs de proceso sin impacto de producto** (p. ej. tipografía de un pattern):
   basta una línea en `[Unreleased]` → `Changed` o un commit `docs:`; **no** hace
   falta bump de versión salvo que el usuario pida release.

**Prohibido:** commitear features/fixes “en silencio” y dejar `CHANGELOG.md` /
`VERSION` en la versión anterior. Es exactamente cómo se pierde el historial.

---

## SemVer

Formato: `MAJOR.MINOR.PATCH` (ej. `1.4.2`)

| Tipo | Cuándo incrementar |
|------|---------------------|
| **MAJOR** | Cambios incompatibles de API, datos o flujos que rompen clientes existentes |
| **MINOR** | Nueva funcionalidad compatible hacia atrás |
| **PATCH** | Correcciones de bugs, seguridad, docs menores sin feature |

**Pre-1.0 (`0.x.y`):** el producto está en construcción.  
- `0.MINOR.0` = hito de fase o feature visible  
- `0.x.PATCH` = ajustes y fixes dentro del hito  

Fuente de verdad de la versión actual: archivo raíz [`VERSION`](../VERSION).

---

## Release checklist

1. Revisar que `[Unreleased]` tenga **todo** lo del lote (si falta, completar antes).  
2. Actualizar [`VERSION`](../VERSION).  
3. Mover ítems de `[Unreleased]` a una sección `## [X.Y.Z] — YYYY-MM-DD` en [`CHANGELOG.md`](../CHANGELOG.md).  
4. Alinear `web/package.json` → `"version"`.  
5. Tag Git: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.  
6. Si hay imágenes Docker, etiquetarlas `salon-app:X.Y.Z` y `salon-app:latest` solo en release estable.  
7. Anotar en CHANGELOG si hay migraciones de DB o breaking changes.  
8. Commit preferible: `docs: release vX.Y.Z` o incluir el bump en el commit `feat:`/`fix:`.

---

## Convenciones de commits (recomendado)

- `feat:` nueva funcionalidad → suele disparar MINOR  
- `fix:` corrección → PATCH  
- `docs:` documentación  
- `security:` dependencias / hardening  
- `chore:` tooling, deps sin impacto de producto  
- `refactor:` sin cambio de comportamiento  

El prefijo del commit **no sustituye** al CHANGELOG: ambos.

---

## Relación con fases

Cada cierre de fase en [PHASES.md](./PHASES.md) debería producir al menos un **MINOR** (o MAJOR si aplica).  
No es obligatorio un release por cada micro-commit, **sí** es obligatorio no perder el rastro: o entra en `[Unreleased]` o en la sección de versión del lote.
