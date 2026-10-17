import { NextRequest, NextResponse } from "next/server";
import { GUEST_OPTIONS } from "@/lib/reservation/config";
import { isBookable, restaurantNow } from "@/lib/reservation/dates";
import { sendReservationMails } from "@/lib/reservation/mail";
import { notifyReservation } from "@/lib/telegram/notify";
import { bookReservation, type NewReservation } from "@/lib/reservation/store";
import { contactErrors, normalizeContact } from "@/lib/reservation/validate";
import { hashIp } from "@/lib/waitlist/crypto";
import { isRateLimited } from "@/lib/waitlist/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

/** A missing IP_HASH_SECRET must not block bookings — store no IP trace instead. */
function safeIpHash(ip: string): string | null {
  try {
    return hashIp(ip);
  } catch (error) {
    console.warn("[reservation] IP not hashed:", (error as Error).message);
    return null;
  }
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * POST /api/reservations — books a table.
 * 201 { ok, id } · 400 invalid input · 409 { error: "full", seatsLeft }
 * · 429 rate limited · 503 storage down.
 * The capacity check that counts is the one inside the store (atomic).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const date = str(body.date);
  const time = str(body.time);
  const guests = Number(body.guests);
  if (!GUEST_OPTIONS.some((g) => g === guests) || !isBookable(date, time, restaurantNow())) {
    return NextResponse.json({ error: "invalid_visit" }, { status: 400 });
  }

  const contact = { name: str(body.name), email: str(body.email), phone: str(body.phone), notes: str(body.notes) };
  const fields = Object.keys(contactErrors(contact));
  if (fields.length > 0) {
    return NextResponse.json({ error: "invalid_contact", fields }, { status: 400 });
  }

  const ip = clientIp(req);
  // The in-memory limiter never persists the raw IP; only the hash is stored.
  if (isRateLimited(`reservation:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const clean = normalizeContact(contact);
  const reservation: NewReservation = {
    date,
    time,
    guests,
    name: clean.name,
    email: clean.email,
    phone: clean.phone || null,
    notes: clean.notes || null,
    ipHash: safeIpHash(ip),
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };

  const result = await bookReservation(reservation);
  if (!result.ok) {
    return result.reason === "full"
      ? NextResponse.json({ error: "full", seatsLeft: result.seatsLeft }, { status: 409 })
      : NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // Telegram is the owner's main channel; e-mail to MAIL_TO only if it fails.
  const notified = await notifyReservation(reservation, result.id, result.seatsLeft);
  await sendReservationMails(reservation, result.id, result.seatsLeft, { ownerFallback: !notified });
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
