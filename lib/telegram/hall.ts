import { restaurantNow, timeToMinutes } from "@/lib/reservation/dates";
import { VISIT_DURATION_MINUTES } from "@/lib/reservation/config";
import {
  TABLES,
  busyTables,
  overlapping,
  parseTableKey,
  seatsOf,
  seatedAt,
  tableKey,
  tableOptions,
  tablesLabel,
  type Booking,
} from "@/lib/reservation/tables";
import {
  bookReservation,
  bookingsOn,
  cancelReservation,
  getReservation,
  upcomingReservations,
  type StoredReservation,
} from "@/lib/reservation/store";
import {
  callTelegram,
  deleteTelegramMessage,
  sendTelegramMessage,
  sendTelegramPhoto,
  setTelegramButtons,
  tgEscape,
  type InlineButton,
} from "./api";
import { renderPlan, type PlanMark } from "./plan-image";

/**
 * Hall management from the Telegram chat (texts in Russian):
 *   🗺 plan now · 🚶 walk-in (guests → table on the plan, Berlin time now;
 *   🧩 several tables can be joined by hand)
 *   📋 upcoming bookings with ❌ cancel (frees the table for others)
 * Callback data: plan · list · wi · wi:<n> · wm:<n>[:<tables>] · wt:<n>:<tables>
 *                · cx:<id> · cy:<id> · cn
 */

export const MENU: InlineButton[][] = [
  [
    { text: "🗺 Схема сейчас", callback_data: "plan" },
    { text: "🚶 Walk-in", callback_data: "wi" },
  ],
  [{ text: "📋 Брони и отмена", callback_data: "list" }],
];

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const ruShort = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const deWeekday = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", weekday: "short" });

