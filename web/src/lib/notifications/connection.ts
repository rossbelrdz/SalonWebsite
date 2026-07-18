import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let connection: IORedis | null = null;

/** Conexión Redis compartida para BullMQ (maxRetriesPerRequest: null es requerido). */
export function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  return connection;
}

export function parseRedisUrl() {
  return REDIS_URL;
}
