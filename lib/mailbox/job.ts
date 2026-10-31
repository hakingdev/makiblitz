import { latestReservationByEmail } from "@/lib/reservation/store";
import { isTelegramConfigured } from "@/lib/telegram/api";
import { notifyGuestEmail } from "@/lib/telegram/notify";
import { senderAddresses } from "@/lib/waitlist/mailer";
import { fetchNewMail, isMailboxConfigured } from "./imap";
import { parseMail, skipReason, toInboundMail, type SkipReason } from "./parse";
import { claimInboundEmail, getMailboxCursor, releaseInboundEmail, saveMailboxCursor } from "./store";

/** Mails handled per run; the rest follow on the next run. */
const MAX_PER_RUN = 20;

/**
 * One run of the mailbox job (every 2 minutes via Supabase pg_cron): new mail
 * in INBOX is forwarded to Telegram with "✍️ Ответить", linked to the
 * guest's latest booking when the address matches one. Mail from the site
 * itself, auto-replies, bounces, newsletters and spam are skipped.
 *
 * The very first run only remembers where the mailbox stands — old mail is
 * not posted. Each mail is stored before it is posted and a Message-ID is
 * stored once, so a mail is never posted twice; a failed post stops the run
 * and the same mail is tried again next time.
 */
export async function runMailboxJob() {
  const summary = { posted: 0, skipped: 0, duplicates: 0, baseline: false, failed: false };
  if (!isMailboxConfigured() || !isTelegramConfigured()) return { ...summary, disabled: true };

  const result = await fetchNewMail(await getMailboxCursor(), MAX_PER_RUN);
  if (result.kind === "baseline") {
    await saveMailboxCursor(result.cursor);
    return { ...summary, baseline: true };
  }

  const own = senderAddresses();
  const skipped: Partial<Record<SkipReason, number>> = {};
  let lastUid: number | null = null;
  for (const raw of result.mails) {
    try {
      const parsed = await parseMail(raw.source);
      const reason = skipReason(parsed, own);
      if (reason) {
        summary.skipped++;
        skipped[reason] = (skipped[reason] ?? 0) + 1;
      } else {
        const mail = toInboundMail(parsed, raw.attachments, raw.internalDate);
        const stored = await claimInboundEmail(mail);
        if (!stored) {
          summary.duplicates++;
        } else {
          const reservation = await latestReservationByEmail(mail.fromEmail);
          if (!(await notifyGuestEmail({ ...mail, id: stored.id, reservation }))) {
            await releaseInboundEmail(stored.id);
            summary.failed = true;
            break;
          }
          summary.posted++;
        }
      }
      lastUid = raw.uid;
    } catch (error) {
      console.error(`[mailbox] mail uid ${raw.uid} failed:`, error);
      summary.failed = true;
      break;
    }
  }

  if (lastUid !== null) await saveMailboxCursor({ uidValidity: result.uidValidity, lastUid });
  return { ...summary, skippedBy: skipped };
}
