import { readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isUuid } from "@/lib/supabase";
import { SEAT_CAPACITY, VISIT_DURATION_MINUTES } from "./config";
import { seatsLeftAt, type Booking } from "./capacity";

/**
 * Server-only reservation storage.
 *
 *  - Supabase (same project as the waitlist) when SUPABASE_URL +
 *    SUPABASE_SERVICE_ROLE_KEY are set. Booking goes through the SQL function
 *    public.book_reservation, which locks the day and re-checks capacity, so
 *    two guests can never both take the last seats.
 *  - A local JSON file otherwise — zero-config fallback for `next dev`
 *    (never works on Vercel's read-only filesystem).
 */

export type NewReservation = {
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  ipHash: string | null;
  userAgent: string;
};

export type StoredReservation = {
  id: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
};

export type BookResult =
  | { ok: true; id: string; seatsLeft: number }
  | { ok: false; reason: "full"; seatsLeft: number }
  | { ok: false; reason: "unavailable" };

interface ReservationStore {
  /** Confirmed bookings of one day, or null when the store can't be read. */
  bookingsOn(date: string): Promise<Booking[] | null>;
  book(reservation: NewReservation): Promise<BookResult>;
  byId(id: string): Promise<StoredReservation | null>;
}

class SupabaseReservationStore implements ReservationStore {
  constructor(private readonly client: SupabaseClient) {}

  async bookingsOn(date: string): Promise<Booking[] | null> {
    const { data, error } = await this.client
      .from("reservations")
      .select("visit_time,guests")
      .eq("visit_date", date)
      .eq("status", "confirmed");
    if (error) {
      console.error("[reservation] Supabase read failed:", error);
      return null;
    }
    return (data ?? []).map((row) => ({
      time: String(row.visit_time).slice(0, 5),
      guests: Number(row.guests),
    }));
  }

  async book(r: NewReservation): Promise<BookResult> {
    const { data, error } = await this.client.rpc("book_reservation", {
      p_date: r.date,
      p_time: r.time,
      p_guests: r.guests,
      p_capacity: SEAT_CAPACITY,
      p_duration_minutes: VISIT_DURATION_MINUTES,
      p_name: r.name,
      p_email: r.email,
      p_phone: r.phone,
      p_notes: r.notes,
      p_ip_hash: r.ipHash,
      p_user_agent: r.userAgent,
    });
    if (error || !data) {
      console.error("[reservation] Supabase booking failed:", error);
      return { ok: false, reason: "unavailable" };
    }
    const result = data as { ok: boolean; id?: string; seats_left: number };
    return result.ok
      ? { ok: true, id: String(result.id), seatsLeft: result.seats_left }
      : { ok: false, reason: "full", seatsLeft: result.seats_left };
  }

  async byId(id: string): Promise<StoredReservation | null> {
    const { data, error } = await this.client
      .from("reservations")
      .select("id,visit_date,visit_time,guests,name,email,phone,notes")
      .eq("id", id)
      .maybeSingle();
    if (error) console.error("[reservation] Supabase read failed:", error);
    if (!data) return null;
    return {
      id: String(data.id),
      date: String(data.visit_date),
      time: String(data.visit_time).slice(0, 5),
      guests: Number(data.guests),
      name: String(data.name),
      email: String(data.email),
      phone: data.phone ? String(data.phone) : null,
      notes: data.notes ? String(data.notes) : null,
    };
  }
}

type LocalRow = NewReservation & { id: string; status: "confirmed"; createdAt: string };

const LOCAL_FILE =
  process.env.RESERVATIONS_FILE ?? path.join(process.cwd(), "reservations.local.json");

class LocalReservationStore implements ReservationStore {
  /** Serializes read-check-write so the capacity check can't race locally either. */
  private queue: Promise<unknown> = Promise.resolve();

  private async rows(): Promise<LocalRow[]> {
    try {
      return JSON.parse(await readFile(LOCAL_FILE, "utf8")) as LocalRow[];
    } catch {
      return [];
    }
  }

  async bookingsOn(date: string): Promise<Booking[] | null> {
    return (await this.rows())
      .filter((row) => row.date === date && row.status === "confirmed")
      .map((row) => ({ time: row.time, guests: row.guests }));
  }

  book(r: NewReservation): Promise<BookResult> {
    const run = this.queue.then(async (): Promise<BookResult> => {
      const rows = await this.rows();
      const day = rows
        .filter((row) => row.date === r.date && row.status === "confirmed")
        .map((row) => ({ time: row.time, guests: row.guests }));
      const before = seatsLeftAt(day, r.time);
      if (r.guests > before) return { ok: false, reason: "full", seatsLeft: before };

      const row: LocalRow = { ...r, id: randomUUID(), status: "confirmed", createdAt: new Date().toISOString() };
      await writeFile(LOCAL_FILE, JSON.stringify([...rows, row], null, 2), "utf8");
      return { ok: true, id: row.id, seatsLeft: before - r.guests };
    });
    this.queue = run.catch(() => undefined);
    return run.catch((error) => {
      console.error("[reservation] could not write", LOCAL_FILE, error);
      return { ok: false, reason: "unavailable" } as const;
    });
  }

  async byId(id: string): Promise<StoredReservation | null> {
    const row = (await this.rows()).find((r) => r.id === id);
    return row
      ? { id: row.id, date: row.date, time: row.time, guests: row.guests, name: row.name, email: row.email, phone: row.phone, notes: row.notes }
      : null;
  }
}

let store: ReservationStore | undefined;

function getStore(): ReservationStore {
  if (store) return store;
  const db = getSupabase();
  store = db ? new SupabaseReservationStore(db) : new LocalReservationStore();
  return store;
}

export function bookingsOn(date: string) {
  return getStore().bookingsOn(date);
}

export function bookReservation(reservation: NewReservation) {
  return getStore().book(reservation);
}

export function getReservation(id: string): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().byId(id) : Promise.resolve(null);
}
