import { NextRequest, NextResponse } from "next/server";
import { hashIp, verifyConfirmToken } from "@/lib/waitlist/crypto";
import {
  appendEvent,
  getSubscriberState,
  type WaitlistRecord,
} from "@/lib/waitlist/store";
import {
  isMailConfigured,
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
  const redirect = (state: "success" | "already" | "invalid" | "expired") =>
    NextResponse.redirect(new URL(`/confirm?state=${state}`, req.url), 303);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = verifyConfirmToken(token);
  if (!result.ok) return redirect(result.reason);

  const payload = result.payload;
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const state = await getSubscriberState(payload.email);

  // Already confirmed → repeated click on the link, or a stale confirm mail
  // from a second signup attempt. Do nothing: no owner mail, no duplicate
  // "confirmed" record. /confirm?state=already must NOT fire the pixel.
  if (state?.status === "confirmed") {
    await appendEvent({
      type: "confirm_repeat",
      email: payload.email,
      at: new Date().toISOString(),
      userAgent,
    });
    return redirect("already");
  }

  // Opted out already → a confirm link must not silently resurrect the address.
  if (state?.status === "unsubscribed") {
    return redirect("invalid");
  }

  let ipHash: string;
  try {
    ipHash = hashIp(clientIp(req));
  } catch (err) {
    console.error("[waitlist]", err);
    return redirect("invalid");
  }

  const confirmedAt = new Date().toISOString();
  const record: WaitlistRecord = {
    type: "confirmed",
    email: payload.email,
    phone: payload.phone,
    plz: payload.plz,
    consentAt: payload.consentAt,
    consentTextVersion: payload.consentTextVersion,
    confirmedAt,
    ipHash,
    userAgent,
  };

  const logged = await appendEvent({
    type: "confirmed",
    email: payload.email,
    at: confirmedAt,
    plz: payload.plz,
    phone: payload.phone,
    consentAt: payload.consentAt,
    consentTextVersion: payload.consentTextVersion,
    ipHash,
    userAgent,
  });

  let mailed = false;
  if (isMailConfigured()) {
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
  if (!logged && isMailConfigured() && !mailed) return redirect("invalid");

  return redirect("success");
}
