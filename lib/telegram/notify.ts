import { tablesLabel } from "@/lib/reservation/tables";
import type { NewReservation, StoredReservation } from "@/lib/reservation/store";
import type { NewContactRequest } from "@/lib/contact/store";
import {
  isTelegramConfigured,
  sendTelegramMessage,
  telegramChatIds,
  tgEscape,
  whatsappLink,
  type InlineButton,
} from "./api";
import { sendPlanForWindow } from "./hall";
import { refLine, type RefKind } from "./refs";

/**
 * Owner notifications in the Telegram chat (texts in Russian — internal use).
 * Each message carries a "ref" line so the webhook can map a reply back to
 * the guest. Returns false when Telegram isn't configured or the send failed,
 * so callers can fall back to e-mail.
 */

const ruDate = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function formatRuDate(iso: string) {
  return ruDate.format(new Date(`${iso}T12:00:00Z`));
}

function replyButtons(kind: RefKind, id: string | null, phone: string | null): InlineButton[] {
  const row: InlineButton[] = [];
  if (id) row.push({ text: "✍️ Ответить", callback_data: `reply:${kind}:${id}` });
  const wa = phone ? whatsappLink(phone) : null;
  if (wa) row.push({ text: "💬 WhatsApp", url: wa });
  return row;
}

const lines = (items: (string | false | null | undefined)[]) =>
  items.filter((line): line is string => typeof line === "string").join("\n");

/** New online booking: floor plan for its time window, the new table outlined. */
export async function notifyReservation(r: NewReservation, id: string, tables: number[]) {
  if (!isTelegramConfigured()) return false;
  const caption = lines([
    "🍣 <b>Новая бронь</b>",
    "",
    `👥 <b>${r.guests} чел.</b>   🕖 <b>${tgEscape(r.time)}</b>   🪑 <b>стол ${tablesLabel(tables)}</b>`,
    `📅 ${tgEscape(formatRuDate(r.date))}`,
    "",
    `👤 ${tgEscape(r.name)}`,
    r.email && `✉️ ${tgEscape(r.email)}`,
    r.phone && `📞 ${tgEscape(r.phone)}`,
    r.notes && `💬 ${tgEscape(r.notes)}`,
    refLine("r", id),
  ]);
  const keyboard = [
    replyButtons("r", r.email ? id : null, r.phone),
    [
      { text: "📝 Комментарий", callback_data: `nt:${id}` },
      { text: "❌ Отменить бронь", callback_data: `cx:${id}` },
    ],
  ].filter((row) => row.length);
  const sent = await Promise.all(
    telegramChatIds().map((chatId) => sendPlanForWindow(chatId, r.date, r.time, caption, keyboard, id)),
  );
  return sent.some(Boolean);
}

/** Guest cancelled on /r/<token>: the freed table on the plan of that window. */
export async function notifyGuestCancelled(r: StoredReservation) {
  if (!isTelegramConfigured()) return false;
  const caption = lines([
    "🗑 <b>Гость отменил бронь</b> — стол свободен",
    "",
    `👥 <b>${r.guests} чел.</b>   🕖 <b>${tgEscape(r.time)}</b>   🪑 <b>стол ${tablesLabel(r.tables)}</b>`,
    `📅 ${tgEscape(formatRuDate(r.date))}`,
    "",
    `👤 ${tgEscape(r.name)}`,
    r.phone && `📞 ${tgEscape(r.phone)}`,
  ]);
  const keyboard: InlineButton[][] = [[
    { text: "📅 Схема дня", callback_data: `pv:${r.date}` },
    { text: "📋 Брони", callback_data: "list" },
  ]];
  const sent = await Promise.all(
    telegramChatIds().map((chatId) => sendPlanForWindow(chatId, r.date, r.time, caption, keyboard)),
  );
  return sent.some(Boolean);
}

/**
 * 60 minutes before the visit: the guest was asked by WhatsApp/SMS and has
 * not confirmed. No automatic cancellation — the staff decides.
 */
export async function notifyUnconfirmed(r: StoredReservation, minutesLeft: number) {
  if (!isTelegramConfigured()) return false;
  const text = lines([
    `⏳ <b>Гость не подтвердил</b> — визит через ${Math.max(0, Math.round(minutesLeft))} мин`,
    "",
    `🕖 <b>${tgEscape(r.time)}</b>   🪑 <b>стол ${tablesLabel(r.tables)}</b>   👥 ${r.guests} чел.`,
    `👤 ${tgEscape(r.name)}`,
    r.phone && `📞 ${tgEscape(r.phone)}`,
    "",
    "Напоминания отправлены, подтверждения нет. Позвони или напиши гостю — или освободи стол.",
  ]);
  const wa = r.phone ? whatsappLink(r.phone) : null;
  const keyboard: InlineButton[][] = [
    ...(wa ? [[{ text: "💬 WhatsApp", url: wa }]] : []),
    [{ text: "❌ Освободить стол", callback_data: `cx:${r.id}` }],
  ];
  const sent = await Promise.all(
    telegramChatIds().map((chatId) => sendTelegramMessage(chatId, text, { inline_keyboard: keyboard })),
  );
  return sent.some(Boolean);
}

export async function notifyContactRequest(req: NewContactRequest, id: string | null) {
  if (!isTelegramConfigured()) return false;
  const text = lines([
    "✉️ <b>Новый запрос с сайта</b>",
    "",
    `👤 ${tgEscape(req.name)}`,
    `✉️ ${tgEscape(req.email)}`,
    req.phone && `📞 ${tgEscape(req.phone)}`,
    "",
    `<blockquote>${tgEscape(req.message)}</blockquote>`,
    id && refLine("c", id),
  ]);
  const row = replyButtons("c", id, req.phone);
  const markup = row.length ? { inline_keyboard: [row] } : undefined;
  const sent = await Promise.all(telegramChatIds().map((chatId) => sendTelegramMessage(chatId, text, markup)));
  return sent.some(Boolean);
}
