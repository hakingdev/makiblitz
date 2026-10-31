import { NextRequest, NextResponse } from "next/server";
import { cancelReservation, confirmReservation, getReservationByToken } from "@/lib/reservation/store";
import { manageState } from "@/lib/reservation/manage";
import { notifyGuestCancelled } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

/**
 * The guest's buttons on /r/<token>: { action: "confirm" | "cancel" }.
 * Only POST changes anything — link previews (WhatsApp, mail scanners) open
 * the page with GET and must never confirm or cancel by themselves.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  const action = body.action;
  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const reservation = await getReservationByToken(params.token);
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const state = manageState(reservation);
  if (state === "past" || state === "cancelled") return NextResponse.json({ state }, { status: 409 });

  if (action === "confirm") {
    const confirmed = await confirmReservation(reservation.id);
    return confirmed
      ? NextResponse.json({ state: manageState(confirmed) })
      : NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const cancelled = await cancelReservation(reservation.id, "guest");
  if (!cancelled) return NextResponse.json({ state: "cancelled" });
  await notifyGuestCancelled(cancelled);
  return NextResponse.json({ state: "cancelled" });
}
