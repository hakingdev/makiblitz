import { ImapFlow } from "imapflow";
import { countAttachments } from "./parse";
import type { MailboxCursor } from "./store";

/**
 * Reads the restaurant mailbox (Namecheap Private Email) over IMAP with the
 * same login as SMTP. Messages are fetched with BODY.PEEK, so they stay
 * unread for whoever opens the mailbox; nothing is moved or deleted.
 *
 * Env: SMTP_USER, SMTP_PASS (the mailbox), IMAP_HOST (default SMTP_HOST),
 * IMAP_PORT (default 993).
 */

type ImapConfig = { host: string; port: number; user: string; pass: string };

function imapConfig(): ImapConfig | null {
  const { IMAP_HOST, IMAP_PORT, SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const host = IMAP_HOST || SMTP_HOST;
  if (!host || !SMTP_USER || !SMTP_PASS) return null;
  return { host, port: Number(IMAP_PORT) || 993, user: SMTP_USER, pass: SMTP_PASS };
}

export function isMailboxConfigured(): boolean {
  return imapConfig() !== null;
}

/**
 * Only the start of each message is downloaded — enough for headers and
 * text; attachments are counted from the body structure instead.
 */
const SOURCE_MAX_BYTES = 256 * 1024;

export type FetchedMail = { uid: number; source: Buffer; attachments: number; internalDate: Date | null };

export type FetchResult =
  /** No position yet, or the folder was renumbered: start from here, post nothing. */
  | { kind: "baseline"; cursor: MailboxCursor }
  | { kind: "mails"; uidValidity: string; mails: FetchedMail[] };

/** Up to `limit` messages after the cursor, oldest first. */
export async function fetchNewMail(cursor: MailboxCursor | null, limit: number): Promise<FetchResult> {
  const config = imapConfig();
  if (!config) throw new Error("IMAP is not configured");
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.port === 993,
    auth: { user: config.user, pass: config.pass },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const mailbox = client.mailbox;
      if (!mailbox) throw new Error("INBOX could not be opened");
      const uidValidity = String(mailbox.uidValidity);
      const highest = mailbox.uidNext ? mailbox.uidNext - 1 : 0;

      if (!cursor || cursor.uidValidity !== uidValidity) {
        return { kind: "baseline", cursor: { uidValidity, lastUid: highest } };
      }
      if (mailbox.uidNext && highest <= cursor.lastUid) return { kind: "mails", uidValidity, mails: [] };

      // UIDs have gaps (deleted mails), so look them up instead of guessing a range.
      const found = (await client.search({ uid: `${cursor.lastUid + 1}:*` }, { uid: true })) || [];
      const uids = found.filter((uid) => uid > cursor.lastUid).sort((a, b) => a - b).slice(0, limit);
      if (!uids.length) return { kind: "mails", uidValidity, mails: [] };

      const messages = await client.fetchAll(
        uids.join(","),
        { uid: true, internalDate: true, bodyStructure: true, source: { maxLength: SOURCE_MAX_BYTES } },
        { uid: true },
      );
      const mails = messages
        .filter((m) => m.source)
        .map((m) => ({
          uid: m.uid,
          source: m.source!,
          attachments: countAttachments(m.bodyStructure),
          internalDate: m.internalDate ? new Date(m.internalDate) : null,
        }))
        .sort((a, b) => a.uid - b.uid);
      return { kind: "mails", uidValidity, mails };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}
