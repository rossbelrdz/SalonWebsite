import webpush from "web-push";
import { prisma } from "@/lib/db";

const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:admin@salon.local";

let configured = false;

export function getVapidPublicKey() {
  return publicKey;
}

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

function ensureVapid() {
  if (configured) return;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID no configurado");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPush(opts: {
  userId: string;
  title: string;
  body: string;
  url?: string;
}) {
  if (!isPushConfigured()) return { sent: 0, skipped: true as const };

  const user = await prisma.user.findUnique({ where: { id: opts.userId } });
  if (!user?.notifyPush) return { sent: 0, skipped: true as const };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: opts.userId },
  });
  if (subs.length === 0) return { sent: 0, skipped: true as const };

  ensureVapid();
  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body,
    url: opts.url || "/",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sent++;
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error("[push]", e);
      }
    }
  }
  return { sent, skipped: false as const };
}
