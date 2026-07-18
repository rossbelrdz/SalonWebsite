/**
 * Falla si el Prisma Client no tiene los modelos del schema actual.
 * Úsalo en CI y en entrypoints.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const required = [
  "tenant",
  "user",
  "rolePermission",
  "notificationMatrixRule",
  "payment",
  "appointment",
  "pushSubscription",
  "passkeyCredential",
  "platformSettings",
];

let PrismaClient;
try {
  ({ PrismaClient } = require("@prisma/client"));
} catch (e) {
  console.error("[assert-prisma] No se pudo cargar @prisma/client:", e.message);
  process.exit(1);
}

const p = new PrismaClient();
const missing = required.filter(
  (k) => !p[k] || typeof p[k].findMany !== "function",
);

if (missing.length) {
  console.error(
    "[assert-prisma] Client desactualizado. Faltan modelos:",
    missing.join(", "),
  );
  console.error("  Ejecuta: npx prisma generate && npx prisma db push");
  await p.$disconnect().catch(() => {});
  process.exit(1);
}

console.log("[assert-prisma] OK —", required.length, "modelos");
await p.$disconnect();
