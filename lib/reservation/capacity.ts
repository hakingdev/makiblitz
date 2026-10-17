import { SEAT_CAPACITY, TIME_SLOTS, VISIT_DURATION_MINUTES } from "./config";
import { timeToMinutes } from "./dates";

/**
 * Seat capacity with table turnover: every booking occupies its seats from
 * its arrival time for VISIT_DURATION_MINUTES. A new booking fits when the
 * busiest moment of its own stay still has room for the whole group.
 *
 * Mirrored in SQL by public.book_reservation (supabase/schema.sql), which is
 * the authoritative check; keep both in sync.
 */

export type Booking = { time: string; guests: number };

/** Guests seated at minute `at` of the day. */
function seatedAt(bookings: Booking[], at: number): number {
  let seated = 0;
  for (const b of bookings) {
    const start = timeToMinutes(b.time);
    if (start <= at && at < start + VISIT_DURATION_MINUTES) seated += b.guests;
  }
  return seated;
}

/** Free seats for a group arriving at `time` (the minimum over its whole stay). */
export function seatsLeftAt(bookings: Booking[], time: string): number {
  const start = timeToMinutes(time);
  const end = start + VISIT_DURATION_MINUTES;
  // Occupancy only rises when another booking starts, so these are the only
  // moments that can be the peak.
  const checkpoints = [start, ...bookings.map((b) => timeToMinutes(b.time)).filter((m) => m > start && m < end)];
  const peak = Math.max(...checkpoints.map((m) => seatedAt(bookings, m)));
  return Math.max(0, SEAT_CAPACITY - peak);
}

export type SeatsBySlot = Record<string, number>;

export function seatsBySlot(bookings: Booking[]): SeatsBySlot {
  return Object.fromEntries(TIME_SLOTS.map((slot) => [slot, seatsLeftAt(bookings, slot)]));
}
