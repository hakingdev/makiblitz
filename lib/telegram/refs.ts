/**
 * Every bot message about a guest ends with "ref: c:<uuid>" (contact request)
 * or "ref: r:<uuid>" (reservation). A reply to such a message — or to the
 * "Antwort" prompt — is matched back to the guest through this line, so the
 * bot needs no conversation state.
 */

export type RefKind = "c" | "r";
export type Ref = { kind: RefKind; id: string };

const REF = /ref:\s*([cr]):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function refLine(kind: RefKind, id: string) {
  return `<code>ref: ${kind}:${id}</code>`;
}

export function parseRef(text: string | undefined | null): Ref | null {
  const match = text?.match(REF);
  return match ? { kind: match[1]!.toLowerCase() as RefKind, id: match[2]!.toLowerCase() } : null;
}

/** callback_data of the "Ответить" button: "reply:c:<uuid>". */
export function parseReplyCallback(data: string | undefined): Ref | null {
  return data?.startsWith("reply:") ? parseRef(`ref: ${data.slice("reply:".length)}`) : null;
}
