# Docker + Prisma — anti-desync y modos

## Producción (default)

```bash
docker compose up -d --build
# o con tunnel:
docker compose --profile tunnel up -d --build
```

- `NODE_ENV=production`
- Imagen `Dockerfile` target **`runner`**: `next build` en imagen → **`next start`**
- **Sin** montar `./web` (el código va cocinado en la imagen)
- Entrypoint: `scripts/docker-prod-entrypoint.sh`

Cualquier cambio de código requiere **rebuild**:

```bash
docker compose up -d --build app worker
```

## Desarrollo (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up
```

- `NODE_ENV=development`
- `next dev --turbopack`
- Volumen `./web:/app` + `web_node_modules`
- Entrypoint: `scripts/docker-dev-entrypoint.sh`

### Problema clásico en dev

`node_modules` vive en volumen Docker. Si el schema Prisma cambia y el Client no se regenera:

```text
Cannot read properties of undefined (reading 'upsert')
```

El entrypoint dev hace `prisma generate` siempre y `db push` + seed (app).

```bash
FORCE_NPM_CI=1 docker compose -f docker-compose.dev.yml up -d --build app worker
docker compose -f docker-compose.dev.yml exec app npm run db:reset   # destructivo
```

## Scripts npm (`web/`)

| Script | Uso |
|--------|-----|
| `build` | `prisma generate` + `next build` (estricto) |
| `start` / `start:prod` | `next start` en production |
| `db:setup` | generate + push + seed + assert |
| `db:seed` | seed idempotente |
| `db:reset` | wipe + seed |
| `db:assert` | falla si faltan modelos |

## Worker

Mismo target de imagen que `app`. En prod: `npx tsx worker/index.ts` con `SKIP_SEED=1` y `SKIP_DB_PUSH=1`.
