import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/waitlist/rate-limit";
import {
  normalizeEmail,
  normalizePhone,
  normalizePlz,
} from "@/lib/waitlist/validate";
import { appendWaitlistRecord } from "@/lib/waitlist/store";
import { isSmtpConfigured, sendConfirmMail } from "@/lib/waitlist/mailer";
import {
  createConfirmToken,
  createUnsubscribeToken,
  hashIp,
} from "@/lib/waitlist/crypto";
import { CONSENT_TEXT_VERSION } from "@/lib/waitlist/consent";
import { getBaseUrl } from "@/lib/site";

export const runtime = "nodejs";

type SubscribeBody = {
  email?: unknown;
  phone?: unknown;
  plz?: unknown;
  consent?: unknown;
  hp?: unknown;
};

const ok = () => NextResponse.json({ status: "ok" });
const error = (field: string | null, httpStatus: number) =>
  NextResponse.json(
    { status: "error", ...(field ? { field } : {}) },
    { status: httpStatus },
  );

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

/**
 * Step 1 of the double-opt-in flow (§ 7 UWG):
 * validate → log a "pending" record incl. consent evidence (Art. 7 Abs. 1
 * DSGVO) → send the neutral confirmation mail. The owner is NOT notified
 * here — only /api/confirm does that.
 */
export async function POST(req: NextRequest) {
  // Raw IP is used in-memory only; everything persisted gets the HMAC hash.
  let ipHash: string;
  try {
    ipHash = hashIp(clientIp(req));
  } catch (err) {
    console.error("[waitlist]", err);
    return error(null, 500);
  }

  if (isRateLimited(ipHash)) {
    return error("rate_limit", 429);
  }

  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return error(null, 400);
  }

  // Honeypot: bots fill it, humans never see it. Pretend success, do nothing.
  if (typeof body.hp === "string" && body.hp.trim() !== "") {
    console.warn("[waitlist] honeypot triggered, dropping submission");
    return ok();
  }

  const email = normalizeEmail(body.email);
  if (!email) return error("email", 422);

  const plz = normalizePlz(body.plz);
  if (!plz) return error("plz", 422);

  // Optional (Datenminimierung): "" = not provided, null = unparsable input.
  const phone = normalizePhone(body.phone);
  if (phone === null) return error("phone", 422);

  // Consent must be an explicit true — the checkbox is never pre-ticked.
  if (body.consent !== true) return error("consent", 422);

  const consentAt = new Date().toISOString();
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  // Consent evidence (Art. 7 Abs. 1 DSGVO): what was agreed to, when,
  // from which (hashed) IP and client.
  const logged = await appendWaitlistRecord({
    type: "pending",
    email,
    phone,
    plz,
    consentAt,
    consentTextVersion: CONSENT_TEXT_VERSION,
    ipHash,
    userAgent,
  });

  const base = getBaseUrl(req.nextUrl.origin);
  const confirmToken = createConfirmToken({
    email,
    plz,
    phone,
    consentAt,
    consentTextVersion: CONSENT_TEXT_VERSION,
  });
  const confirmUrl = `${base}/api/confirm?token=${confirmToken}`;
  const unsubscribeUrl = `${base}/api/unsubscribe?token=${createUnsubscribeToken(email)}`;

  if (isSmtpConfigured()) {
    try {
      await sendConfirmMail({ to: email, confirmUrl, unsubscribeUrl });
    } catch (err) {
      // Without the mail the signup can never be confirmed — surface the error.
      console.error("[waitlist] confirm mail failed:", err);
      return error(null, 500);
    }
  } else {
    // Dev fallback: no SMTP → print the link so the flow stays testable.
    console.info(`[waitlist] SMTP not configured — confirm URL: ${confirmUrl}`);
    if (!logged) return error(null, 500);
  }

  return ok();
}
