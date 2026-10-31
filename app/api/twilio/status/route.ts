import { NextRequest, NextResponse } from "next/server";
import { updateStatus } from "@/lib/messaging/log";
import { sendSmsFallback } from "@/lib/messaging/guest";
import { readTwilioWebhook } from "@/lib/messaging/webhook";
import { getReservation } from "@/lib/reservation/store";
import { notifyUndeliverable } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

const WHAT = {
  booked: "подтверждение брони",
  reminder_24h: "напоминание за 24 ч",
  reminder_2h: "напоминание за 2 ч",
  reply: "ответ в WhatsApp",
  inbound: "сообщение",
} as const;

/**
 * Delivery status of every message we send (StatusCallback). A WhatsApp
 * booking message or reminder that fails goes out once more as SMS; if that
 * fails too — or a WhatsApp reply fails — the staff gets "📵" in Telegram.
 */
export async function POST(req: NextRequest) {
  const params = await readTwilioWebhook(req, "/api/twilio/status");
  if (!params) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sid = params.MessageSid ?? params.SmsSid;
  const status = params.MessageStatus ?? params.SmsStatus;
  if (!sid || !status) return new NextResponse(null, { status: 204 });

  const { message, newlyFailed } = await updateStatus(sid, status, params.ErrorCode ?? null);
  if (!message || !newlyFailed || message.direction !== "out") return new NextResponse(null, { status: 204 });

  const reservation = message.reservationId ? await getReservation(message.reservationId) : null;
  if (message.channel === "whatsapp" && message.kind !== "reply") {
    if (!(await sendSmsFallback(message))) await notifyUndeliverable(message.phone, reservation, `${WHAT[message.kind]} (WhatsApp и SMS)`);
  } else {
    const what = message.channel === "sms" ? `${WHAT[message.kind]} (WhatsApp и SMS)` : WHAT[message.kind];
    await notifyUndeliverable(message.phone, reservation, what);
  }
  return new NextResponse(null, { status: 204 });
}
