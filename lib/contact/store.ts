import { readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabase, isUuid } from "@/lib/supabase";

/**
 * Contact-form requests, kept so the owner can answer them from Telegram
 * (the reply button looks the sender up by id). Supabase table
 * contact_requests; local JSON file without Supabase (dev only).
 */

export type NewContactRequest = {
  name: string;
  email: string;
  phone: string | null;
  message: string;
  ipHash: string | null;
  userAgent: string;
};

export type ContactRequest = NewContactRequest & {
  id: string;
  createdAt: string;
  answeredAt: string | null;
};

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
  answered_at: string | null;
};

const LOCAL_FILE =
  process.env.CONTACT_REQUESTS_FILE ?? path.join(process.cwd(), "contact-requests.local.json");

async function localRows(): Promise<ContactRequest[]> {
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8")) as ContactRequest[];
  } catch {
    return [];
  }
}

let localQueue: Promise<unknown> = Promise.resolve();
function withLocalRows<T>(fn: (rows: ContactRequest[]) => Promise<T>): Promise<T> {
  const run = localQueue.then(async () => fn(await localRows()));
  localQueue = run.catch(() => undefined);
  return run;
}

/** Stores a request; returns its id, or null if it could not be stored. */
export async function saveContactRequest(r: NewContactRequest): Promise<string | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("contact_requests")
      .insert({
        name: r.name,
        email: r.email,
        phone: r.phone,
        message: r.message,
        ip_hash: r.ipHash,
        user_agent: r.userAgent,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[contact] Supabase insert failed:", error);
      return null;
    }
    return String(data.id);
  }
  try {
    return await withLocalRows(async (rows) => {
      const row: ContactRequest = { ...r, id: randomUUID(), createdAt: new Date().toISOString(), answeredAt: null };
      await writeFile(LOCAL_FILE, JSON.stringify([...rows, row], null, 2), "utf8");
      return row.id;
    });
  } catch (error) {
    console.error("[contact] could not write", LOCAL_FILE, error);
    return null;
  }
}

export async function getContactRequest(id: string): Promise<ContactRequest | null> {
  if (!isUuid(id)) return null;
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("contact_requests")
      .select("id,name,email,phone,message,ip_hash,user_agent,created_at,answered_at")
      .eq("id", id)
      .maybeSingle();
    if (error) console.error("[contact] Supabase read failed:", error);
    if (!data) return null;
    const row = data as Row;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      ipHash: row.ip_hash,
      userAgent: row.user_agent ?? "",
      createdAt: row.created_at,
      answeredAt: row.answered_at,
    };
  }
  return (await localRows()).find((row) => row.id === id) ?? null;
}

/** Remembers that (and what) the owner answered. */
export async function markContactRequestAnswered(id: string, answer: string): Promise<void> {
  const db = getSupabase();
  const answeredAt = new Date().toISOString();
  if (db) {
    const { error } = await db.from("contact_requests").update({ answered_at: answeredAt, answer }).eq("id", id);
    if (error) console.error("[contact] Supabase update failed:", error);
    return;
  }
  await withLocalRows(async (rows) => {
    const next = rows.map((row) => (row.id === id ? { ...row, answeredAt, answer } : row));
    await writeFile(LOCAL_FILE, JSON.stringify(next, null, 2), "utf8");
  }).catch((error) => console.error("[contact] could not update", LOCAL_FILE, error));
}
