import { appendFile, readFile } from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";

/**
 * Durable store for the waitlist "database" of the coming-soon phase — at the
 * same time the consent evidence required by Art. 7 Abs. 1 DSGVO.
 *
 * Primary backend: Upstash Redis (set via the Vercel integration). Vercel's
 * filesystem is read-only, so the legacy JSONL file below only works in local
 * dev — it is kept as a zero-config fallback when Redis is not configured.
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

/** Append-only audit log (consent evidence); one JSON record per list entry. */
const LOG_KEY = "waitlist:log";
/** Per-type sets of e-mail addresses — power the O(1) idempotency check. */
const typeSetKey = (type: WaitlistRecordType) => `waitlist:${type}`;

// undefined = not resolved yet, null = no Redis configured (use file fallback).
let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  // The Vercel Upstash integration sets UPSTASH_REDIS_REST_*; the Vercel KV
  // flavour sets KV_REST_API_* — accept either so it works whichever is added.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

/**
 * Persist one record. Returns false instead of throwing so a storage hiccup
 * (or a read-only filesystem in the file fallback) never breaks the form.
 */
export async function appendWaitlistRecord(
  record: WaitlistRecord,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      // Audit log + idempotency set in one round-trip.
      await redis
        .multi()
        .rpush(LOG_KEY, record)
        .sadd(typeSetKey(record.type), record.email)
        .exec();
      return true;
    } catch (error) {
      console.error("[waitlist] Redis write failed:", error);
      return false;
    }
  }

  try {
    await appendFile(LOG_FILE, `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch (error) {
    console.error(
      "[waitlist] could not write waitlist-submissions.jsonl:",
      error,
    );
    return false;
  }
}

/**
 * Checks whether a record of the given type already exists for the address —
 * keeps repeated clicks on confirm/unsubscribe links idempotent (no duplicate
 * log lines, no duplicate owner mails). Returns false when the store is
 * unreachable; callers then simply behave non-idempotently.
 */
export async function hasWaitlistRecord(
  type: WaitlistRecordType,
  email: string,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      return (await redis.sismember(typeSetKey(type), email)) === 1;
    } catch (error) {
      console.error("[waitlist] Redis read failed:", error);
      return false;
    }
  }

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
