/**
 * Isomorphic, multi-stage e-mail validation — the single source of truth for
 * stage 1 (syntax) and stage 2 (anti-garbage heuristics). It runs unchanged in
 * the browser (fast UX feedback) and in the API route (source of truth). The
 * server layers stage 3 on top: a DNS-MX deliverability check with fail-open
 * (see lib/waitlist/email-dns.ts). Keep this file free of Node-only imports so
 * it stays safe in the form bundle.
 *
 * Design constraints:
 *  - NO provider allow-list. Any syntactically valid domain passes stage 1 —
 *    that is exactly what lets own-domain addresses like
 *    info@mueller-catering.de through. The only domain-shaped block is the
 *    all-numeric-label heuristic (keyboard mashing), which itself has a small
 *    escape hatch for the handful of real numeric providers (163.com …).
 *  - Every heuristic is individually switchable via EmailRules, so rules can
 *    be loosened/tightened without touching the pipeline.
 */

import isEmail from "validator/lib/isEmail";
import { DISPOSABLE_EMAIL_DOMAINS } from "./disposable-domains";

export type EmailRules = {
  /** Reject a local-part made of digits only ("1234@…") — pure spam signal. */
  rejectNumericLocalPart: boolean;
  /** Reject a local-part shorter than this many chars ("x@…"). 0 disables. */
  minLocalPartLength: number;
  /** Reject throwaway mailbox providers (see disposable-domains.ts). */
  rejectDisposable: boolean;
  /** Reject domains whose non-TLD labels are all digits ("1235.com" …). */
  rejectNumericGarbageDomain: boolean;
};

export const DEFAULT_EMAIL_RULES: EmailRules = {
  rejectNumericLocalPart: true,
  minLocalPartLength: 2,
  rejectDisposable: true,
  rejectNumericGarbageDomain: true,
};

// RFC-5322 syntax is delegated to validator.js (isomorphic — safe in the form
// bundle). It enforces the single "@", the local-part (≤64) and overall (≤254)
// length limits, a real alphabetic TLD (kills foo@1.2 and IP-ish domains), and
// rejects leading/trailing/consecutive dots. allow_utf8_local_part:false keeps
// the local part ASCII-only, matching the previous behaviour.
const EMAIL_OPTIONS = { allow_utf8_local_part: false } as const;

// The only real mailbox providers whose apex is a bare number (NetEase & co.).
// This is NOT a provider allow-list — it is purely the escape hatch for the
// numeric-garbage heuristic below.
const NUMERIC_DOMAIN_ALLOW = ["163.com", "126.com", "139.com", "189.cn"];

function isNumericGarbageDomain(domain: string): boolean {
  const labels = domain.split(".");
  // Only labels *before* the TLD matter (a numeric TLD is already killed by
  // isEmail). "1235.com" → ["1235"]; "mail.4711.de" → ["mail", "4711"].
  if (!labels.slice(0, -1).some((label) => /^\d+$/.test(label))) return false;
  return !NUMERIC_DOMAIN_ALLOW.some(
    (allow) => domain === allow || domain.endsWith(`.${allow}`),
  );
}

function isDisposableDomain(domain: string): boolean {
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Sub-domains of a disposable provider count too (mail.mailinator.com …).
  return Array.from(DISPOSABLE_EMAIL_DOMAINS).some((d) =>
    domain.endsWith(`.${d}`),
  );
}

/**
 * Runs stages 1–2. Returns the normalized (trimmed + lower-cased) address, or
 * null when it is syntactically invalid or trips an enabled heuristic.
 *
 * Callers must NOT reveal which rule fired: surface one neutral error for every
 * rejection so spammers cannot probe the ruleset.
 */
export function validateEmail(
  value: unknown,
  rules: EmailRules = DEFAULT_EMAIL_RULES,
): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();

  // Stage 1 — syntax.
  if (!isEmail(email, EMAIL_OPTIONS)) return null;

  // isEmail guarantees exactly one "@" with non-empty sides.
  const atIndex = email.lastIndexOf("@");
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // Stage 2 — anti-garbage heuristics.
  if (rules.rejectNumericLocalPart && /^\d+$/.test(localPart)) return null;
  if (localPart.length < rules.minLocalPartLength) return null;
  if (rules.rejectDisposable && isDisposableDomain(domain)) return null;
  if (rules.rejectNumericGarbageDomain && isNumericGarbageDomain(domain)) {
    return null;
  }

  return email;
}
