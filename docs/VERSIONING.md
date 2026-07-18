# Control de versiones

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

1. Actualizar [`VERSION`](../VERSION).  
2. Mover ítems de `[Unreleased]` a una sección `## [X.Y.Z] — YYYY-MM-DD` en [`CHANGELOG.md`](../CHANGELOG.md).  
3. Tag Git: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.  
4. Si hay imágenes Docker, etiquetarlas `salon-app:X.Y.Z` y `salon-app:latest` solo en release estable.  
5. Anotar en CHANGELOG si hay migraciones de DB o breaking changes.

---

## Convenciones de commits (recomendado)

- `feat:` nueva funcionalidad → suele disparar MINOR  
- `fix:` corrección → PATCH  
- `docs:` documentación  
- `security:` dependencias / hardening  
- `chore:` tooling, deps sin impacto de producto  
- `refactor:` sin cambio de comportamiento  

---

## Relación con fases

Cada cierre de fase en [PHASES.md](./PHASES.md) debería producir al menos un **MINOR** (o MAJOR si aplica).  
No es obligatorio un release por cada commit.
