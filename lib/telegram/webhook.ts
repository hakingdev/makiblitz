import { callTelegram, sendTelegramMessage, telegramChatIds, tgEscape, whatsappLink } from "./api";
import { parseRef, parseReplyCallback, refLine } from "./refs";
import { firstName, loadRecipient, sendReplyMail, whatsappText, type Recipient } from "./replies";

/**
 * Handles Telegram updates for the owner chat(s):
 *  - "✍️ Ответить" button → prompt with force-reply ("напиши ответ …")
 *  - a reply to that prompt or to the original notification → e-mail to the
 *    guest + a WhatsApp button pre-filled with the same text
 *  - /start or /id → shows the chat id (needed once for TELEGRAM_CHAT_ID)
 * Messages from any other chat are ignored.
 */

type TgUser = { id: number; is_bot: boolean };
type TgChat = { id: number; type: string };
type TgMessage = {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  reply_to_message?: TgMessage;
};
type TgCallbackQuery = { id: string; data?: string; message?: TgMessage };
export type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallbackQuery };

function isOwnerChat(chatId: number | undefined) {
  return chatId !== undefined && telegramChatIds().includes(String(chatId));
}

function recipientLine(r: Recipient) {
  return `<b>${tgEscape(r.name)}</b> · ${tgEscape(r.email)}${r.phone ? ` · ${tgEscape(r.phone)}` : ""}`;
}

async function onReplyButton(query: TgCallbackQuery) {
  const chatId = query.message?.chat.id;
  const ref = parseReplyCallback(query.data);
  const recipient = ref ? await loadRecipient(ref) : null;
  if (!chatId || !ref || !recipient) {
    await callTelegram("answerCallbackQuery", { callback_query_id: query.id, text: "Запрос не найден" });
    return;
  }
  await callTelegram("answerCallbackQuery", { callback_query_id: query.id });
  await sendTelegramMessage(
    chatId,
    [
      `✍️ Ответ для ${recipientLine(recipient)}`,
      "Напиши текст ответом на это сообщение — он уйдёт гостю на e-mail.",
      refLine(ref.kind, ref.id),
    ].join("\n"),
    { force_reply: true, input_field_placeholder: `Ответ для ${firstName(recipient.name)}…` },
  );
}

async function onAnswer(message: TgMessage) {
  const answer = message.text?.trim();
  const ref = parseRef(message.reply_to_message?.text);
  if (!answer || !ref) return;

  const recipient = await loadRecipient(ref);
  if (!recipient) {
    await sendTelegramMessage(message.chat.id, "⚠️ Запрос не найден — ответ не отправлен.");
    return;
  }

  const mailed = await sendReplyMail(recipient, answer);
  const wa = recipient.phone ? whatsappLink(recipient.phone, whatsappText(recipient, answer)) : null;
  await sendTelegramMessage(
    message.chat.id,
    mailed
      ? `✅ Ответ отправлен на ${tgEscape(recipient.email)}`
      : `⚠️ Письмо на ${tgEscape(recipient.email)} не ушло.${wa ? " Можно отправить в WhatsApp:" : ""}`,
    wa ? { inline_keyboard: [[{ text: "💬 Отправить этот текст в WhatsApp", url: wa }]] } : undefined,
  );
}

export async function handleTelegramUpdate(update: TgUpdate) {
  const message = update.message;
  const command = message?.text?.trim().split(/[\s@]/)[0];

  // Setup helper: tells the chat its id, also before TELEGRAM_CHAT_ID is set.
  if (message && (command === "/start" || command === "/id")) {
    const known = isOwnerChat(message.chat.id);
    await sendTelegramMessage(
      message.chat.id,
      known
        ? "👋 MakiLove: сюда приходят брони и запросы с сайта."
        : `Chat-ID: <code>${message.chat.id}</code>\nДобавь его в TELEGRAM_CHAT_ID, чтобы получать брони и запросы сюда.`,
    );
    return;
  }

  if (update.callback_query) {
    if (isOwnerChat(update.callback_query.message?.chat.id)) await onReplyButton(update.callback_query);
    return;
  }

  if (message?.reply_to_message?.from?.is_bot && isOwnerChat(message.chat.id)) {
    await onAnswer(message);
  }
}
