import { NotificationStatus, PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import type { NotificationJobData } from "../src/lib/notifications/types";

const prisma = new PrismaClient();

function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const { createDecipheriv } = require("crypto") as typeof import("crypto");
    const raw =
      process.env.APP_ENCRYPTION_KEY || "dev-encryption-key-change-me-32chars";
    const key = createHash("sha256").update(raw).digest();
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

async function sendEmail(
  apiKey: string,
  fromEmail: string,
  fromName: string | null | undefined,
  to: string,
  subject: string,
  text: string,
  html?: string,
) {
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, "<br/>"),
  });
  if (error) throw new Error(error.message || "Resend error");
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data?.description || `Telegram ${res.status}`);
  }
}

export async function processNotificationJob(data: NotificationJobData) {
  const log = await prisma.notificationLog.findUnique({
    where: { id: data.logId },
  });
  if (!log) {
    console.warn("[worker] log missing", data.logId);
    return;
  }
  if (log.status === NotificationStatus.SENT) {
    return;
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: data.tenantId },
  });

  try {
    if (data.channel === "EMAIL") {
      const apiKey = decryptSecret(settings?.resendApiKeyEnc);
      const from = settings?.resendFromEmail;
      if (!apiKey || !from) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NotificationStatus.SKIPPED,
            error: "Resend no configurado (API key / from)",
          },
        });
        console.log(`[worker] skip email ${data.eventKey} — sin Resend`);
        return;
      }
      await sendEmail(
        apiKey,
        from,
        settings?.resendFromName,
        data.recipient,
        data.subject || "Notificación Salon",
        data.text,
        data.html,
      );
    } else if (data.channel === "TELEGRAM") {
      const token = decryptSecret(settings?.telegramBotTokenEnc);
      if (!token || !settings?.telegramEnabled) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NotificationStatus.SKIPPED,
            error: "Telegram desactivado o sin token",
          },
        });
        console.log(`[worker] skip telegram ${data.eventKey}`);
        return;
      }
      await sendTelegram(token, data.recipient, data.text);
    } else if (data.channel === "PUSH") {
      const { sendWebPush } = await import("../src/lib/push");
      const result = await sendWebPush({
        userId: data.userId || data.recipient,
        title: data.subject || "Salon",
        body: data.text.slice(0, 180),
        url: "/mis-citas",
      });
      if (result.skipped || result.sent === 0) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NotificationStatus.SKIPPED,
            error: "Sin suscripción push o desactivado",
          },
        });
        console.log(`[worker] skip push ${data.eventKey}`);
        return;
      }
    } else {
      // IN_APP already marked in enqueue
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
      return;
    }

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: NotificationStatus.SENT, sentAt: new Date(), error: null },
    });
    console.log(`[worker] sent ${data.channel} ${data.eventKey}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send failed";
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: NotificationStatus.FAILED, error: msg },
    });
    throw e; // rethrow for BullMQ retry
  }
}

export async function processReminders() {
  const now = Date.now();
  const tenants = await prisma.tenant.findMany({
    include: { settings: true },
  });

  for (const tenant of tenants) {
    const h24 = tenant.settings?.remindHoursBefore ?? 24;
    const h2 = tenant.settings?.remindHoursBefore2 ?? 2;

    for (const [kind, hours] of [
      ["24h", h24],
      ["2h", h2],
    ] as const) {
      const target = now + hours * 60 * 60 * 1000;
      // ventana ±30 min
      const from = new Date(target - 30 * 60 * 1000);
      const to = new Date(target + 30 * 60 * 1000);

      const appts = await prisma.appointment.findMany({
        where: {
          tenantId: tenant.id,
          startsAt: { gte: from, lte: to },
          status: { in: ["CONFIRMED", "PREPAID"] },
        },
        select: { id: true },
      });

      for (const a of appts) {
        const eventType =
          kind === "24h"
            ? "appointment.reminder_24h"
            : "appointment.reminder_2h";
        const exists = await prisma.notificationLog.findFirst({
          where: {
            eventKey: {
              startsWith: `${eventType}:${a.id}:`,
            },
            status: { in: ["QUEUED", "SENT"] },
          },
        });
        if (exists) continue;

        // dynamic import events from compiled path — use inline enqueue via events
        const { notifyReminder } = await import(
          "../src/lib/notifications/events"
        );
        await notifyReminder(a.id, kind);
        console.log(`[worker] reminder ${kind} queued for ${a.id}`);
      }
    }
  }
}

export { prisma };
