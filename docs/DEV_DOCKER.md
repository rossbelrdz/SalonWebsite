# Docker + Prisma (dev) — anti-desync

## Problema que resolvimos

`node_modules` vive en un **volumen Docker** (`web_node_modules`).  
El código se monta desde el host (`./web`).  
Si el schema Prisma cambia y el Client dentro del volumen no se regenera, aparece:

```text
Cannot read properties of undefined (reading 'upsert')
```

## Flujo correcto al arrancar

`scripts/docker-dev-entrypoint.sh` (app y worker):

1. `npm ci` solo si `node_modules` vacío o `FORCE_NPM_CI=1`
2. **`prisma generate` siempre**
3. **`prisma db push`** (app; worker lo salta con `SKIP_DB_PUSH=1`)
4. **Assert** de modelos críticos (`rolePermission`, `notificationMatrixRule`, …)
5. **Seed idempotente** (app; worker con `SKIP_SEED=1`)
6. Arranca Next o worker

## Comandos útiles

```bash
# Arranque normal
docker compose up -d --build

# Client/volumen roto (force reinstall + generate)
FORCE_NPM_CI=1 docker compose up -d --build app worker

# Reset total DB demo (destructivo)
docker compose exec app npm run db:reset

# Solo seed / matrices
docker compose exec app npm run db:seed
SEED_RESET_MATRICES=1 docker compose exec app npm run db:seed

# Assert client
docker compose exec app npm run db:assert
```

## Scripts npm (en `web/`)

| Script | Uso |
|--------|-----|
| `db:setup` | generate + push + seed + assert |
| `db:seed` | seed idempotente |
| `db:reset` | wipe schema + seed + reset matrices |
| `db:assert` | falla si faltan modelos |

## Producción (futuro)

- **No** usar `db push` ni seed en cada start.
- Usar `prisma migrate deploy`.
- Seed solo en bootstrap controlado.
- Imagen `runner` con client generado en build.

## Worker

Depende de `app` **healthy** (no solo started), para no competir con el primer `npm ci`/`generate`.
