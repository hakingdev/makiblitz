import { readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabase } from "@/lib/supabase";

/**
 * Log of WhatsApp/SMS messages with guests (table public.guest_messages):
 * delivery status for the SMS fallback, the last inbound message for the
 * 24-hour WhatsApp window, and which booking a guest's message belongs to.
 * Wiped with the rest of the guest data after 90 days.
 */

export type MessageKind = "booked" | "reminder_24h" | "reminder_2h" | "reply" | "inbound";
export type GuestMessage = {
  id: string;
  reservationId: string | null;
  phone: string;
  direction: "out" | "in";
  kind: MessageKind;
  channel: "whatsapp" | "sms";
  body: string | null;
  twilioSid: string | null;
  status: string | null;
  errorCode: string | null;
  fallbackOf: string | null;
  createdAt: string;
};
export type NewGuestMessage = Omit<GuestMessage, "id" | "createdAt" | "fallbackOf" | "errorCode"> & {
  fallbackOf?: string | null;
  errorCode?: string | null;
};

const FAILED = ["failed", "undelivered"];

type Row = {
  id: string;
  reservation_id: string | null;
  phone: string;
  direction: "out" | "in";
  kind: MessageKind;
  channel: "whatsapp" | "sms";
  body: string | null;
  twilio_sid: string | null;
  status: string | null;
  error_code: string | null;
  fallback_of: string | null;
  created_at: string;
};

const fromRow = (r: Row): GuestMessage => ({
  id: r.id,
  reservationId: r.reservation_id,
  phone: r.phone,
  direction: r.direction,
  kind: r.kind,
  channel: r.channel,
  body: r.body,
  twilioSid: r.twilio_sid,
  status: r.status,
  errorCode: r.error_code,
  fallbackOf: r.fallback_of,
  createdAt: r.created_at,
});

const LOCAL_FILE = process.env.GUEST_MESSAGES_FILE ?? path.join(process.cwd(), "guest-messages.local.json");

async function localRows(): Promise<GuestMessage[]> {
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8")) as GuestMessage[];
  } catch {
    return [];
  }
}

async function writeLocal(rows: GuestMessage[]) {
  await writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function logMessage(m: NewGuestMessage): Promise<GuestMessage | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("guest_messages")
      .insert({
        reservation_id: m.reservationId,
        phone: m.phone,
        direction: m.direction,
        kind: m.kind,
        channel: m.channel,
        body: m.body,
        twilio_sid: m.twilioSid,
        status: m.status,
        error_code: m.errorCode ?? null,
        fallback_of: m.fallbackOf ?? null,
      })
      .select("*")
      .single();
    if (error) console.error("[messaging] log failed:", error);
    return data ? fromRow(data as Row) : null;
  }
  const row: GuestMessage = { ...m, id: randomUUID(), fallbackOf: m.fallbackOf ?? null, errorCode: m.errorCode ?? null, createdAt: new Date().toISOString() };
  await writeLocal([...(await localRows()), row]);
  return row;
}

/**
 * Stores a delivery status from Twilio. `newlyFailed` is true only for the
 * first callback that turns the message into failed/undelivered — so the
 * fallback runs once even when Twilio reports the failure twice.
 */
export async function updateStatus(
  sid: string,
  status: string,
  errorCode: string | null,
): Promise<{ message: GuestMessage | null; newlyFailed: boolean }> {
  const failed = FAILED.includes(status);
  const db = getSupabase();
  if (db) {
    let query = db.from("guest_messages").update({ status, error_code: errorCode }).eq("twilio_sid", sid);
    if (failed) query = query.not("status", "in", `(${FAILED.join(",")})`);
    const { data, error } = await query.select("*");
    if (error) console.error("[messaging] status update failed:", error);
    const updated = (data as Row[] | null)?.[0];
    if (updated) return { message: fromRow(updated), newlyFailed: failed };
    const { data: current } = await db.from("guest_messages").select("*").eq("twilio_sid", sid).maybeSingle();
    return { message: current ? fromRow(current as Row) : null, newlyFailed: false };
  }
  const rows = await localRows();
  const target = rows.find((r) => r.twilioSid === sid);
  if (!target) return { message: null, newlyFailed: false };
  const wasFailed = FAILED.includes(target.status ?? "");
  const next = { ...target, status, errorCode };
  await writeLocal(rows.map((r) => (r.id === target.id ? next : r)));
  return { message: next, newlyFailed: failed && !wasFailed };
}

/** Last message the guest sent us — opens WhatsApp's 24-hour reply window. */
export async function lastInbound(phone: string): Promise<GuestMessage | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("guest_messages")
      .select("*")
      .eq("phone", phone)
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) console.error("[messaging] read failed:", error);
    return (data as Row[] | null)?.[0] ? fromRow((data as Row[])[0]!) : null;
  }
  const rows = (await localRows()).filter((r) => r.phone === phone && r.direction === "in");
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function isWhatsAppWindowOpen(phone: string, now = Date.now()): Promise<boolean> {
  const last = await lastInbound(phone);
  return Boolean(last && now - Date.parse(last.createdAt) < WINDOW_MS);
}

/** Deletes messages older than `days` (same retention as the bookings). */
export async function deleteMessagesOlderThan(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("guest_messages").delete().lt("created_at", cutoff).select("id");
    if (error) console.error("[messaging] cleanup failed:", error);
    return data?.length ?? 0;
  }
  const rows = await localRows();
  const keep = rows.filter((r) => r.createdAt >= cutoff);
  if (keep.length !== rows.length) await writeLocal(keep);
  return rows.length - keep.length;
}
