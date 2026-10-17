import { callTelegram, sendTelegramMessage, telegramChatIds, tgEscape, whatsappLink } from "./api";
import {
  MENU,
  askCancel,
  confirmCancel,
  dismissCancel,
  sendPlanNow,
  sendUpcomingList,
  startWalkIn,
  walkInBook,
  walkInChooseTable,
  walkInJoinTables,
} from "./hall";
import { parseRef, parseReplyCallback, refLine } from "./refs";
import { firstName, loadRecipient, sendReplyMail, whatsappText, type Recipient } from "./replies";

/**
 * Handles Telegram updates for the owner chat(s):
 *  - "✍️ Ответить" button → prompt with force-reply ("напиши ответ …")
 *  - a reply to that prompt or to the original notification → e-mail to the
 *    guest + a WhatsApp button pre-filled with the same text
 *  - hall: /plan, /walkin, /list, /menu and their buttons (see hall.ts)
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
  caption?: string;
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
  const original = message.reply_to_message;
  const ref = parseRef(original?.text ?? original?.caption);
  if (!answer || !ref) return;

  const recipient = await loadRecipient(ref);
  if (!recipient) {
    await sendTelegramMessage(message.chat.id, "⚠️ Запрос не найден — ответ не отправлен.");
    return;
  }

  const mailed = await sendReplyMail(recipient, answer);
  const wa = recipient.phone ? whatsappLink(recipient.phone, whatsappText(recipient, answer)) : null;
  const why = mailed === "no_credits" ? " В Brevo закончился лимит писем — нужно пополнить тариф." : "";
  await sendTelegramMessage(
    message.chat.id,
    mailed === "sent"
      ? `✅ Ответ отправлен на ${tgEscape(recipient.email)}`
      : `⚠️ Письмо на ${tgEscape(recipient.email)} не ушло.${why}${wa ? " Можно отправить в WhatsApp:" : ""}`,
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
        ? "👋 <b>MakiLove</b>: сюда приходят брони и запросы с сайта."
        : `Chat-ID: <code>${message.chat.id}</code>\nДобавь его в TELEGRAM_CHAT_ID, чтобы получать брони и запросы сюда.`,
      known ? { inline_keyboard: MENU } : undefined,
    );
    return;
  }

  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message?.chat.id;
    if (!isOwnerChat(chatId) || !chatId) return;
    await onCallback(query, chatId);
    return;
  }

  if (!message || !isOwnerChat(message.chat.id)) return;

  if (command === "/menu") {
    await sendTelegramMessage(message.chat.id, "🍣 <b>MakiLove</b> — что сделать?", { inline_keyboard: MENU });
  } else if (command === "/plan") {
    await sendPlanNow(message.chat.id);
  } else if (command === "/walkin") {
    await startWalkIn(message.chat.id);
  } else if (command === "/list") {
    await sendUpcomingList(message.chat.id);
  } else if (message.reply_to_message?.from?.is_bot) {
    await onAnswer(message);
  }
}

async function onCallback(query: TgCallbackQuery, chatId: number) {
  const data = query.data ?? "";
  const messageId = query.message?.message_id;
  if (data.startsWith("reply:")) return onReplyButton(query);

  // Acknowledge first so the button stops spinning; the work may take a moment.
  await callTelegram("answerCallbackQuery", { callback_query_id: query.id });
  const [action, a, b] = data.split(":");
  if (action === "plan") await sendPlanNow(chatId);
  else if (action === "list") await sendUpcomingList(chatId);
  else if (action === "wi" && !a) await startWalkIn(chatId);
  else if (action === "wi") await walkInChooseTable(chatId, messageId, Number(a));
  else if (action === "wm" && a) await walkInJoinTables(chatId, messageId, Number(a), b);
  else if (action === "wt" && a && b) await walkInBook(chatId, messageId, Number(a), b);
  else if (action === "cx" && a) await askCancel(chatId, a);
  else if (action === "cy" && a) await confirmCancel(chatId, messageId, a);
  else if (action === "cn") await dismissCancel(chatId, messageId);
}
