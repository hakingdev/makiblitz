/**
 * Every bot message about a guest ends with "ref: c:<uuid>" (contact request),
 * "ref: r:<uuid>" (reservation) or "ref: w:+49…" (a WhatsApp message from a
 * number without a booking). A reply to such a message — or to the "Antwort"
 * prompt — is matched back to the guest through this line, so the bot needs
 * no conversation state.
 */

export type RefKind = "c" | "r" | "w";
export type Ref = { kind: RefKind; id: string };

const REF = /ref:\s*(?:([cr]):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|(w):(\+\d{8,15}))/i;

export function refLine(kind: RefKind, id: string) {
  return `<code>ref: ${kind}:${id}</code>`;
}

export function parseRef(text: string | undefined | null): Ref | null {
  const match = text?.match(REF);
  if (!match) return null;
  if (match[3]) return { kind: "w", id: match[4]! };
  return { kind: match[1]!.toLowerCase() as RefKind, id: match[2]!.toLowerCase() };
}

/**
 * The "📝 Комментарий" prompt carries "note: r:<uuid>" instead of a ref line,
 * so a reply to it edits the booking's comment and never mails the guest.
 */
const NOTE = /note:\s*r:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function noteLine(id: string) {
  return `<code>note: r:${id}</code>`;
}

export function parseNoteRef(text: string | undefined | null): string | null {
  return text?.match(NOTE)?.[1]?.toLowerCase() ?? null;
}

/** callback_data of the "Ответить" button: "reply:c:<uuid>". */
export function parseReplyCallback(data: string | undefined): Ref | null {
  return data?.startsWith("reply:") ? parseRef(`ref: ${data.slice("reply:".length)}`) : null;
}
