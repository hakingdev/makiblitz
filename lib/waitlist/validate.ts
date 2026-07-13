/**
 * Shared client/server validation for the waitlist form.
 * Must stay free of Node-only imports — the form component uses it too.
 */

import { isRealGermanPlz } from "./plz-data";

// Pragmatic RFC-5322-style check: one @, no spaces, and — unlike a plain
// "dot somewhere" test — the TLD label must be alphabetic (kills foo@1.2,
// IP-ish domains and other keyboard mashing; 163.com-style numeric SLDs
// stay valid).
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}$/;

const PLZ_RE = /^\d{5}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !EMAIL_RE.test(email)) {
    return null;
  }
  const local = email.split("@")[0]!;
  // Unquoted local parts must not start/end with a dot or contain "..".
  if (
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    email.includes("..")
  ) {
    return null;
  }
  return email;
}

export function normalizePlz(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plz = value.trim();
  if (!PLZ_RE.test(plz)) return null;
  // Five digits alone let "11111" through — the code must actually be
  // assigned as a German delivery PLZ (see plz-data.ts).
  return isRealGermanPlz(plz) ? plz : null;
}

// German numbering plan (waitlist audience = German launch region), applied
// to the NSN — the digits after +49:
//  - mobile: 15x is always 11 digits; 160/162/163 and 17x are 10–11
//  - geographic & service numbers: first digit 2–9, 7–11 digits overall
// Numbers starting 0/1 outside the mobile blocks (emergency, carrier
// prefixes) are not reachable subscriber numbers.
const NSN_RE = /^(?:15\d{9}|16[023]\d{7,8}|17\d{8,9}|[2-9]\d{6,10})$/;

/**
 * Strict German phone validation. Accepts "+49 171 2345678",
 * "0049 171 2345678", "0171 2345678" and common separators; everything is
 * normalized to E.164 (+49…). Bare digits without a +49/0049/0 prefix are
 * rejected — no German number is written that way, it is how "111111"-style
 * garbage used to slip through.
 *
 * Returns:
 *  - "" when empty / not provided (callers decide whether that is allowed),
 *  - the number normalized to +49… when it is a plausible German number,
 *  - null when something was entered but it is not one.
 */
export function normalizePhone(value: unknown): string | "" | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (raw === "") return "";
  if (/[^\d\s+\-/().]/.test(raw)) return null;
  // "+" may only appear once, as the very first character.
  if (raw.lastIndexOf("+") > 0) return null;

  const digits = raw.replace(/\D/g, "");

  let nsn: string | null = null;
  if (raw.startsWith("+")) {
    nsn = digits.startsWith("49") ? digits.slice(2) : null;
  } else if (digits.startsWith("00")) {
    // International dialing form — only Germany's 0049 is accepted.
    nsn = digits.startsWith("0049") ? digits.slice(4) : null;
  } else if (digits.startsWith("0")) {
    nsn = digits.slice(1);
  }
  if (nsn === null) return null;

  // "+49 (0) 171 …" habit: tolerate one parenthesized trunk zero.
  if ((raw.startsWith("+") || digits.startsWith("00")) && nsn.startsWith("0")) {
    nsn = nsn.slice(1);
  }

  // A single repeated digit (0222222222 …) is never a real subscriber number.
  if (!NSN_RE.test(nsn) || /^(\d)\1+$/.test(nsn)) return null;

  return `+49${nsn}`;
}
