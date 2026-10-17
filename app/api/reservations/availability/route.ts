import { NextRequest, NextResponse } from "next/server";
import { availabilityBySlot } from "@/lib/reservation/tables";
import { bookableDates, restaurantNow } from "@/lib/reservation/dates";
import { bookingsOn } from "@/lib/reservation/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reservations/availability?date=YYYY-MM-DD
 * → { date, slots: { "18:00": { maxParty: 8, freeSeats: 22 }, … } } — largest
 * group that still gets a table, and free seats, per arrival time.
 * Aggregates only; no guest data leaves the server.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!bookableDates(restaurantNow()).includes(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const bookings = await bookingsOn(date);
  if (!bookings) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { date, slots: availabilityBySlot(bookings) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
