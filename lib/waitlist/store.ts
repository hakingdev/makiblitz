import type { SubscriberState, WaitlistEvent } from "./subscriber-state";
import type { WaitlistStore } from "./store-types";
import { LocalStore } from "./local-store";

export type {
  SubscriberState,
  SubscriberStatus,
  WaitlistEvent,
  WaitlistEventType,
} from "./subscriber-state";
export type { WaitlistStore } from "./store-types";

/**
 * Durable store for the coming-soon waitlist "database" and, at the same time,
 * the consent evidence required by Art. 7 Abs. 1 DSGVO.
 *
 * Backend selection:
 *  - Supabase (Postgres) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *    — the production source of truth (shared across serverless instances,
 *    survives restarts, works with Vercel's read-only filesystem).
 *  - A local JSONL file otherwise — a zero-config fallback for `next dev`.
 *
 * IPs are stored exclusively as HMAC hashes (see lib/waitlist/crypto.ts).
 */

/**
 * Shape still used by the mailer to render owner notifications. It mirrors the
 * fields of a pending/confirmed signup and is intentionally separate from the
 * append-only WaitlistEvent (which the store persists).
 */
export type WaitlistRecord = {
  type: "pending" | "confirmed" | "unsubscribed";
  email: string;
  plz?: string;
  phone?: string;
  consentAt?: string;
  consentTextVersion?: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  ipHash: string;
  userAgent: string;
};

// undefined = not resolved yet.
let store: WaitlistStore | undefined;

function getStore(): WaitlistStore {
  if (store) return store;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    // Imported lazily so the (dev-only) fallback path never loads the client.
    const { createSupabaseStore } =
      require("./supabase-store") as typeof import("./supabase-store");
    store = createSupabaseStore(url, serviceRoleKey);
  } else {
    store = new LocalStore();
  }
  return store;
}

/** Current status for a normalized address (null if never seen). */
export function getSubscriberState(
  email: string,
): Promise<SubscriberState | null> {
  return getStore().getSubscriberState(email);
}

/** Append one audit event and update the derived status in one call. */
export function appendEvent(event: WaitlistEvent): Promise<boolean> {
  return getStore().appendEvent(event);
}
