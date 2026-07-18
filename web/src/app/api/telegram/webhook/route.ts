import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { sendTelegramMessage } from "@/lib/notifications/telegram";

/**
 * Webhook Telegram: vincula chat con /start <userId> o /start link_<userId>
 * Configura en BotFather setWebhook → PUBLIC_APP_URL/api/telegram/webhook
 */
export async function POST(req: Request) {
  try {
    const update = await req.json();
    const message = update.message || update.edited_message;
    if (!message?.text || !message.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = String(message.text).trim();

    // Encontrar tenant con bot (single-tenant bootstrap: primer token)
    const settings = await prisma.tenantSettings.findFirst({
      where: { telegramEnabled: true, telegramBotTokenEnc: { not: null } },
    });
    const token = decryptSecret(settings?.telegramBotTokenEnc);

    if (text.startsWith("/start")) {
      const payload = text.replace(/^\/start\s*/, "").trim();
      const userId = payload.replace(/^link_/, "") || null;

      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await prisma.user.update({
            where: { id: userId },
            data: { telegramChatId: chatId },
          });
          if (token) {
            await sendTelegramMessage({
              botToken: token,
              chatId,
              text: `Listo, ${user.name}. Tu Telegram quedó vinculado a Salon. Recibirás avisos de citas aquí.`,
            });
          }
          return NextResponse.json({ ok: true });
        }
      }

      if (token) {
        await sendTelegramMessage({
          botToken: token,
          chatId,
          text:
            "Hola. Para vincular tu cuenta, abre el enlace desde la app o envía:\n/start TU_USER_ID\n(Admin puede copiar el id desde usuarios.)",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[telegram webhook]", e);
    return NextResponse.json({ ok: true });
  }
}
