/**
 * Worker F7 — BullMQ + Resend + Telegram + recordatorios.
 */
import "dotenv/config";
import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import {
  processNotificationJob,
  processReminders,
  prisma,
} from "./process";
import type { NotificationJobData } from "../src/lib/notifications/types";
import { QUEUE_NAME } from "../src/lib/notifications/types";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

const worker = new Worker<NotificationJobData>(
  QUEUE_NAME,
  async (job) => {
    await processNotificationJob(job.data);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 1000,
    },
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] completed ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] failed ${job?.id}`, err.message);
});

// Cola auxiliar para jobs de sistema (recordatorios)
const systemQueue = new Queue("salon-system", { connection });

async function ensureReminderRepeatable() {
  const existing = await systemQueue.getRepeatableJobs();
  for (const j of existing) {
    if (j.name === "reminders") {
      await systemQueue.removeRepeatableByKey(j.key);
    }
  }
  await systemQueue.add(
    "reminders",
    {},
    {
      repeat: { every: 15 * 60 * 1000 }, // cada 15 min
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );
  console.log("[worker] reminders scheduled every 15m");
}

const systemWorker = new Worker(
  "salon-system",
  async (job) => {
    if (job.name === "reminders") {
      await processReminders();
    }
  },
  { connection, concurrency: 1 },
);

systemWorker.on("failed", (job, err) => {
  console.error(`[system] failed ${job?.name}`, err.message);
});

async function main() {
  console.log("[worker] F7 started — notifications + reminders");
  await ensureReminderRepeatable();
  // primera pasada al arrancar
  try {
    await processReminders();
  } catch (e) {
    console.error("[worker] initial reminders error", e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function shutdown() {
  console.log("[worker] shutting down…");
  await worker.close();
  await systemWorker.close();
  await systemQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