/** "пт, 30 окт." */
export const ruDate = (iso: string) => ruShort.format(noon(iso));
/** "Fr 30.10." (image title — the plan font is Latin only) */
const deDate = (iso: string) =>
  `${deWeekday.format(noon(iso)).replace(".", "")} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

const people = (n: number) => `${n} чел.`;
const until = (time: string) => hhmm(timeToMinutes(time) + VISIT_DURATION_MINUTES);

function marks(bookings: Booking[], highlightId?: string): PlanMark[] {
  return bookings.map((b) => ({
    tables: b.tables,
    guests: b.guests,
    time: b.time,
    walkIn: b.source === "walk_in",
    highlight: Boolean(highlightId && b.id === highlightId),
  }));
}

function planSubtitle(shown: Booking[]) {
  const tables = new Set(shown.flatMap((b) => b.tables)).size;
  const guests = shown.reduce((sum, b) => sum + b.guests, 0);
  return { tables, guests, text: `${tables} / ${TABLES.length} Tische besetzt · ${guests} Gäste` };
}

/** Sends the plan as photo; falls back to the caption as text if rendering fails. */
async function sendPlan(
  chatId: string | number,
  opts: { date: string; time: string; shown: Booking[]; highlightId?: string; caption: string; keyboard?: InlineButton[][] },
) {
  const markup = opts.keyboard?.length ? { inline_keyboard: opts.keyboard } : undefined;
  try {
    const png = await renderPlan({
      title: `${deDate(opts.date)} · ${opts.time}`,
      subtitle: planSubtitle(opts.shown).text,
      marks: marks(opts.shown, opts.highlightId),
    });
    if (await sendTelegramPhoto(chatId, png, opts.caption, markup)) return true;
  } catch (error) {
    console.error("[telegram] plan render failed:", error);
  }
  return Boolean(await sendTelegramMessage(chatId, opts.caption, markup));
}

/** Plan for a booking's window (new booking, cancellation). */
export async function sendPlanForWindow(
  chatId: string | number,
  date: string,
  time: string,
  caption: string,
  keyboard?: InlineButton[][],
  highlightId?: string,
) {
  const bookings = (await bookingsOn(date)) ?? [];
  return sendPlan(chatId, { date, time, shown: overlapping(bookings, time), highlightId, caption, keyboard });
}

export async function sendPlanNow(chatId: string | number) {
  const now = restaurantNow();
  const time = hhmm(now.minutes);
  const bookings = (await bookingsOn(now.date)) ?? [];
  const seated = seatedAt(bookings, now.minutes);
  const later = bookings
    .filter((b) => timeToMinutes(b.time) > now.minutes)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 12);
  const stats = planSubtitle(seated);
  const caption = [
    `🗺 <b>Зал сейчас</b> · ${ruDate(now.date)}, ${time}`,
    `Занято столов: <b>${stats.tables} из ${TABLES.length}</b> · гостей: <b>${stats.guests}</b>`,
    ...(later.length
      ? ["", "<b>Дальше сегодня:</b>", ...later.map((b) => `${b.time} · стол ${tablesLabel(b.tables)} · ${people(b.guests)} · ${tgEscape(b.name ?? "")}`)]
      : []),
  ].join("\n");
  await sendPlan(chatId, {
    date: now.date,
    time,
    shown: seated,
    caption,
    keyboard: [[{ text: "🔄 Обновить", callback_data: "plan" }, { text: "🚶 Walk-in", callback_data: "wi" }], [{ text: "📋 Брони и отмена", callback_data: "list" }]],
  });
}

export async function startWalkIn(chatId: string | number) {
  const sizes = Array.from({ length: 12 }, (_, i) => i + 1);
  await sendTelegramMessage(chatId, "🚶 <b>Walk-in</b> — сколько гостей?", {
    inline_keyboard: [sizes.slice(0, 4), sizes.slice(4, 8), sizes.slice(8)].map((row) =>
      row.map((n) => ({ text: String(n), callback_data: `wi:${n}` })),
    ),
  });
}

const joinButton = (guests: number): InlineButton[] => [
  { text: "🧩 Объединить столы вручную", callback_data: `wm:${guests}` },
];

/**
 * Manual join: free tables as toggles (☑/☐); the selection travels in the
 * callback data, so the bot keeps no state. Confirm books them as one walk-in.
 */
export async function walkInJoinTables(
  chatId: string | number,
  messageId: number | undefined,
  guests: number,
  selectionKey: string | undefined,
) {
  const now = restaurantNow();
  const time = hhmm(now.minutes);
  const busy = busyTables((await bookingsOn(now.date)) ?? [], time);
  const selected = (selectionKey ? parseTableKey(selectionKey) ?? [] : []).filter((id) => !busy.has(id));
  const free = TABLES.filter((t) => !busy.has(t.id));
  if (!free.length) {
    await sendTelegramMessage(chatId, "😕 Сейчас все столы заняты.");
    return;
  }

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    return `wm:${guests}:${tableKey(next.sort((a, b) => a - b))}`;
  };
  const tableButtons = free.map((t) => ({
    text: `${selected.includes(t.id) ? "☑" : "☐"} ${t.id} · ${t.seats}`,
    callback_data: toggle(t.id),
  }));
  const rows: InlineButton[][] = [];
  for (let i = 0; i < tableButtons.length; i += 3) rows.push(tableButtons.slice(i, i + 3));
  if (selected.length) {
    const seats = seatsOf(selected);
    rows.push([
      {
        text: `✅ Посадить ${people(guests)} за ${tablesLabel(selected)} (${seats} мест)`,
        callback_data: `wt:${guests}:${tableKey(selected)}`,
      },
    ]);
  }
  rows.push([{ text: "↩️ Закрыть", callback_data: "cn" }]);

  const text = [
    `🧩 <b>Объединить столы · ${people(guests)}</b> · сейчас ${time}`,
    "Отметь столы, которые сдвигаете вместе (свободны до " + until(time) + ").",
    selected.length
      ? `Выбрано: <b>${tablesLabel(selected)}</b> · мест по схеме: ${seatsOf(selected)}` +
        (seatsOf(selected) < guests ? " — с торцами поместятся?" : "")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // First open → new message; toggles → just swap the buttons.
  if (selectionKey === undefined || !messageId) {
    await sendTelegramMessage(chatId, text, { inline_keyboard: rows });
  } else {
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: rows },
    });
  }
}

/** Step 2: free tables for `guests` from now on, as buttons under the plan. */
export async function walkInChooseTable(chatId: string | number, messageId: number | undefined, guests: number) {
  if (messageId) await setTelegramButtons(chatId, messageId);
  const now = restaurantNow();
  const time = hhmm(now.minutes);
  const bookings = (await bookingsOn(now.date)) ?? [];
  const options = tableOptions(busyTables(bookings, time), guests).slice(0, 8);

  if (!options.length) {
    await sendPlan(chatId, {
      date: now.date,
      time,
      shown: overlapping(bookings, time),
      caption: `😕 Нет свободного стола или готовой сдвижки на <b>${people(guests)}</b> до ${until(time)}. Можно объединить столы вручную.`,
      keyboard: [joinButton(guests), [{ text: "🗺 Схема сейчас", callback_data: "plan" }]],
    });
    return;
  }

  await sendPlan(chatId, {
    date: now.date,
    time,
    shown: overlapping(bookings, time),
    caption: `🚶 <b>Walk-in · ${people(guests)}</b> · сейчас ${time}\nВыбери стол (будет занят до ${until(time)}):`,
    keyboard: [
      ...options.map((o, i) => [
        {
          text: `${i === 0 ? "⭐ " : ""}Стол ${tablesLabel(o.tables)} · ${o.seats} мест`,
          callback_data: `wt:${guests}:${tableKey(o.tables)}`,
        },
      ]),
      joinButton(guests),
    ],
  });
}

/** Step 3: book the chosen table at the current Berlin time. */
export async function walkInBook(chatId: string | number, messageId: number | undefined, guests: number, key: string) {
  const tables = parseTableKey(key);
  if (!tables) return;
  const now = restaurantNow();
  const time = hhmm(now.minutes);
  const result = await bookReservation(
    {
      date: now.date,
      time,
      guests,
      name: "Walk-in",
      email: null,
      phone: null,
      notes: null,
      ipHash: null,
      userAgent: "telegram",
      source: "walk_in",
    },
    tables,
  );

  if (!result.ok) {
    if (result.reason === "taken") {
      await sendTelegramMessage(chatId, `⚠️ Стол ${tablesLabel(tables)} уже занят — выбери другой.`);
      await walkInChooseTable(chatId, messageId, guests);
    } else {
      await sendTelegramMessage(chatId, "⚠️ Не удалось сохранить walk-in. Попробуй ещё раз.");
    }
    return;
  }

  if (messageId) await setTelegramButtons(chatId, messageId);
  await sendPlanForWindow(
    chatId,
    now.date,
    time,
    `✅ <b>Walk-in</b> · стол ${tablesLabel(result.tables)} · ${people(guests)} · ${time}–${until(time)}`,
    [[{ text: "❌ Освободить стол", callback_data: `cx:${result.id}` }, { text: "🗺 Схема сейчас", callback_data: "plan" }]],
    result.id,
  );
}

function bookingLine(r: StoredReservation, withDate = false) {
  const who = r.source === "walk_in" ? "Walk-in" : tgEscape(r.name);
  return `${withDate ? `${ruDate(r.date)} · ` : ""}${r.time} · стол ${tablesLabel(r.tables)} · ${people(r.guests)} · ${who}`;
}

/** Upcoming confirmed bookings (still running or later), each with a cancel button. */
export async function sendUpcomingList(chatId: string | number) {
  const now = restaurantNow();
  const list = (await upcomingReservations(now.date, 30)).filter(
    (r) => r.date > now.date || timeToMinutes(r.time) + VISIT_DURATION_MINUTES > now.minutes,
  );
  if (!list.length) {
    await sendTelegramMessage(chatId, "📋 Активных броней нет.", { inline_keyboard: MENU });
    return;
  }
  const lines: string[] = ["📋 <b>Брони</b> — нажми, чтобы отменить и освободить стол:"];
  let day = "";
  for (const r of list) {
    if (r.date !== day) {
      day = r.date;
      lines.push("", `<b>${ruDate(r.date)}</b>`);
    }
    lines.push(bookingLine(r));
  }
  await sendTelegramMessage(chatId, lines.join("\n"), {
    inline_keyboard: list.map((r) => [
      {
        text: `❌ ${r.date.slice(8, 10)}.${r.date.slice(5, 7)} ${r.time} · ст. ${tablesLabel(r.tables)} · ${r.source === "walk_in" ? "Walk-in" : r.name}`.slice(0, 60),
        callback_data: `cx:${r.id}`,
      },
    ]),
  });
}

export async function askCancel(chatId: string | number, id: string) {
  const r = await getReservation(id);
  if (!r || r.status !== "confirmed") {
    await sendTelegramMessage(chatId, "Эта бронь уже отменена или не найдена.");
    return;
  }
  await sendTelegramMessage(chatId, `Отменить бронь и освободить стол?\n<b>${bookingLine(r, true)}</b>`, {
    inline_keyboard: [[
      { text: "✅ Да, отменить", callback_data: `cy:${r.id}` },
      { text: "Нет", callback_data: "cn" },
    ]],
  });
}

export async function confirmCancel(chatId: string | number, messageId: number | undefined, id: string) {
  if (messageId) await deleteTelegramMessage(chatId, messageId);
  const r = await cancelReservation(id);
  if (!r) {
    await sendTelegramMessage(chatId, "Эта бронь уже отменена.");
    return;
  }
  await sendPlanForWindow(
    chatId,
    r.date,
    r.time,
    `🗑 <b>Бронь отменена</b> · стол ${tablesLabel(r.tables)} свободен\n${bookingLine(r, true)}`,
    [[{ text: "📋 Брони и отмена", callback_data: "list" }, { text: "🗺 Схема сейчас", callback_data: "plan" }]],
  );
}

export async function dismissCancel(chatId: string | number, messageId: number | undefined) {
  if (messageId) await deleteTelegramMessage(chatId, messageId);
}
