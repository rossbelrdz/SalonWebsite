#!/usr/bin/env sh
# Entrypoint producción: schema → DB, seed opcional, luego next start / worker.
# NODE_ENV=production (sin Turbopack, sin HMR, build precompilado).
set -eu

echo "[prod-entrypoint] node=$(node -v) NODE_ENV=${NODE_ENV:-} cwd=$(pwd)"

if [ "${NODE_ENV:-}" != "production" ]; then
  echo "[prod-entrypoint] WARN: NODE_ENV should be production (got '${NODE_ENV:-}')"
fi

echo "[prod-entrypoint] prisma generate"
npx prisma generate

if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  echo "[prod-entrypoint] prisma db push"
  npx prisma db push --skip-generate
else
  echo "[prod-entrypoint] SKIP_DB_PUSH=1"
fi

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
  console.error("[prod-entrypoint] Prisma Client incompleto:", missing.join(", "));
  process.exit(1);
}
console.log("[prod-entrypoint] Prisma Client OK:", required.join(", "));
p.$disconnect().catch(() => {});
NODE

if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "[prod-entrypoint] seed (idempotente)"
  npx tsx prisma/seed.ts
else
  echo "[prod-entrypoint] SKIP_SEED=1"
fi

echo "[prod-entrypoint] exec: $*"
exec "$@"
