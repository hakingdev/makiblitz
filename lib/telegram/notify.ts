import { SEAT_CAPACITY } from "@/lib/reservation/config";
import type { NewReservation } from "@/lib/reservation/store";
import type { NewContactRequest } from "@/lib/contact/store";
import {
  isTelegramConfigured,
  sendTelegramMessage,
  telegramChatIds,
  tgEscape,
  whatsappLink,
  type InlineButton,
} from "./api";
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

function buttons(kind: RefKind, id: string | null, phone: string | null): InlineButton[][] {
  const row: InlineButton[] = [];
  if (id) row.push({ text: "✍️ Ответить", callback_data: `reply:${kind}:${id}` });
  const wa = phone ? whatsappLink(phone) : null;
  if (wa) row.push({ text: "💬 WhatsApp", url: wa });
  return row.length ? [row] : [];
}

async function send(lines: (string | false | null | undefined)[], keyboard: InlineButton[][]) {
  if (!isTelegramConfigured()) return false;
  const text = lines.filter((line): line is string => typeof line === "string").join("\n");
  const markup = keyboard.length ? { inline_keyboard: keyboard } : undefined;
  const sent = await Promise.all(telegramChatIds().map((chatId) => sendTelegramMessage(chatId, text, markup)));
  return sent.some(Boolean);
}

export function notifyReservation(r: NewReservation, id: string, seatsLeft: number) {
  return send(
    [
      "🍣 <b>Новая бронь</b>",
      "",
      `👥 <b>${r.guests} чел.</b>   🕖 <b>${tgEscape(r.time)}</b>`,
      `📅 ${tgEscape(formatRuDate(r.date))}`,
      "",
      `👤 ${tgEscape(r.name)}`,
      `✉️ ${tgEscape(r.email)}`,
      r.phone && `📞 ${tgEscape(r.phone)}`,
      r.notes && `💬 ${tgEscape(r.notes)}`,
      "",
      `<i>Свободно в это время после брони: ${seatsLeft} из ${SEAT_CAPACITY}</i>`,
      refLine("r", id),
    ],
    buttons("r", id, r.phone),
  );
}

export function notifyContactRequest(req: NewContactRequest, id: string | null) {
  return send(
    [
      "✉️ <b>Новый запрос с сайта</b>",
      "",
      `👤 ${tgEscape(req.name)}`,
      `✉️ ${tgEscape(req.email)}`,
      req.phone && `📞 ${tgEscape(req.phone)}`,
      "",
      `<blockquote>${tgEscape(req.message)}</blockquote>`,
      id && refLine("c", id),
    ],
    buttons("c", id, req.phone),
  );
}
