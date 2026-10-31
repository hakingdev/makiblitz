import { readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabase, isUuid } from "@/lib/supabase";
import type { InboundMail } from "./parse";

/**
 * E-mails from guests that were forwarded to Telegram (table
 * public.inbound_emails) — only what an answer from the bot needs: sender,
 * subject, Message-ID (threading), date and the short text. Deleted 90 days
 * after they arrived. Plus the read position in the mailbox (table
 * public.mailbox_state). Local JSON file without Supabase (dev only).
 */

export type StoredInboundEmail = {
  id: string;
  messageId: string | null;
  fromEmail: string;
  fromName: string;
  subject: string;
  excerpt: string;
  receivedAt: string;
  createdAt: string;
};

/**
 * Last UID handled in INBOX. UIDs are only comparable while UIDVALIDITY stays
 * the same; a new value means the server renumbered the folder.
 */
export type MailboxCursor = { uidValidity: string; lastUid: number };

const MAILBOX = "INBOX";

type Row = {
  id: string;
  message_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  excerpt: string | null;
  received_at: string | null;
  created_at: string;
};

const fromRow = (r: Row): StoredInboundEmail => ({
  id: r.id,
  messageId: r.message_id,
  fromEmail: r.from_email,
  fromName: r.from_name ?? "",
  subject: r.subject ?? "",
  excerpt: r.excerpt ?? "",
  receivedAt: r.received_at ?? r.created_at,
  createdAt: r.created_at,
});

type LocalData = { cursor: MailboxCursor | null; emails: StoredInboundEmail[] };

const LOCAL_FILE = process.env.INBOUND_EMAILS_FILE ?? path.join(process.cwd(), "inbound-emails.local.json");

async function readLocal(): Promise<LocalData> {
  try {
    const data = JSON.parse(await readFile(LOCAL_FILE, "utf8")) as Partial<LocalData>;
    return { cursor: data.cursor ?? null, emails: data.emails ?? [] };
  } catch {
    return { cursor: null, emails: [] };
  }
}

let localQueue: Promise<unknown> = Promise.resolve();
/** Read-modify-write of the local file, one at a time; `fn` returns the new data (or null to leave it). */
function withLocal<T>(fn: (data: LocalData) => { next: LocalData | null; result: T }): Promise<T> {
  const run = localQueue.then(async () => {
    const { next, result } = fn(await readLocal());
    if (next) await writeFile(LOCAL_FILE, JSON.stringify(next, null, 2), "utf8");
    return result;
  });
  localQueue = run.catch(() => undefined);
  return run;
}

export async function getMailboxCursor(): Promise<MailboxCursor | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("mailbox_state")
      .select("uid_validity,last_uid")
      .eq("mailbox", MAILBOX)
      .maybeSingle();
    if (error) throw new Error(`mailbox_state read failed: ${error.message}`);
    return data ? { uidValidity: String(data.uid_validity), lastUid: Number(data.last_uid) } : null;
  }
  return (await readLocal()).cursor;
}

export async function saveMailboxCursor(cursor: MailboxCursor): Promise<void> {
  const db = getSupabase();
  if (db) {
    const { error } = await db.from("mailbox_state").upsert({
      mailbox: MAILBOX,
      uid_validity: cursor.uidValidity,
      last_uid: cursor.lastUid,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("[mailbox] cursor save failed:", error);
    return;
  }
  await withLocal((data) => ({ next: { ...data, cursor }, result: undefined }));
}

/**
 * Stores a mail before it is posted (the Telegram message carries its id).
 * Returns null when a mail with the same Message-ID is already stored — it
 * was posted before (or arrived twice, e.g. To and Cc). Throws when the store
 * can't be written, so the job stops and retries the mail next run.
 */
export async function claimInboundEmail(mail: InboundMail): Promise<StoredInboundEmail | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("inbound_emails")
      .upsert(
        {
          message_id: mail.messageId,
          from_email: mail.fromEmail,
          from_name: mail.fromName || null,
          subject: mail.subject || null,
          excerpt: mail.text,
          received_at: mail.receivedAt,
        },
        { onConflict: "message_id", ignoreDuplicates: true },
      )
      .select("*");
    if (error) throw new Error(`inbound_emails insert failed: ${error.message}`);
    const row = (data as Row[] | null)?.[0];
    return row ? fromRow(row) : null;
  }
  return withLocal((data) => {
    if (mail.messageId && data.emails.some((e) => e.messageId === mail.messageId)) return { next: null, result: null };
    const row: StoredInboundEmail = {
      id: randomUUID(),
      messageId: mail.messageId,
      fromEmail: mail.fromEmail,
      fromName: mail.fromName,
      subject: mail.subject,
      excerpt: mail.text,
      receivedAt: mail.receivedAt,
      createdAt: new Date().toISOString(),
    };
    return { next: { ...data, emails: [...data.emails, row] }, result: row };
  });
}

/** Undoes a claim after the Telegram post failed, so the next run tries again. */
export async function releaseInboundEmail(id: string): Promise<void> {
  const db = getSupabase();
  if (db) {
    const { error } = await db.from("inbound_emails").delete().eq("id", id);
    if (error) console.error("[mailbox] release failed:", error);
    return;
  }
  await withLocal((data) => ({ next: { ...data, emails: data.emails.filter((e) => e.id !== id) }, result: undefined }));
}

export async function getInboundEmail(id: string): Promise<StoredInboundEmail | null> {
  if (!isUuid(id)) return null;
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("inbound_emails").select("*").eq("id", id).maybeSingle();
    if (error) console.error("[mailbox] read failed:", error);
    return data ? fromRow(data as Row) : null;
  }
  return (await readLocal()).emails.find((e) => e.id === id) ?? null;
}

/** Deletes stored mails older than `days` (same retention as the bookings). */
export async function deleteInboundEmailsOlderThan(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("inbound_emails").delete().lt("created_at", cutoff).select("id");
    if (error) console.error("[mailbox] cleanup failed:", error);
    return data?.length ?? 0;
  }
  return withLocal((data) => {
    const keep = data.emails.filter((e) => e.createdAt >= cutoff);
    const removed = data.emails.length - keep.length;
    return { next: removed ? { ...data, emails: keep } : null, result: removed };
  });
}
