import {
  BOOKING_LEAD_MINUTES,
  BOOKING_WINDOW_DAYS,
  RESTAURANT_TIME_ZONE,
  TIME_SLOTS,
} from "./config";

/**
 * Dates travel as ISO "YYYY-MM-DD" strings in restaurant local time. For
 * formatting they are pinned to 12:00 UTC so no viewer time zone can shift
 * the day.
 */

export type RestaurantNow = { date: string; minutes: number };

/** Current date and minute-of-day in the restaurant's time zone. */
export function restaurantNow(at: Date = new Date()): RestaurantNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function toUtcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = toUtcNoon(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isSlotAvailable(date: string, time: string, now: RestaurantNow): boolean {
  if (date < now.date) return false;
  if (date > now.date) return true;
  return timeToMinutes(time) >= now.minutes + BOOKING_LEAD_MINUTES;
}

/** Today if a slot is still bookable, otherwise tomorrow. */
export function firstBookableDate(now: RestaurantNow): string {
  const todayOpen = TIME_SLOTS.some((slot) => isSlotAvailable(now.date, slot, now));
  return todayOpen ? now.date : addDays(now.date, 1);
}

export function lastBookableDate(now: RestaurantNow): string {
  return addDays(now.date, BOOKING_WINDOW_DAYS);
}

const longDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dayMonth = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "numeric", month: "long" });
const weekdayShort = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", weekday: "short" });
const dayMonthShort = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "numeric", month: "short" });

/** "Samstag, 24. Oktober 2026" */
export function formatLongDate(iso: string): string {
  return longDate.format(toUtcNoon(iso));
}

/** "24. Oktober" */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(toUtcNoon(iso));
}

/** "Sa, 24. Okt." */
export function formatShortDate(iso: string): string {
  const d = toUtcNoon(iso);
  return `${weekdayShort.format(d).replace(/\.$/, "")}, ${dayMonthShort.format(d)}`;
}
