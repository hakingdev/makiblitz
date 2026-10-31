import { simpleParser, type ParsedMail } from "mailparser";

/**
 * Turns a raw e-mail from the restaurant mailbox into the few fields the bot
 * forwards and keeps: sender, subject, Message-ID, date and the new text
 * (quoted history and signature cut off, trimmed). Also decides which mails
 * are not from a guest and stay out of Telegram.
 */

export type InboundMail = {
  messageId: string | null;
  fromEmail: string;
  fromName: string;
  subject: string;
  receivedAt: string;
  text: string;
  attachments: number;
};

export type SkipReason = "own" | "system" | "auto" | "bounce" | "bulk" | "spam" | "no_sender";

/** Stored and shown text is cut to this many characters. */
export const EXCERPT_MAX = 1000;

export function parseMail(source: Buffer | string): Promise<ParsedMail> {
  // Only the text is needed: no HTML rendering, no inline images as data URIs.
  return simpleParser(source, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true });
}

function header(mail: ParsedMail, name: string): string | null {
  const line = mail.headerLines.find((h) => h.key === name)?.line;
  return line ? line.slice(line.indexOf(":") + 1).trim() : null;
}

const SYSTEM_SENDER = /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounces?)([+._-]|@)/i;

/** Why this mail is not forwarded, or null for a mail a person wrote to us. */
export function skipReason(mail: ParsedMail, ownAddresses: string[]): SkipReason | null {
  const from = mail.from?.value[0]?.address?.toLowerCase();
  if (!from) return "no_sender";
  if (ownAddresses.includes(from)) return "own";
  // Every server that carries a mail adds "Received:" (RFC 5321). Without it the
  // mail was put into the mailbox directly (provider notices, IMAP uploads).
  if (!header(mail, "received")) return "system";
  const contentType = mail.headers.get("content-type") as { value?: string } | undefined;
  if (SYSTEM_SENDER.test(from) || contentType?.value?.toLowerCase() === "multipart/report") return "bounce";
  const autoSubmitted = header(mail, "auto-submitted");
  if ((autoSubmitted && autoSubmitted.toLowerCase() !== "no") || header(mail, "x-autoreply") || header(mail, "x-autorespond")) {
    return "auto";
  }
  if (/^(bulk|list|junk|auto_reply)$/i.test(header(mail, "precedence") ?? "")) return "bulk";
  if (header(mail, "list-unsubscribe") || header(mail, "list-id")) return "bulk";
  if (/^yes/i.test(header(mail, "x-spam-flag") ?? "")) return "spam";
  return null;
}

const FORWARD_SEPARATOR =
  /^-{2,}\s*(original message|ursprüngliche nachricht|originalnachricht|weitergeleitete nachricht|forwarded message)\s*-{2,}$/i;
/** "Am 30.10.2026 um 18:02 schrieb Anna <a@b.de>:" / "On Fri, … wrote:" (Gmail may wrap it onto two lines). */
const ATTRIBUTION = /^(am|on)\s.*\s(schrieb|wrote)\b.*:$/i;
/** Outlook's header block: "Von: …" followed by "Gesendet: …" / "Sent: …". */
const OUTLOOK_FROM = /^\*?(von|from):\*?\s/i;
const OUTLOOK_NEXT = /^\*?(gesendet|sent|datum|date|an|to|betreff|subject):\*?\s/i;
const SIGNATURE = /^(-- ?|_{10,}|(sent from my|von meinem|gesendet von meinem|gesendet mit der) .+)$/i;

/** The new part of a reply: everything above the quoted history and the signature. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const joined = `${line} ${lines[i + 1]?.trim() ?? ""}`.trim();
    if (
      FORWARD_SEPARATOR.test(line) ||
      SIGNATURE.test(line) ||
      ATTRIBUTION.test(line) ||
      (/^(am|on)\s/i.test(line) && ATTRIBUTION.test(joined)) ||
      (OUTLOOK_FROM.test(line) && lines.slice(i + 1, i + 4).some((next) => OUTLOOK_NEXT.test(next.trim())))
    ) {
      end = i;
      break;
    }
  }
  const kept = lines
    .slice(0, end)
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // A plain forward or a mail that is only a quote: better the whole text than nothing.
  return kept || text.trim();
}

export function excerpt(text: string, max = EXCERPT_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.8 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

export function toInboundMail(mail: ParsedMail, attachments: number, receivedAt: Date | null): InboundMail {
  const from = mail.from!.value[0]!;
  return {
    messageId: mail.messageId?.trim() || null,
    fromEmail: from.address!.toLowerCase(),
    fromName: from.name?.trim() ?? "",
    subject: mail.subject?.trim() ?? "",
    receivedAt: (mail.date ?? receivedAt ?? new Date()).toISOString(),
    text: excerpt(stripQuoted(mail.text ?? "")),
    attachments,
  };
}

/** Node of an IMAP BODYSTRUCTURE (the subset this file reads). */
export type StructureNode = { type: string; disposition?: string; childNodes?: StructureNode[] };

/**
 * Files the guest attached, counted from the IMAP body structure (the parsed
 * source may be cut off). Images embedded in an HTML signature
 * (multipart/related) don't count.
 */
export function countAttachments(node: StructureNode | undefined, related = false): number {
  if (!node) return 0;
  const type = node.type.toLowerCase();
  if (type === "message/rfc822") return 1;
  if (node.childNodes?.length) {
    return node.childNodes.reduce((n, child) => n + countAttachments(child, related || type === "multipart/related"), 0);
  }
  if (node.disposition?.toLowerCase() === "attachment") return 1;
  return related || type.startsWith("text/") || type.startsWith("multipart/") ? 0 : 1;
}

/** "Re: Frage zur Reservierung" — without stacking "Re: AW: Re:". */
export function replySubject(subject: string, fallback: string): string {
  const clean = subject.replace(/^((re|aw|antw)\s*(\[\d+\])?\s*:\s*)+/i, "").trim();
  return `Re: ${clean || fallback}`;
}
