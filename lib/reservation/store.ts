import { readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isUuid } from "@/lib/supabase";
import { VISIT_DURATION_MINUTES } from "./config";
import { TABLES, TABLE_COMBOS, busyTables, pickTables, type Booking, type BookingSource } from "./tables";

/**
 * Server-only reservation storage.
 *
 *  - Supabase (same project as the waitlist) when SUPABASE_URL +
 *    SUPABASE_SERVICE_ROLE_KEY are set. Booking goes through the SQL function
 *    public.book_reservation, which locks the day, picks the tables and
 *    inserts atomically — two guests can never get the same table.
 *  - A local JSON file otherwise — zero-config fallback for `next dev`
 *    (never works on Vercel's read-only filesystem).
 */

export type NewReservation = {
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  ipHash: string | null;
  userAgent: string;
  source: BookingSource;
};

export type StoredReservation = {
  id: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tables: number[];
  source: BookingSource;
  status: "confirmed" | "cancelled";
};

export type BookResult =
  | { ok: true; id: string; tables: number[] }
  | { ok: false; reason: "full" | "taken" | "unavailable" };

interface ReservationStore {
  /** Confirmed bookings of one day, or null when the store can't be read. */
  bookingsOn(date: string): Promise<Booking[] | null>;
  /** `forceTables`: staff picked the tables (walk-in); otherwise best fit. */
  book(reservation: NewReservation, forceTables?: number[]): Promise<BookResult>;
  byId(id: string): Promise<StoredReservation | null>;
  /** Cancels a confirmed booking; returns it, or null if there was nothing to cancel. */
  cancel(id: string): Promise<StoredReservation | null>;
  /** Confirmed bookings from `fromDate` on, in order. */
  upcoming(fromDate: string, limit: number): Promise<StoredReservation[]>;
  /** Replaces the comment of a confirmed booking (null clears it). */
  setNotes(id: string, notes: string | null): Promise<StoredReservation | null>;
}

const COLUMNS = "id,visit_date,visit_time,guests,table_ids,source,status,name,email,phone,notes";

