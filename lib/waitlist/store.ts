import { appendFile, readFile } from "fs/promises";
import path from "path";

/**
 * Append-only JSONL log — the waitlist "database" of the coming-soon phase
 * and at the same time the consent evidence required by Art. 7 Abs. 1 DSGVO.
 *
 * Record types:
 *  - "pending":      form submitted, consent logged, confirmation mail sent
 *  - "confirmed":    double-opt-in link clicked (only now the signup counts)
 *  - "unsubscribed": opt-out link clicked
 *
 * IPs are stored exclusively as HMAC hashes (see lib/waitlist/crypto.ts).
 */

export type WaitlistRecordType = "pending" | "confirmed" | "unsubscribed";

export type WaitlistRecord = {
  type: WaitlistRecordType;
  email: string;
  plz?: string;
  phone?: string;
  /** When the consent checkbox was submitted (ISO). */
  consentAt?: string;
  /** Version of the consent wording the subscriber saw (lib/waitlist/consent.ts). */
  consentTextVersion?: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  /** HMAC-SHA256 of the client IP — never the raw address. */
  ipHash: string;
  userAgent: string;
};

export const LOG_FILE = path.join(process.cwd(), "waitlist-submissions.jsonl");

/**
 * Returns false instead of throwing so a read-only filesystem
 * (e.g. serverless) never breaks the form.
 */
export async function appendWaitlistRecord(
  record: WaitlistRecord,
): Promise<boolean> {
  try {
    await appendFile(LOG_FILE, `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch (error) {
    console.error("[waitlist] could not write waitlist-submissions.jsonl:", error);
    return false;
  }
}

/**
 * Checks whether a record of the given type already exists for the address —
 * keeps repeated clicks on confirm/unsubscribe links idempotent (no duplicate
 * log lines, no duplicate owner mails). Returns false when the log is
 * unreadable; callers then simply behave non-idempotently.
 */
export async function hasWaitlistRecord(
  type: WaitlistRecordType,
  email: string,
): Promise<boolean> {
  let raw: string;
  try {
    raw = await readFile(LOG_FILE, "utf8");
  } catch {
    return false;
  }

  return raw.split("\n").some((line) => {
    if (!line.trim()) return false;
    try {
      const record = JSON.parse(line) as Partial<WaitlistRecord>;
      return record.type === type && record.email === email;
    } catch {
      return false;
    }
  });
}
