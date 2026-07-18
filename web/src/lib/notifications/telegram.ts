const API = "https://api.telegram.org";

export async function sendTelegramMessage(opts: {
  botToken: string;
  chatId: string;
  text: string;
}) {
  const url = `${API}/bot${opts.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: opts.text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
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
