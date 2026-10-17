import { TIME_SLOTS, VISIT_DURATION_MINUTES } from "./config";
import { timeToMinutes } from "./dates";

/**
 * Floor plan and table allocation. Each booking holds concrete tables for
 * VISIT_DURATION_MINUTES; a new booking gets the free table — or combination
 * of pushed-together tables — that fits the group best (see tableOptions).
 *
 * Mirrored in SQL by public.book_reservation (supabase/schema.sql), which
 * receives TABLES/TABLE_COMBOS as arguments and makes the final, atomic pick.
 */

export type TableDef = {
  id: number;
  seats: number;
  /** Position on the plan (PLAN_SIZE coordinates, from the restaurant's own sketch). */
  x: number;
  y: number;
  w: number;
  h: number;
  chairs: { top?: number; bottom?: number; left?: number; right?: number };
};

export const PLAN_SIZE = { w: 540, h: 720 };

const two = (id: number, x: number, y: number): TableDef => ({
  id,
  seats: 2,
  x,
  y,
  w: 64,
  h: 51,
  chairs: { left: 1, right: 1 },
});

export const TABLES: TableDef[] = [
  two(1, 20, 271),
  two(2, 20, 192),
  two(3, 20, 117),
  two(4, 20, 42),
  two(5, 341, 105),
  two(6, 341, 185),
  two(7, 341, 389),
  { id: 8, seats: 8, x: 309, y: 573, w: 153, h: 64, chairs: { top: 3, bottom: 3, left: 1, right: 1 } },
  two(9, 158, 645),
  two(10, 43, 531),
  { id: 11, seats: 4, x: 89, y: 389, w: 105, h: 64, chairs: { top: 2, bottom: 2 } },
];

/**
 * Neighbouring tables that can be pushed together, with the seats the joined
 * table really has (head ends add chairs, so it can be more than the sum).
 * Staff can join any other free tables by hand in the bot (walk-in).
 */
export const TABLE_COMBOS: { tables: number[]; seats: number }[] = [
  { tables: [1, 2], seats: 4 },
  { tables: [2, 3], seats: 4 },
  { tables: [3, 4], seats: 4 },
  { tables: [5, 6], seats: 4 },
  { tables: [1, 2, 3], seats: 7 },
  { tables: [2, 3, 4], seats: 7 },
];

export const TOTAL_SEATS = TABLES.reduce((sum, t) => sum + t.seats, 0);

export type BookingSource = "online" | "walk_in" | "phone";

export type Booking = {
  id?: string;
  time: string;
  guests: number;
  tables: number[];
  source?: BookingSource;
  name?: string;
  /** Guest's wish from the form or a staff comment from the bot ("веган"). */
  notes?: string | null;
};

export type TableOption = { tables: number[]; seats: number };

/** Plain sum of the tables' own seats (for tables joined by hand). */
export const seatsOf = (ids: number[]) =>
  ids.reduce((sum, id) => sum + (TABLES.find((t) => t.id === id)?.seats ?? 0), 0);

function overlapsWindow(start: number, other: number) {
  return start < other + VISIT_DURATION_MINUTES && start + VISIT_DURATION_MINUTES > other;
}

/** Tables taken by bookings whose stay overlaps a stay starting at `time`. */
export function busyTables(bookings: Booking[], time: string): Set<number> {
  const start = timeToMinutes(time);
  const busy = new Set<number>();
  for (const b of bookings) {
    if (overlapsWindow(start, timeToMinutes(b.time))) b.tables.forEach((id) => busy.add(id));
  }
  return busy;
}

/** Bookings whose stay overlaps a stay starting at `time` (plan for a new booking). */
export function overlapping(bookings: Booking[], time: string): Booking[] {
  const start = timeToMinutes(time);
  return bookings.filter((b) => overlapsWindow(start, timeToMinutes(b.time)));
}

/** Bookings seated at an instant (for "Схема сейчас"). */
export function seatedAt(bookings: Booking[], minute: number): Booking[] {
  return bookings.filter((b) => {
    const start = timeToMinutes(b.time);
    return start <= minute && minute < start + VISIT_DURATION_MINUTES;
  });
}

/** Every extra pushed-together table counts like this many empty seats. */
const JOIN_PENALTY = 2;

/**
 * Free tables/combinations that seat `guests`, best fit first: fewest seats,
 * where joining tables counts JOIN_PENALTY seats per extra table — so a
 * single table wins unless it is clearly bigger, and the big tables stay free
 * for big groups.
 */
const cost = (o: TableOption) => o.seats + JOIN_PENALTY * (o.tables.length - 1);

export function tableOptions(busy: Set<number>, guests: number): TableOption[] {
  const candidates = [...TABLES.map((t) => ({ tables: [t.id], seats: t.seats })), ...TABLE_COMBOS];
  return candidates
    .filter((o) => o.tables.every((id) => !busy.has(id)))
    .filter((o) => o.seats >= guests)
    .sort((a, b) => cost(a) - cost(b) || a.tables.length - b.tables.length || a.tables[0]! - b.tables[0]!);
}

export function pickTables(bookings: Booking[], time: string, guests: number): number[] | null {
  return tableOptions(busyTables(bookings, time), guests)[0]?.tables ?? null;
}

export type SlotAvailability = { maxParty: number; freeSeats: number };

/** Largest group that still fits at `time`, and free seats overall. */
export function slotAvailability(bookings: Booking[], time: string): SlotAvailability {
  const busy = busyTables(bookings, time);
  const options = tableOptions(busy, 1);
  return {
    maxParty: options.reduce((max, o) => Math.max(max, o.seats), 0),
    freeSeats: TABLES.filter((t) => !busy.has(t.id)).reduce((sum, t) => sum + t.seats, 0),
  };
}

export type AvailabilityBySlot = Record<string, SlotAvailability>;

export function availabilityBySlot(bookings: Booking[]): AvailabilityBySlot {
  return Object.fromEntries(TIME_SLOTS.map((slot) => [slot, slotAvailability(bookings, slot)]));
}

/** "1-2" ⇄ [1, 2] — compact table keys for Telegram callback data. */
export function tableKey(tables: number[]): string {
  return tables.join("-");
}

export function parseTableKey(key: string): number[] | null {
  const ids = key.split("-").map(Number);
  const valid = ids.length > 0 && ids.every((id) => TABLES.some((t) => t.id === id));
  return valid ? [...new Set(ids)].sort((a, b) => a - b) : null;
}

export function tablesLabel(tables: number[]): string {
  return tables.join("+");
}
