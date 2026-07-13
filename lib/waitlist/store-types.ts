import type { SubscriberState, WaitlistEvent } from "./subscriber-state";

/**
 * The storage contract both backends implement. `appendEvent` writes the
 * append-only audit entry AND updates the derived subscriber state in one call;
 * `getSubscriberState` returns the current status (or null for an unknown
 * address). Implementations return false / null instead of throwing so a
 * storage hiccup degrades gracefully rather than breaking the form.
 */
export interface WaitlistStore {
  getSubscriberState(email: string): Promise<SubscriberState | null>;
  appendEvent(event: WaitlistEvent): Promise<boolean>;
}
