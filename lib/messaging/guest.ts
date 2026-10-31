import type { StoredReservation } from "@/lib/reservation/store";

/**
 * WhatsApp/SMS to the guest (Twilio). Not connected yet: until the Twilio
 * sender and its templates are approved this reports "not configured", so
 * the reminder job leaves every reminder unsent and unstamped — once Twilio
 * is wired in here, pending reminders go out on the next run.
 */
export type GuestMessageKind = "booked" | "reminder_24h" | "reminder_2h";

export function isGuestMessagingConfigured(): boolean {
  return false;
}

export async function sendGuestMessage(kind: GuestMessageKind, reservation: StoredReservation): Promise<boolean> {
  console.info("[messaging] not configured — skipped", kind, reservation.id);
  return false;
}
