import { appendFile, readFile } from "fs/promises";
import path from "path";
import {
  applyEvent,
  reduceEvents,
  type SubscriberState,
  type WaitlistEvent,
} from "./subscriber-state";
import type { WaitlistStore } from "./store-types";

/**
 * Local-dev / test backend: an append-only JSONL event log plus an in-memory
 * state map rebuilt from it on first access. Works only where the filesystem
 * is writable (never on Vercel — see supabase-store.ts), and only within a
 * single process, so it is deliberately the fallback, not the production path.
 *
 * A new file (waitlist-events.jsonl) is used so the legacy
 * waitlist-submissions.jsonl audit log is left byte-for-byte untouched.
 */
const EVENTS_FILE =
  process.env.WAITLIST_LOG_FILE ??
  path.join(process.cwd(), "waitlist-events.jsonl");

export class LocalStore implements WaitlistStore {
  private cache: Map<string, SubscriberState> | null = null;
  /** Serializes writes so concurrent requests never interleave log lines. */
  private queue: Promise<unknown> = Promise.resolve();

  private async load(): Promise<Map<string, SubscriberState>> {
    if (this.cache) return this.cache;
    let raw = "";
    try {
      raw = await readFile(EVENTS_FILE, "utf8");
    } catch {
      // No log yet → empty state.
    }
    const events = raw
      .split("\n")
      .filter((line) => line.trim() !== "")
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as WaitlistEvent];
        } catch {
          return [];
        }
      });
    this.cache = reduceEvents(events);
    return this.cache;
  }

  async getSubscriberState(email: string): Promise<SubscriberState | null> {
    const map = await this.load();
    return map.get(email) ?? null;
  }

  async appendEvent(event: WaitlistEvent): Promise<boolean> {
    const run = this.queue.then(async () => {
      const map = await this.load();
      await appendFile(EVENTS_FILE, `${JSON.stringify(event)}\n`, "utf8");
      const next = applyEvent(map.get(event.email) ?? null, event);
      if (next) map.set(event.email, next);
      else map.delete(event.email);
      return true;
    });
    // Keep the chain alive even if this write fails.
    this.queue = run.catch(() => undefined);
    return run.catch((error) => {
      console.error("[waitlist] could not write waitlist-events.jsonl:", error);
      return false;
    });
  }
}
