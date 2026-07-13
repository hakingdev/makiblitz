import { NextRequest, NextResponse } from "next/server";
import { hashIp, verifyUnsubscribeToken } from "@/lib/waitlist/crypto";
import {
  appendWaitlistRecord,
  hasWaitlistRecord,
} from "@/lib/waitlist/store";
import {
  isSmtpConfigured,
  sendOwnerUnsubscribedMail,
} from "@/lib/waitlist/mailer";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

/**
 * One-click opt-out (Art. 7 Abs. 3 DSGVO, § 7 UWG). The link is embedded
 * in the footer of every subscriber mail and never expires.
 */
export async function GET(req: NextRequest) {
  const redirect = (state: "success" | "invalid") =>
    NextResponse.redirect(new URL(`/abmelden?state=${state}`, req.url), 303);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = verifyUnsubscribeToken(token);
  if (!result.ok) return redirect("invalid");

  const email = result.payload.email;

  // Repeated clicks stay idempotent (no duplicate records/mails).
  if (await hasWaitlistRecord("unsubscribed", email)) {
    return redirect("success");
  }

  let ipHash: string;
  try {
    ipHash = hashIp(clientIp(req));
  } catch (err) {
    console.error("[waitlist]", err);
    return redirect("invalid");
  }

  const unsubscribedAt = new Date().toISOString();
  const logged = await appendWaitlistRecord({
    type: "unsubscribed",
    email,
    unsubscribedAt,
    ipHash,
    userAgent: req.headers.get("user-agent") ?? "unknown",
  });

  let mailed = false;
  if (isSmtpConfigured()) {
    try {
      await sendOwnerUnsubscribedMail({ email, unsubscribedAt });
      mailed = true;
    } catch (err) {
      console.error("[waitlist] owner mail failed:", err);
    }
  } else {
    console.info(`[waitlist] SMTP not configured — unsubscribed: ${email}`);
  }

  // The opt-out must actually be recorded somewhere before we claim success.
  if (!logged && isSmtpConfigured() && !mailed) return redirect("invalid");

  return redirect("success");
}
