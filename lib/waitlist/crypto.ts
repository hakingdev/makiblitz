import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless HMAC helpers for the double-opt-in flow (no database):
 *  - hashIp():   pseudonymizes IPs before they are logged (Art. 32 DSGVO —
 *                raw IPs are never persisted anywhere)
 *  - sign/verify tokens for /api/confirm and /api/unsubscribe links
 *
 * Token format: base64url(payloadJson) + "." + base64url(HMAC-SHA256(payloadJson))
 */

function requireSecret(name: "TOKEN_SECRET" | "IP_HASH_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set — generate one with "openssl rand -base64 32" and add it to .env`,
    );
  }
  return value;
}

export function hashIp(ip: string): string {
  return createHmac("sha256", requireSecret("IP_HASH_SECRET"))
    .update(ip)
    .digest("hex");
}

export const CONFIRM_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48h (§ 7 UWG DOI)

export type ConfirmPayload = {
  v: 1;
  scope: "confirm";
  email: string;
  plz: string;
  phone: string;
  consentAt: string;
  consentTextVersion: string;
  exp: number; // unix ms
};

export type UnsubscribePayload = {
  v: 1;
  scope: "unsubscribe";
  email: string;
};

type TokenPayload = ConfirmPayload | UnsubscribePayload;

function sign(payloadJson: string): string {
  return createHmac("sha256", requireSecret("TOKEN_SECRET"))
    .update(payloadJson)
    .digest("base64url");
}

function encode(payload: TokenPayload): string {
  const json = JSON.stringify(payload);
  return `${Buffer.from(json, "utf8").toString("base64url")}.${sign(json)}`;
}

export function createConfirmToken(
  data: Omit<ConfirmPayload, "v" | "scope" | "exp">,
): string {
  return encode({
    v: 1,
    scope: "confirm",
    ...data,
    exp: Date.now() + CONFIRM_TOKEN_TTL_MS,
  });
}

/** No expiry: opting out must work from any old e-mail (Art. 7 Abs. 3 DSGVO). */
export function createUnsubscribeToken(email: string): string {
  return encode({ v: 1, scope: "unsubscribe", email });
}

export type VerifyResult<P extends TokenPayload> =
  | { ok: true; payload: P }
  | { ok: false; reason: "invalid" | "expired" };

function verify<P extends TokenPayload>(
  token: string,
  scope: P["scope"],
): VerifyResult<P> {
  const invalid = { ok: false, reason: "invalid" } as const;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return invalid;

  let json: string;
  try {
    json = Buffer.from(parts[0], "base64url").toString("utf8");
  } catch {
    return invalid;
  }

  const expected = Buffer.from(sign(json));
  const actual = Buffer.from(parts[1]);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return invalid;
  }

  let payload: P;
  try {
    payload = JSON.parse(json);
  } catch {
    return invalid;
  }
  if (payload.v !== 1 || payload.scope !== scope) return invalid;
  if (typeof payload.email !== "string" || !payload.email) return invalid;

  if (payload.scope === "confirm") {
    const exp = (payload as ConfirmPayload).exp;
    if (typeof exp !== "number") return invalid;
    if (Date.now() > exp) return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

export function verifyConfirmToken(token: string) {
  return verify<ConfirmPayload>(token, "confirm");
}

export function verifyUnsubscribeToken(token: string) {
  return verify<UnsubscribePayload>(token, "unsubscribe");
}
