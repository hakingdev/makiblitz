import { addDays, restaurantNow, type RestaurantNow } from "./dates";
import { minutesUntilVisit } from "./manage";
import {
  anonymizeReservationsBefore,
  claimSent,
  releaseSent,
  upcomingReservations,
  type SentMark,
  type StoredReservation,
} from "./store";
import { isGuestMessagingConfigured, sendGuestMessage, type GuestMessageKind } from "@/lib/messaging/guest";
import { notifyUnconfirmed } from "@/lib/telegram/notify";
import { deleteMessagesOlderThan } from "@/lib/messaging/log";

/** Personal data of a visit is wiped this many days after it. */
export const RETENTION_DAYS = 90;

const HOUR = 60;

/**
 * One run of the reminder job (every 5 minutes via Supabase pg_cron):
 *  - 24 h before: reminder + "bitte bestätigen" — skipped for bookings made
 *    less than 24 h ahead.
 *  - 2 h before: only if still unconfirmed — skipped for bookings made less
 *    than 3 h ahead.
 *  - 60 min before: Telegram alert for guests who were asked but did not
 *    confirm; the staff decides (no automatic cancellation).
 *  - personal data of visits older than RETENTION_DAYS is wiped, and so is
 *    the WhatsApp/SMS log.
 * Each message is stamped before sending (claim), so overlapping runs never
 * send twice; a failed send releases the stamp for the next run.
 */
export async function runReminderJob(now: RestaurantNow = restaurantNow()) {
  const summary = { reminder24h: 0, reminder2h: 0, alerts: 0, anonymized: 0, messagesDeleted: 0 };
  const messaging = isGuestMessagingConfigured();
  const tomorrow = addDays(now.date, 1);
  const due = (await upcomingReservations(now.date, 500)).filter((r) => r.source === "online" && r.date <= tomorrow);

  for (const r of due) {
    const until = minutesUntilVisit(r, now);
    const createdAgo = r.createdAt ? (Date.now() - Date.parse(r.createdAt)) / 60_000 : Infinity;
    const leadAtBooking = until + createdAgo;
    const canMessage = messaging && r.messaging && Boolean(r.phone);
    let asked = Boolean(r.reminder24hAt || r.reminder2hAt);

    if (canMessage && !r.reminder24hAt && until <= 24 * HOUR && until > 2 * HOUR && leadAtBooking >= 24 * HOUR) {
      if (await send(r, "reminder_24h", "reminder_24h_at")) {
        summary.reminder24h++;
        asked = true;
      }
    }
    if (canMessage && !r.confirmedAt && !r.reminder2hAt && until <= 2 * HOUR && until > 30 && leadAtBooking >= 3 * HOUR) {
      if (await send(r, "reminder_2h", "reminder_2h_at")) {
        summary.reminder2h++;
        asked = true;
      }
    }
    if (asked && !r.confirmedAt && !r.unconfirmedAlertAt && until <= HOUR && until > -15) {
      if (await claimSent(r.id, "unconfirmed_alert_at")) {
        if (await notifyUnconfirmed(r, until)) summary.alerts++;
        else await releaseSent(r.id, "unconfirmed_alert_at");
      }
    }
  }

  summary.anonymized = await anonymizeReservationsBefore(addDays(now.date, -RETENTION_DAYS));
  summary.messagesDeleted = await deleteMessagesOlderThan(RETENTION_DAYS);
  return summary;
}

async function send(r: StoredReservation, kind: GuestMessageKind, mark: SentMark) {
  if (!(await claimSent(r.id, mark))) return false;
  if (await sendGuestMessage(kind, r)) return true;
  await releaseSent(r.id, mark);
  return false;
}
