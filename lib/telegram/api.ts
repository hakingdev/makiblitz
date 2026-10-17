/**
 * Minimal Telegram Bot API client (server-only, plain fetch).
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN       token from @BotFather
 *   TELEGRAM_CHAT_ID         chat(s) that receive bookings and requests, comma-
 *                            separated (e.g. the staff group); the only chats
 *                            the bot obeys
 *   TELEGRAM_WEBHOOK_SECRET  shared secret Telegram sends with every webhook call
 */

const TIMEOUT_MS = 10_000;

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };

export type ReplyMarkup =
  | { inline_keyboard: InlineButton[][] }
  | { force_reply: true; input_field_placeholder?: string; selective?: boolean };

export function telegramChatIds(): string[] {
  return (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && telegramChatIds().length);
}

/** Calls a Bot API method; returns `result` or null (never throws). */
export async function callTelegram<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.info(`[telegram] not configured — skipped ${method}`);
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
    if (!res.ok || !data?.ok) {
      console.error(`[telegram] ${method} failed: ${res.status} ${data?.description ?? ""}`);
      return null;
    }
    return data.result ?? null;
  } catch (error) {
    console.error(`[telegram] ${method} error:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function sendTelegramMessage(chatId: string | number, html: string, replyMarkup?: ReplyMarkup) {
  return callTelegram<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

/** Escapes user input for parse_mode=HTML. */
export function tgEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * wa.me link for a phone number as guests type it ("0171 234", "+49 171…",
 * "0049 171…"). German numbers without country code get +49.
 */
export function whatsappLink(phone: string, text?: string): string | null {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `49${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const query = text ? `?text=${encodeURIComponent(text.slice(0, 1500))}` : "";
  return `https://wa.me/${digits}${query}`;
}
