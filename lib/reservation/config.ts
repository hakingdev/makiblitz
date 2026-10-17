/**
 * Reservation rules. Slots mirror the Figma prototype until the opening hours
 * are confirmed ("Öffnungszeiten werden ergänzt") — adjust here only.
 */

export const RESTAURANT_TIME_ZONE = "Europe/Berlin";

/** Bookable start times (HH:MM, restaurant local time). */
export const TIME_SLOTS = ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00"] as const;

/** Online group sizes; the last one is labelled "5+" — larger groups go by e-mail. */
export const GUEST_OPTIONS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_GUESTS = 2;

/** A slot that starts sooner than this is no longer bookable for today. */
export const BOOKING_LEAD_MINUTES = 60;

/** How far ahead the date picker reaches. */
export const BOOKING_WINDOW_DAYS = 90;

/** Length of the "Zum Kalender hinzufügen" entry. */
export const VISIT_DURATION_MINUTES = 120;
