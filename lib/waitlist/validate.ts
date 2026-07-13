/**
 * Shared client/server validation for the waitlist form.
 * Must stay free of Node-only imports — the form component uses it too.
 */

// Pragmatic RFC-5322-style check: one @, no spaces, dot in the domain part.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const PLZ_RE = /^\d{5}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL_RE.test(email)) {
    return null;
  }
  return email;
}

export function normalizePlz(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plz = value.trim();
  return PLZ_RE.test(plz) ? plz : null;
}

/**
 * Returns:
 *  - "" when empty / not provided (callers decide whether that is allowed),
 *  - the number normalized to +49… (E.164-ish) when it parses,
 *  - null when something was entered but it is not a usable phone number.
 */
export function normalizePhone(value: unknown): string | "" | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (raw === "") return "";
  if (/[^\d\s+\-/().]/.test(raw)) return null;

  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  let normalized: string;
  if (digits.startsWith("+")) {
    normalized = `+${digits.slice(1).replace(/\D/g, "")}`;
  } else if (digits.startsWith("0")) {
    // Domestic German format: 0151… -> +49151…
    normalized = `+49${digits.slice(1)}`;
  } else {
    // Bare national number without prefix: assume Germany.
    normalized = `+49${digits}`;
  }

  const significant = normalized.slice(1);
  if (significant.length < 7 || significant.length > 15) return null;
  return normalized;
}
