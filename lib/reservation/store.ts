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
  /** Code in the guest's link /r/<token>. */
  manageToken: string | null;
  confirmedAt: string | null;
  cancelledBy: CancelledBy | null;
  /** Guest gets WhatsApp/SMS (bookings made after the messaging migration). */
  messaging: boolean;
  createdAt: string | null;
  reminder24hAt: string | null;
  reminder2hAt: string | null;
  unconfirmedAlertAt: string | null;
};

export type CancelledBy = "guest" | "staff";

/** Columns the reminder job stamps once a message went out. */
export type SentMark = "reminder_24h_at" | "reminder_2h_at" | "unconfirmed_alert_at";

export type BookResult =
  | { ok: true; id: string; tables: number[] }
  | { ok: false; reason: "full" | "taken" | "unavailable" };

interface ReservationStore {
  /** Confirmed bookings of one day, or null when the store can't be read. */
  bookingsOn(date: string): Promise<Booking[] | null>;
  /** `forceTables`: staff picked the tables (walk-in); otherwise best fit. */
  book(reservation: NewReservation, forceTables?: number[]): Promise<BookResult>;
  byId(id: string): Promise<StoredReservation | null>;
  byToken(token: string): Promise<StoredReservation | null>;
  /** Cancels a confirmed booking; returns it, or null if there was nothing to cancel. */
  cancel(id: string, by: CancelledBy): Promise<StoredReservation | null>;
  /** Guest confirmed via the link; returns the booking (also when already confirmed). */
  confirm(id: string): Promise<StoredReservation | null>;
  /**
   * Stamps `mark` if it is still empty and reports whether this call did it —
   * so two overlapping cron runs never send the same message twice.
   * `release` clears it again after a failed send.
   */
  claim(id: string, mark: SentMark): Promise<boolean>;
  release(id: string, mark: SentMark): Promise<void>;
  /** Wipes personal data of visits before `beforeDate`; returns how many. */
  anonymizeBefore(beforeDate: string): Promise<number>;
  /** The guest's latest booking for a phone number (E.164), any status. */
  latestByPhone(phone: string): Promise<StoredReservation | null>;
  /** Confirmed bookings from `fromDate` on, in order. */
  upcoming(fromDate: string, limit: number): Promise<StoredReservation[]>;
  /** Replaces the comment of a confirmed booking (null clears it). */
  setNotes(id: string, notes: string | null): Promise<StoredReservation | null>;
}

// One literal (not concatenated), so supabase-js can type the selected row.
const COLUMNS =
  "id,visit_date,visit_time,guests,table_ids,source,status,name,email,phone,notes,manage_token,confirmed_at,cancelled_by,messaging,created_at,reminder_24h_at,reminder_2h_at,unconfirmed_alert_at";

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
  manage_token: string | null;
  confirmed_at: string | null;
  cancelled_by: CancelledBy | null;
  messaging: boolean | null;
  created_at: string | null;
  reminder_24h_at: string | null;
  reminder_2h_at: string | null;
  unconfirmed_alert_at: string | null;
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
    manageToken: row.manage_token,
    confirmedAt: row.confirmed_at,
    cancelledBy: row.cancelled_by,
    messaging: Boolean(row.messaging),
    createdAt: row.created_at,
    reminder24hAt: row.reminder_24h_at,
    reminder2hAt: row.reminder_2h_at,
    unconfirmedAlertAt: row.unconfirmed_alert_at,
  };
}

