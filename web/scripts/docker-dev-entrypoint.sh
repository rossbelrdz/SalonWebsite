#!/usr/bin/env sh
# Entrypoint dev: evita desync Prisma Client / schema / seed entre app y worker.
set -eu

echo "[entrypoint] node=$(node -v) cwd=$(pwd)"

# 1) Dependencias (volumen node_modules puede estar vacío o viejo)
if [ ! -f node_modules/.package-lock.json ] && [ ! -d node_modules/@prisma/client ]; then
  echo "[entrypoint] npm ci (node_modules vacío)"
  npm ci
elif [ "${FORCE_NPM_CI:-0}" = "1" ]; then
  echo "[entrypoint] FORCE_NPM_CI=1 → npm ci"
  npm ci
else
  echo "[entrypoint] node_modules presente (skip npm ci; FORCE_NPM_CI=1 para forzar)"
fi

# 2) Prisma Client SIEMPRE regenerado contra schema montado
echo "[entrypoint] prisma generate"
npx prisma generate

# 3) Schema → DB (dev). En prod usar migrate deploy.
if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  echo "[entrypoint] prisma db push"
  npx prisma db push --skip-generate
fi

# 4) Validar que el client expone modelos críticos (evita upsert undefined)
node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const required = [
  "tenant",
  "user",
  "rolePermission",
  "notificationMatrixRule",
  "payment",
  "appointment",
];
const missing = required.filter((k) => !p[k] || typeof p[k].findMany !== "function");
if (missing.length) {
  console.error("[entrypoint] Prisma Client incompleto. Faltan:", missing.join(", "));
  console.error("  → Borra el volumen web_node_modules y reinicia, o FORCE_NPM_CI=1");
  process.exit(1);
}
console.log("[entrypoint] Prisma Client OK:", required.join(", "));
p.$disconnect().catch(() => {});
NODE

# 5) Seed idempotente (no resetea datos). Desactivar con SKIP_SEED=1
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "[entrypoint] seed (idempotente)"
  npx tsx prisma/seed.ts
else
  echo "[entrypoint] SKIP_SEED=1"
fi

# 6) Comando principal (dev / worker)
echo "[entrypoint] exec: $*"
exec "$@"
