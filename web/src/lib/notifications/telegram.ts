const API = "https://api.telegram.org";

export async function sendTelegramMessage(opts: {
  botToken: string;
  chatId: string;
  text: string;
  /** Topic de supergrupo (opcional). */
  messageThreadId?: number | null;
}) {
  const url = `${API}/bot${opts.botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: opts.text.slice(0, 4000),
    disable_web_page_preview: true,
  };
  if (
    opts.messageThreadId != null &&
    Number.isFinite(opts.messageThreadId)
  ) {
    body.message_thread_id = opts.messageThreadId;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(
      data?.description || `Telegram HTTP ${res.status}`,
    );
  }
  return data;
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string) {
  const res = await fetch(`${API}/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });
  return res.json();
}
