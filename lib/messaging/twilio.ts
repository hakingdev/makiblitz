import { createHmac, timingSafeEqual } from "crypto";

/**
 * Minimal Twilio REST client (plain fetch). Auth with an API key
 * (TWILIO_API_KEY_SID/SECRET) on the account TWILIO_ACCOUNT_SID; webhook
 * signatures are checked with TWILIO_AUTH_TOKEN (an API key can't).
 */

export const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+15553653044";
/** Alphanumeric SMS sender — one-way, guests can't answer it. */
export const SMS_FROM = process.env.TWILIO_SMS_FROM || "MakiLove";

export function isTwilioConfigured(): boolean {
  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET } = process.env;
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET);
}

export type SendResult = { ok: true; sid: string; status: string } | { ok: false; error: string };

/** POST /Messages — `params` are Twilio's form fields (To, From, Body / ContentSid, …). */
export async function sendTwilioMessage(params: Record<string, string>): Promise<SendResult> {
  const { TWILIO_ACCOUNT_SID: account, TWILIO_API_KEY_SID: key, TWILIO_API_KEY_SECRET: secret } = process.env;
  if (!account || !key || !secret) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; status?: string; code?: number; message?: string };
    if (!res.ok || !json.sid) {
      console.error("[twilio] send failed:", res.status, json.code, json.message);
      return { ok: false, error: String(json.code ?? res.status) };
    }
    return { ok: true, sid: json.sid, status: json.status ?? "queued" };
  } catch (error) {
    console.error("[twilio] send failed:", error);
    return { ok: false, error: "network" };
  }
}

/**
 * X-Twilio-Signature: base64 HMAC-SHA1 of the full URL followed by every
 * POST parameter (sorted by name, name+value concatenated), keyed with the
 * account's auth token.
 */
export function isValidTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, name) => acc + name + params[name], url);
  const expected = Buffer.from(createHmac("sha1", token).update(data, "utf8").digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
