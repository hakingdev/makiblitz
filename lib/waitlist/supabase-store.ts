import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  applyEvent,
  type SubscriberState,
  type WaitlistEvent,
} from "./subscriber-state";
import type { WaitlistStore } from "./store-types";

/**
 * Production backend: Upstash/Vercel's read-only filesystem rules out the JSONL
 * file, and multiple serverless instances rule out per-instance in-memory
 * state — so the shared source of truth is Supabase (Postgres).
 *
 * Two tables (see supabase/schema.sql):
 *  - waitlist_events:      append-only audit log (consent evidence, DSGVO)
 *  - waitlist_subscribers: one row per address, the materialized status
 *
 * Reached only through the service_role key on the server; RLS denies everyone
 * else. Every method degrades to null/false on error, never throws.
 */

type SubscriberRow = {
  email: string;
  status: SubscriberState["status"];
  first_seen_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  last_confirm_email_at: string | null;
  confirm_email_count: number;
};

function rowToState(row: SubscriberRow): SubscriberState {
  return {
    email: row.email,
    status: row.status,
    firstSeenAt: row.first_seen_at,
    confirmedAt: row.confirmed_at ?? undefined,
    unsubscribedAt: row.unsubscribed_at ?? undefined,
    lastConfirmEmailAt: row.last_confirm_email_at ?? undefined,
    confirmEmailCount: row.confirm_email_count,
  };
}

function stateToRow(state: SubscriberState): SubscriberRow {
  return {
    email: state.email,
    status: state.status,
    first_seen_at: state.firstSeenAt,
    confirmed_at: state.confirmedAt ?? null,
    unsubscribed_at: state.unsubscribedAt ?? null,
    last_confirm_email_at: state.lastConfirmEmailAt ?? null,
    confirm_email_count: state.confirmEmailCount,
  };
}

function eventToRow(event: WaitlistEvent) {
  return {
    type: event.type,
    email: event.email,
    at: event.at,
    plz: event.plz ?? null,
    phone: event.phone ?? null,
    consent_at: event.consentAt ?? null,
    consent_text_version: event.consentTextVersion ?? null,
    ip_hash: event.ipHash ?? null,
    user_agent: event.userAgent ?? null,
  };
}

export class SupabaseStore implements WaitlistStore {
  constructor(private readonly client: SupabaseClient) {}

  async getSubscriberState(email: string): Promise<SubscriberState | null> {
    const { data, error } = await this.client
      .from("waitlist_subscribers")
      .select(
        "email,status,first_seen_at,confirmed_at,unsubscribed_at,last_confirm_email_at,confirm_email_count",
      )
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[waitlist] Supabase read failed:", error);
      return null;
    }
    return data ? rowToState(data as SubscriberRow) : null;
  }

  async appendEvent(event: WaitlistEvent): Promise<boolean> {
    try {
      // 1. Append the immutable audit entry (consent evidence).
      const { error: logError } = await this.client
        .from("waitlist_events")
        .insert(eventToRow(event));
      if (logError) throw logError;

      // 2. Materialize the derived status. Read-modify-write is acceptable for
      //    the low-traffic double-opt-in flow; the route already gates on the
      //    freshly-read state, so the worst a same-instant race causes is a
      //    duplicate mail — never a lost opt-out.
      const prev = await this.getSubscriberState(event.email);
      const next = applyEvent(prev, event);
      if (next) {
        const { error: stateError } = await this.client
          .from("waitlist_subscribers")
          .upsert(stateToRow(next), { onConflict: "email" });
        if (stateError) throw stateError;
      }
      return true;
    } catch (error) {
      console.error("[waitlist] Supabase write failed:", error);
      return false;
    }
  }
}

export function createSupabaseStore(
  url: string,
  serviceRoleKey: string,
): SupabaseStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseStore(client);
}