export function toBooking(r: StoredReservation): Booking {
  return {
    id: r.id,
    time: r.time,
    guests: r.guests,
    tables: r.tables,
    source: r.source,
    name: r.name,
    notes: r.notes,
    confirmed: Boolean(r.confirmedAt),
    messaging: r.messaging,
  };
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

  async byToken(token: string): Promise<StoredReservation | null> {
    const { data, error } = await this.client.from("reservations").select(COLUMNS).eq("manage_token", token).maybeSingle();
    if (error) console.error("[reservation] Supabase read failed:", error);
    return data ? fromRow(data as Row) : null;
  }

  async confirm(id: string): Promise<StoredReservation | null> {
    const { error } = await this.client
      .from("reservations")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "confirmed")
      .is("confirmed_at", null);
    if (error) console.error("[reservation] Supabase confirm failed:", error);
    return this.byId(id);
  }

  async claim(id: string, mark: SentMark): Promise<boolean> {
    const { data, error } = await this.client
      .from("reservations")
      .update({ [mark]: new Date().toISOString() })
      .eq("id", id)
      .is(mark, null)
      .select("id");
    if (error) console.error("[reservation] Supabase claim failed:", error);
    return Boolean(data?.length);
  }

  async release(id: string, mark: SentMark): Promise<void> {
    const { error } = await this.client.from("reservations").update({ [mark]: null }).eq("id", id);
    if (error) console.error("[reservation] Supabase release failed:", error);
  }

  async latestByPhone(phone: string): Promise<StoredReservation | null> {
    const { data, error } = await this.client
      .from("reservations")
      .select(COLUMNS)
      .eq("phone", phone)
      .order("visit_date", { ascending: false })
      .order("visit_time", { ascending: false })
      .limit(1);
    if (error) console.error("[reservation] Supabase read failed:", error);
    const row = (data as Row[] | null)?.[0];
    return row ? fromRow(row) : null;
  }

  async anonymizeBefore(beforeDate: string): Promise<number> {
    const { data, error } = await this.client
      .from("reservations")
      .update({
        name: "—",
        email: null,
        phone: null,
        notes: null,
        ip_hash: null,
        user_agent: null,
        anonymized_at: new Date().toISOString(),
      })
      .lt("visit_date", beforeDate)
      .is("anonymized_at", null)
      .select("id");
    if (error) console.error("[reservation] Supabase anonymize failed:", error);
    return data?.length ?? 0;
  }

  async cancel(id: string, by: CancelledBy): Promise<StoredReservation | null> {
    const { data, error } = await this.client
      .from("reservations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: by })
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

type LocalRow = StoredReservation & { ipHash: string | null; userAgent: string | null; anonymizedAt?: string | null };

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
        manageToken: row.manageToken ?? row.id.replace(/-/g, ""),
        confirmedAt: row.confirmedAt ?? null,
        cancelledBy: row.cancelledBy ?? null,
        messaging: row.messaging ?? false,
        createdAt: row.createdAt ?? null,
        reminder24hAt: row.reminder24hAt ?? null,
        reminder2hAt: row.reminder2hAt ?? null,
        unconfirmedAlertAt: row.unconfirmedAlertAt ?? null,
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
        manageToken: randomUUID().replace(/-/g, ""),
        confirmedAt: null,
        cancelledBy: null,
        messaging: true,
        reminder24hAt: null,
        reminder2hAt: null,
        unconfirmedAlertAt: null,
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

  cancel(id: string, by: CancelledBy): Promise<StoredReservation | null> {
    return this.serialized(async (rows) => {
      const target = rows.find((r) => r.id === id && r.status === "confirmed");
      if (!target) return null;
      const cancelled = { ...target, status: "cancelled" as const, cancelledBy: by };
      await this.write(rows.map((r) => (r.id === id ? cancelled : r)));
      return cancelled;
    });
  }

  async byToken(token: string): Promise<StoredReservation | null> {
    return (await this.rows()).find((r) => r.manageToken === token) ?? null;
  }

  confirm(id: string): Promise<StoredReservation | null> {
    return this.serialized(async (rows) => {
      const target = rows.find((r) => r.id === id);
      if (!target) return null;
      if (target.status !== "confirmed" || target.confirmedAt) return target;
      const confirmed = { ...target, confirmedAt: new Date().toISOString() };
      await this.write(rows.map((r) => (r.id === id ? confirmed : r)));
      return confirmed;
    });
  }

  claim(id: string, mark: SentMark): Promise<boolean> {
    const key = LOCAL_MARKS[mark];
    return this.serialized(async (rows) => {
      const target = rows.find((r) => r.id === id);
      if (!target || target[key]) return false;
      await this.write(rows.map((r) => (r.id === id ? { ...r, [key]: new Date().toISOString() } : r)));
      return true;
    });
  }

  release(id: string, mark: SentMark): Promise<void> {
    const key = LOCAL_MARKS[mark];
    return this.serialized(async (rows) => {
      await this.write(rows.map((r) => (r.id === id ? { ...r, [key]: null } : r)));
    });
  }

  async latestByPhone(phone: string): Promise<StoredReservation | null> {
    return (
      (await this.rows())
        .filter((r) => r.phone === phone)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0] ?? null
    );
  }

  anonymizeBefore(beforeDate: string): Promise<number> {
    return this.serialized(async (rows) => {
      let count = 0;
      const next = rows.map((r) => {
        if (r.date >= beforeDate || r.anonymizedAt) return r;
        count++;
        return { ...r, name: "—", email: null, phone: null, notes: null, ipHash: null, userAgent: null, anonymizedAt: new Date().toISOString() };
      });
      if (count) await this.write(next);
      return count;
    });
  }

  private async write(rows: LocalRow[]) {
    await writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf8");
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

const LOCAL_MARKS = {
  reminder_24h_at: "reminder24hAt",
  reminder_2h_at: "reminder2hAt",
  unconfirmed_alert_at: "unconfirmedAlertAt",
} as const satisfies Record<SentMark, keyof StoredReservation>;

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

export function cancelReservation(id: string, by: CancelledBy = "staff"): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().cancel(id, by) : Promise.resolve(null);
}

const TOKEN = /^[0-9a-f]{32}$/;

export function getReservationByToken(token: string): Promise<StoredReservation | null> {
  return TOKEN.test(token) ? getStore().byToken(token) : Promise.resolve(null);
}

export function confirmReservation(id: string): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().confirm(id) : Promise.resolve(null);
}

export function claimSent(id: string, mark: SentMark): Promise<boolean> {
  return getStore().claim(id, mark);
}

export function releaseSent(id: string, mark: SentMark): Promise<void> {
  return getStore().release(id, mark);
}

export function anonymizeReservationsBefore(beforeDate: string): Promise<number> {
  return getStore().anonymizeBefore(beforeDate);
}

export function latestReservationByPhone(phone: string): Promise<StoredReservation | null> {
  return getStore().latestByPhone(phone);
}

export function setReservationNotes(id: string, notes: string | null): Promise<StoredReservation | null> {
  return isUuid(id) ? getStore().setNotes(id, notes) : Promise.resolve(null);
}

export function upcomingReservations(fromDate: string, limit = 20) {
  return getStore().upcoming(fromDate, limit);
}
