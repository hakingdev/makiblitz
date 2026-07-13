import { NextRequest, NextResponse } from "next/server";
import { hashIp, verifyConfirmToken } from "@/lib/waitlist/crypto";
import {
  appendWaitlistRecord,
  hasWaitlistRecord,
  type WaitlistRecord,
} from "@/lib/waitlist/store";
import {
  isSmtpConfigured,
  sendOwnerConfirmedMail,
} from "@/lib/waitlist/mailer";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

/**
 * Step 2 of the double-opt-in flow (§ 7 UWG, BGH I ZR 164/09):
 * the subscriber clicked the link from the confirmation mail.
 * Valid token → log "confirmed" + notify the owner (this is the actual
 * signup notification) → show /confirm?state=success.
 */
export async function GET(req: NextRequest) {
  const redirect = (state: "success" | "invalid" | "expired") =>
    NextResponse.redirect(new URL(`/confirm?state=${state}`, req.url), 303);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = verifyConfirmToken(token);
  if (!result.ok) return redirect(result.reason);

  const payload = result.payload;

  // Repeated clicks on the same link stay idempotent: no duplicate log
  // lines, no duplicate owner mails.
  if (await hasWaitlistRecord("confirmed", payload.email)) {
    return redirect("success");
  }

  let ipHash: string;
  try {
    ipHash = hashIp(clientIp(req));
  } catch (err) {
    console.error("[waitlist]", err);
    return redirect("invalid");
  }

  const record: WaitlistRecord = {
    type: "confirmed",
    email: payload.email,
    phone: payload.phone,
    plz: payload.plz,
    consentAt: payload.consentAt,
    consentTextVersion: payload.consentTextVersion,
    confirmedAt: new Date().toISOString(),
    ipHash,
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };

  const logged = await appendWaitlistRecord(record);

  let mailed = false;
  if (isSmtpConfigured()) {
    try {
      await sendOwnerConfirmedMail(record);
      mailed = true;
    } catch (err) {
      console.error("[waitlist] owner mail failed:", err);
    }
  } else {
    console.info(`[waitlist] SMTP not configured — confirmed: ${payload.plz}`);
  }

  // Nothing persisted anywhere → don't pretend the confirmation worked.
  if (!logged && isSmtpConfigured() && !mailed) return redirect("invalid");

  return redirect("success");
}