type Row = {
  id: string;
  visit_date: string;
  visit_time: string;
  guests: number;
  table_ids: number[] | null;
  source: BookingSource | null;
  status: "confirmed" | "cancelled";
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

function fromRow(row: Row): StoredReservation {
  return {
    id: String(row.id),
    date: String(row.visit_date),
    time: String(row.visit_time).slice(0, 5),
    guests: Number(row.guests),
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    tables: (row.table_ids ?? []).map(Number),
    source: row.source ?? "online",
    status: row.status,
  };
}

export function toBooking(r: StoredReservation): Booking {
  return { id: r.id, time: r.time, guests: r.guests, tables: r.tables, source: r.source, name: r.name, notes: r.notes };
}

class SupabaseReservationStore implements ReservationStore {
  constructor(private readonly client: SupabaseClient) {}

  async bookingsOn(date: string): Promise<Booking[] | null> {
    const { data, error } = await this.client
      .from("reservations")
      .select(COLUMNS)
      .eq("visit_date", date)
      .eq("status", "confirmed");
    if (error) {
      console.error("[reservation] Supabase read failed:", error);
      return null;
    }
    return (data as Row[]).map((row) => toBooking(fromRow(row)));
  }

  async book(r: NewReservation, forceTables?: number[]): Promise<BookResult> {
    const { data, error } = await this.client.rpc("book_reservation", {
      p_date: r.date,
      p_time: r.time,
      p_guests: r.guests,
      p_duration_minutes: VISIT_DURATION_MINUTES,
      p_tables: TABLES.map(({ id, seats }) => ({ id, seats })),
      p_combos: TABLE_COMBOS,
      p_force_tables: forceTables ?? null,
      p_source: r.source,
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
    const result = data as { ok: boolean; id?: string; tables?: number[]; reason?: "full" | "taken" };
    return result.ok
      ? { ok: true, id: String(result.id), tables: (result.tables ?? []).map(Number) }
      : { ok: false, reason: result.reason ?? "full" };
  }

  async byId(id: string): Promise<StoredReservation | null> {
    const { data, error } = await this.client.from("reservations").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) console.error("[reservation] Supabase read failed:", error);
    return data ? fromRow(data as Row) : null;
  }

  async cancel(id: string): Promise<StoredReservation | null> {
    const { data, error } = await this.client
      .from("reservations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "confirmed")
      .select(COLUMNS)
      .maybeSingle();
    if (error) console.error("[reservation] Supabase cancel failed:", error);
    return data ? fromRow(data as Row) : null;
  }

  async upcoming(fromDate: string, limit: number): Promise<StoredReservation[]> {
    const { data, error } = await this.client
      .from("reservations")
      .select(COLUMNS)
      .eq("status", "confirmed")
      .gte("visit_date", fromDate)
      .order("visit_date")
      .order("visit_time")
      .limit(limit);
    if (error) console.error("[reservation] Supabase read failed:", error);
    return ((data as Row[] | null) ?? []).map(fromRow);
  }

  async setNotes(id: string, notes: string | null): Promise<StoredReservation | null> {
    const { data, error } = await this.client
      .from("reservations")
      .update({ notes })
      .eq("id", id)
      .eq("status", "confirmed")
      .select(COLUMNS)
      .maybeSingle();
    if (error) console.error("[reservation] Supabase notes update failed:", error);
    return data ? fromRow(data as Row) : null;
  }
}

type LocalRow = StoredReservation & { ipHash: string | null; userAgent: string; createdAt: string };

const LOCAL_FILE =
  process.env.RESERVATIONS_FILE ?? path.join(process.cwd(), "reservations.local.json");

class LocalReservationStore implements ReservationStore {
  /** Serializes read-check-write so the table pick can't race locally either. */
  private queue: Promise<unknown> = Promise.resolve();

  private async rows(): Promise<LocalRow[]> {
    try {
      return (JSON.parse(await readFile(LOCAL_FILE, "utf8")) as LocalRow[]).map((row) => ({
        ...row,
        tables: row.tables ?? [],
        source: row.source ?? "online",
        status: row.status ?? "confirmed",
      }));
    } catch {
      return [];
    }
  }

  private serialized<T>(fn: (rows: LocalRow[]) => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => fn(await this.rows()));
    this.queue = run.catch(() => undefined);
    return run;
  }

  async bookingsOn(date: string): Promise<Booking[] | null> {
    return (await this.rows()).filter((r) => r.date === date && r.status === "confirmed").map(toBooking);
  }

  book(r: NewReservation, forceTables?: number[]): Promise<BookResult> {
    return this.serialized(async (rows): Promise<BookResult> => {
      const day = rows.filter((row) => row.date === r.date && row.status === "confirmed").map(toBooking);
      let tables: number[] | null;
      if (forceTables) {
        const busy = busyTables(day, r.time);
        if (forceTables.some((id) => busy.has(id))) return { ok: false, reason: "taken" };
        tables = forceTables;
      } else {
        tables = pickTables(day, r.time, r.guests);
      }
      if (!tables) return { ok: false, reason: "full" };

      const row: LocalRow = {
        id: randomUUID(),
        date: r.date,
        time: r.time,
        guests: r.guests,
        name: r.name,
        email: r.email,
        phone: r.phone,
        notes: r.notes,
        tables,
        source: r.source,
        status: "confirmed",
        ipHash: r.ipHash,
        userAgent: r.userAgent,
        createdAt: new Date().toISOString(),
      };
      await writeFile(LOCAL_FILE, JSON.stringify([...rows, row], null, 2), "utf8");
      return { ok: true, id: row.id, tables };
    }).catch((error) => {
      console.error("[reservation] could not write", LOCAL_FILE, error);
      return { ok: false, reason: "unavailable" } as const;
    });
  }

  async byId(id: string): Promise<StoredReservation | null> {
    return (await this.rows()).find((r) => r.id === id) ?? null;
  }

  cancel(id: string): Promise<StoredReservation | null> {
    return this.serialized(async (rows) => {
      const target = rows.find((r) => r.id === id && r.status === "confirmed");
      if (!target) return null;
      const next = rows.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r));
      await writeFile(LOCAL_FILE, JSON.stringify(next, null, 2), "utf8");
      return { ...target, status: "cancelled" as const };
    });
  }

  async upcoming(fromDate: string, limit: number): Promise<StoredReservation[]> {
    return (await this.rows())
      .filter((r) => r.status === "confirmed" && r.date >= fromDate)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, limit);
  }

  setNotes(id: string, notes: string | null): Promise<StoredReservation | null> {
    return this.serialized(async (rows) => {
      const target = rows.find((r) => r.id === id && r.status === "confirmed");
      if (!target) return null;
      const next = rows.map((r) => (r.id === id ? { ...r, notes } : r));
      await writeFile(LOCAL_FILE, JSON.stringify(next, null, 2), "utf8");
      return { ...target, notes };
    });
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

export function bookReservation(reservation: NewReservation, forceTables?: number[]) {
  return getStore().book(reservation, forceTables);
}

export function getReservation(id: string): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().byId(id) : Promise.resolve(null);
}

export function cancelReservation(id: string): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().cancel(id) : Promise.resolve(null);
}

export function setReservationNotes(id: string, notes: string | null): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().setNotes(id, notes) : Promise.resolve(null);
}

export function upcomingReservations(fromDate: string, limit = 20) {
  return getStore().upcoming(fromDate, limit);
}
