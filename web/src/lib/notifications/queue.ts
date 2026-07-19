import { Queue } from "bullmq";
import {
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRedisConnection } from "./connection";
import { QUEUE_NAME, type NotificationJobData, type NotifyPriority } from "./types";

let queue: Queue<NotificationJobData> | null = null;

export function getNotificationQueue() {
  if (!queue) {
    queue = new Queue<NotificationJobData>(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

function priorityScore(p: NotifyPriority): number {
  if (p === "high") return 1;
  if (p === "low") return 10;
  return 5;
}

/**
 * Encola un envío con log idempotente.
 * Si eventKey ya existe como SENT/QUEUED, no duplica.
 */
export async function enqueueNotification(opts: {
  tenantId: string;
  eventKey: string;
  eventType: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  text: string;
  html?: string;
  userId?: string | null;
  priority?: NotifyPriority;
  delayMs?: number;
  /** Telegram topic (supergrupo). */
  messageThreadId?: number | null;
}) {
  const existing = await prisma.notificationLog.findUnique({
    where: { eventKey: opts.eventKey },
  });
  if (existing && (existing.status === "SENT" || existing.status === "QUEUED")) {
    return { skipped: true as const, logId: existing.id };
  }

  const log = existing
    ? await prisma.notificationLog.update({
        where: { id: existing.id },
        data: {
          status: NotificationStatus.QUEUED,
          recipient: opts.recipient,
          subject: opts.subject,
          body: opts.text,
          error: null,
        },
      })
    : await prisma.notificationLog.create({
        data: {
          tenantId: opts.tenantId,
          userId: opts.userId ?? null,
          eventKey: opts.eventKey,
          eventType: opts.eventType,
          channel: opts.channel,
          status: NotificationStatus.QUEUED,
          recipient: opts.recipient,
          subject: opts.subject,
          body: opts.text,
        },
      });

  // IN_APP: solo persistir (campanita); no requiere worker
  if (opts.channel === NotificationChannel.IN_APP) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: NotificationStatus.SENT, sentAt: new Date() },
    });
    return { skipped: false as const, logId: log.id, inApp: true as const };
  }

  const job: NotificationJobData = {
    logId: log.id,
    eventKey: opts.eventKey,
    eventType: opts.eventType,
    tenantId: opts.tenantId,
    channel: opts.channel,
    recipient: opts.recipient,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    userId: opts.userId,
    messageThreadId: opts.messageThreadId ?? null,
  };

  try {
    // BullMQ jobId no permite ":"
    const safeJobId = opts.eventKey.replace(/:/g, "_").slice(0, 120);
    await getNotificationQueue().add(opts.eventType, job, {
      jobId: safeJobId,
      priority: priorityScore(opts.priority || "normal"),
      delay: opts.delayMs,
    });
  } catch (e) {
    // Si Redis falla, dejamos log QUEUED y no rompemos el request
    console.error("[notify] enqueue failed", e);
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: NotificationStatus.FAILED,
        error: e instanceof Error ? e.message : "enqueue failed",
      },
    });
    return { skipped: false as const, logId: log.id, failed: true as const };
  }

  return { skipped: false as const, logId: log.id };
}
