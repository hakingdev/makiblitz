import { NextRequest, NextResponse } from "next/server";
import { cancelReservation, confirmReservation, getReservationByToken } from "@/lib/reservation/store";
import { manageState } from "@/lib/reservation/manage";
import { notifyGuestCancelled, notifyGuestConfirmed } from "@/lib/telegram/notify";

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
  // Token suffix only — enough to follow one booking in the logs, no PII.
  const log = (result: string) => console.info(`[manage] …${params.token.slice(-4)} ${action}: ${state} → ${result}`);
  if (state === "past" || state === "cancelled") {
    log(`refused (${state})`);
    return NextResponse.json({ state }, { status: 409 });
  }

  if (action === "confirm") {
    const confirmed = await confirmReservation(reservation.id);
    if (!confirmed) {
      log("unavailable");
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    const after = manageState(confirmed);
    log(after);
    // Only the first confirmation is news for the staff.
    if (after === "confirmed" && !reservation.confirmedAt) await notifyGuestConfirmed(confirmed);
    return NextResponse.json({ state: after });
  }

  const cancelled = await cancelReservation(reservation.id, "guest");
  if (!cancelled) {
    const now = await getReservationByToken(params.token);
    const after = now ? manageState(now) : "cancelled";
    log(`not cancelled, now ${after}`);
    return NextResponse.json({ state: after }, { status: after === "cancelled" ? 200 : 503 });
  }
  log("cancelled");
  await notifyGuestCancelled(cancelled);
  return NextResponse.json({ state: "cancelled" });
}
