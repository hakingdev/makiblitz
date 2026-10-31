import { createHash } from "crypto";
import type { StoredReservation } from "@/lib/reservation/store";
import { toE164 } from "@/lib/reservation/validate";
import { TIKTOK_PIXEL_ID, tiktokEventId } from "@/lib/tiktok";

/**
 * Server half of the TikTok "CompleteRegistration" (Events API 2.0): the same
 * booking the pixel reports on /reservieren/bestaetigt, under the same
 * event_id, so TikTok counts it once — also when the pixel is blocked.
 *
 * E-mail and phone come from the reservation (never from the browser) and
 * leave the server only as SHA-256 hashes ("advanced matching"); name, date,
 * time and party size are never sent.
 */

const ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

/** Events Manager → pixel → Settings → Access Token. Unset → no server events. */
export function tiktokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_ACCESS_TOKEN);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** TikTok matches the hash of the trimmed, lower-cased address. */
export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}

/** TikTok matches the hash of the number in E.164 (+4917112345678); null if it isn't one. */
export function hashPhone(phone: string): string | null {
  const e164 = toE164(phone);
  return e164 ? sha256(e164) : null;
}

/** What the browser and the request add to the event. */
export type TiktokContext = {
  ttclid: string | null;
  ttp: string | null;
  ip: string | null;
  userAgent: string | null;
  url: string | null;
  referrer: string | null;
};

export function completeRegistrationPayload(reservation: StoredReservation, ctx: TiktokContext) {
  // When the guest booked (the route only sends bookings of the last hour).
  const bookedAt = Date.parse(reservation.createdAt ?? "") || Date.now();
  const user: Record<string, string> = { external_id: sha256(reservation.id) };
  if (reservation.email) user.email = hashEmail(reservation.email);
  const phone = reservation.phone ? hashPhone(reservation.phone) : null;
  if (phone) user.phone = phone;
  if (ctx.ttclid) user.ttclid = ctx.ttclid;
  if (ctx.ttp) user.ttp = ctx.ttp;
  if (ctx.ip) user.ip = ctx.ip;
  if (ctx.userAgent) user.user_agent = ctx.userAgent;

  const page: Record<string, string> = {};
  if (ctx.url) page.url = ctx.url;
  if (ctx.referrer) page.referrer = ctx.referrer;

  const testCode = process.env.TIKTOK_TEST_CODE?.trim();
  return {
    event_source: "web",
    event_source_id: TIKTOK_PIXEL_ID,
    ...(testCode ? { test_event_code: testCode } : {}),
    data: [
      {
        event: "CompleteRegistration",
        event_time: Math.floor(bookedAt / 1000),
        event_id: tiktokEventId(reservation.id),
        user,
        page,
        properties: { content_name: "makilove_reservation" },
      },
    ],
  };
}

/** Sends the booking to TikTok; true once TikTok accepted it (code 0). */
export async function sendCompleteRegistration(reservation: StoredReservation, ctx: TiktokContext): Promise<boolean> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(completeRegistrationPayload(reservation, ctx)),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
    if (res.ok && json?.code === 0) return true;
    console.error("[tiktok] Events API rejected the event:", res.status, json?.code, json?.message);
  } catch (error) {
    console.error("[tiktok] Events API unreachable:", error);
  }
  return false;
}
