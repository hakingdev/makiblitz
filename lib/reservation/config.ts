/**
 * Reservation rules — the single place to change opening days, slots and
 * capacity. Shared by the booking form (client) and the API (server); the
 * Supabase function receives capacity and duration from here as arguments.
 */

export const RESTAURANT_TIME_ZONE = "Europe/Berlin";

/**
 * Bookable days. For now only these two dates; set to `null` to switch to
 * the regular schedule in OPEN_WEEKDAYS.
 */
export const OPEN_DATES: readonly string[] | null = ["2026-10-30", "2026-10-31"];

/** Regular schedule once OPEN_DATES is null (0 = Sunday … 5 = Friday, 6 = Saturday). */
export const OPEN_WEEKDAYS: readonly number[] = [5, 6];

/** Arrival times (HH:MM, restaurant local time). */
export const TIME_SLOTS = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
] as const;

/** A table stays occupied this long — a table booked for 18:00 is free again at 20:30. */
export const VISIT_DURATION_MINUTES = 150;

/** From this many free seats down, the form says "nur noch N Plätze frei". Tables: tables.ts. */
export const FEW_SEATS_LEFT = 2;

/** Online group sizes; the last one is labelled "5+" — larger groups go by e-mail. */
export const GUEST_OPTIONS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_GUESTS = 2;

/** A slot that starts sooner than this is no longer bookable for today. */
export const BOOKING_LEAD_MINUTES = 60;

/** How far ahead dates are offered. */
export const BOOKING_WINDOW_DAYS = 90;
