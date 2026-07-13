/**
 * The waitlist state machine — pure, side-effect-free logic shared by the API
 * routes, both storage backends (Supabase in prod, JSONL in dev) and the unit
 * tests. Keeping it free of I/O means the live write path and the log-replay
 * reconstruction can never disagree about what a given event does.
 *
 * A subscriber moves: (nothing) → pending → confirmed, and pending|confirmed →
 * unsubscribed. The append-only event log is the audit trail (Art. 7 Abs. 1
 * DSGVO — consent evidence); `SubscriberState` is the materialized current
 * status derived from it.
 */

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

export type WaitlistEventType =
  // State-changing events:
  | "pending" // form submitted for the first time (or a fresh re-opt-in)
  | "resend" // pending subscriber re-submitted → another confirmation mail
  | "confirmed" // double-opt-in link clicked
  | "unsubscribed" // opt-out link clicked
  // Audit-only events (recorded, but never change the status):
  | "suppressed_signup" // opted-out address tried to sign up again
  | "confirm_repeat" // confirm link clicked again after it already counted
  | "unsubscribe_repeat"; // opt-out link clicked again

/** One append-only log entry. `at` is the moment the event happened (ISO). */
export type WaitlistEvent = {
  type: WaitlistEventType;
  /** Normalized address (trim + lowercase) — the single subscriber key. */
  email: string;
  at: string;
  plz?: string;
  phone?: string;
  consentAt?: string;
  consentTextVersion?: string;
  /** HMAC-SHA256 of the client IP — never the raw address. */
  ipHash?: string;
  userAgent?: string;
};

/** Materialized current state of one subscriber, derived from the event log. */
export type SubscriberState = {
  email: string;
  status: SubscriberStatus;
  firstSeenAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  /** When the last confirmation mail went out — powers the resend cooldown. */
  lastConfirmEmailAt?: string;
  confirmEmailCount: number;
};

/**
 * Policy switch for re-signups after an opt-out.
 *
 * false (current decision): the address is on a suppression list — the form
 *   answers with a neutral 200 {status:"ok"} (redirect to /danke as usual), but
 *   NO mail is sent and the status does not change. A `suppressed_signup` event
 *   is logged.
 * true: the user may run through the double-opt-in again — the status returns
 *   to `pending` and a fresh confirmation mail is sent (fresh consent). Legally
 *   clean too (the user initiates the new consent, § 7 UWG); flip this one line.
 */
export const RESUBSCRIBE_AFTER_UNSUBSCRIBE = false;

/** A pending subscriber gets at most one confirmation mail per this window. */
export const RESEND_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Derives the new state from the previous state plus a single event. The ONLY
 * place transitions live, so the Supabase row (prod) and the JSONL replay (dev)
 * stay in lock-step. Returns the unchanged `prev` for audit-only events, and
 * `null` only when an audit-only event arrives for an unknown address.
 */
export function applyEvent(
  prev: SubscriberState | null,
  event: WaitlistEvent,
): SubscriberState | null {
  switch (event.type) {
    case "pending": {
      if (!prev) {
        return {
          email: event.email,
          status: "pending",
          firstSeenAt: event.at,
          lastConfirmEmailAt: event.at,
          confirmEmailCount: 1,
        };
      }
      // Re-opt-in after an unsubscribe (RESUBSCRIBE_AFTER_UNSUBSCRIBE=true):
      // keep firstSeenAt, drop the old confirmed/unsubscribed timestamps.
      return {
        ...prev,
        status: "pending",
        confirmedAt: undefined,
        unsubscribedAt: undefined,
        lastConfirmEmailAt: event.at,
        confirmEmailCount: prev.confirmEmailCount + 1,
      };
    }

    case "resend": {
      if (!prev) return prev;
      return {
        ...prev,
        lastConfirmEmailAt: event.at,
        confirmEmailCount: prev.confirmEmailCount + 1,
      };
    }

    case "confirmed": {
      const base: SubscriberState = prev ?? {
        email: event.email,
        status: "pending",
        firstSeenAt: event.at,
        confirmEmailCount: 0,
      };
      return { ...base, status: "confirmed", confirmedAt: event.at };
    }

    case "unsubscribed": {
      const base: SubscriberState = prev ?? {
        email: event.email,
        status: "pending",
        firstSeenAt: event.at,
        confirmEmailCount: 0,
      };
      return { ...base, status: "unsubscribed", unsubscribedAt: event.at };
    }

    // Audit-only — the status is intentionally left untouched.
    case "suppressed_signup":
    case "confirm_repeat":
    case "unsubscribe_repeat":
      return prev;

    default:
      return prev;
  }
}

/** Replays an ordered event log into the per-email state map (dev restart). */
export function reduceEvents(
  events: WaitlistEvent[],
): Map<string, SubscriberState> {
  const map = new Map<string, SubscriberState>();
  for (const event of events) {
    const next = applyEvent(map.get(event.email) ?? null, event);
    if (next) map.set(event.email, next);
  }
  return map;
}

/** What /api/subscribe should do for a given current state. */
export type SubscribeDecision =
  | "create" // no record → pending + confirm mail + owner heads-up
  | "resend" // pending, cooldown elapsed → another confirm mail
  | "cooldown" // pending, still within the cooldown → neutral ok, no mail
  | "already_subscribed" // confirmed → inline notice, no mail, no redirect
  | "suppressed" // unsubscribed + policy off → neutral ok, no mail
  | "resubscribe"; // unsubscribed + policy on → fresh double-opt-in

export function decideSubscribe(
  state: SubscriberState | null,
  nowMs: number,
): SubscribeDecision {
  if (!state) return "create";

  switch (state.status) {
    case "pending": {
      const last = state.lastConfirmEmailAt
        ? Date.parse(state.lastConfirmEmailAt)
        : 0;
      return nowMs - last >= RESEND_COOLDOWN_MS ? "resend" : "cooldown";
    }
    case "confirmed":
      return "already_subscribed";
    case "unsubscribed":
      return RESUBSCRIBE_AFTER_UNSUBSCRIBE ? "resubscribe" : "suppressed";
  }
}
