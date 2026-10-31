import { NextRequest, NextResponse } from "next/server";
import { claimSent, getReservation, releaseSent } from "@/lib/reservation/store";
import { sendCompleteRegistration, tiktokConfigured } from "@/lib/tiktok-events";
import { isRateLimited } from "@/lib/waitlist/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The thank-you page calls right after booking; older bookings are refused. */
const MAX_AGE_MS = 60 * 60 * 1000;

const TTCLID = /^[\w.~+/=-]{1,1000}$/;
const TTP = /^[\w.-]{1,200}$/;

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

function matching(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/tiktok-event — the server copy of the TikTok CompleteRegistration.
 * Called by /reservieren/bestaetigt only with consent "all"; the browser sends
 * the reservation id and TikTok's own ids, contact data comes from the store.
 * 200 sent · 204 not configured · 400 invalid · 404 unknown booking · 409 sent
 * before · 410 older than an hour · 429 rate limited · 502 TikTok refused.
 */
export async function POST(req: NextRequest) {
  if (!tiktokConfigured()) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ip = clientIp(req);
  if (isRateLimited(`tiktok:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const reservation = await getReservation(str(body.reservationId));
  if (!reservation || reservation.source !== "online") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const bookedAt = Date.parse(reservation.createdAt ?? "");
  if (Number.isNaN(bookedAt) || Date.now() - bookedAt > MAX_AGE_MS) {
    return NextResponse.json({ error: "too_old" }, { status: 410 });
  }
  if (!(await claimSent(reservation.id, "tiktok_event_at"))) {
    return NextResponse.json({ error: "already_sent" }, { status: 409 });
  }

  const sent = await sendCompleteRegistration(reservation, {
    ttclid: matching(body.ttclid, TTCLID),
    ttp: matching(body.ttp, TTP),
    ip: ip === "unknown" ? null : ip,
    userAgent: req.headers.get("user-agent"),
    url: httpUrl(body.url),
    referrer: httpUrl(body.referrer),
  });
  if (!sent) {
    // The mark records a sent event — TikTok didn't take this one.
    await releaseSent(reservation.id, "tiktok_event_at");
    return NextResponse.json({ error: "tiktok_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
