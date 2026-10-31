import { NextRequest, NextResponse } from "next/server";
import { logMessage } from "@/lib/messaging/log";
import { readTwilioWebhook } from "@/lib/messaging/webhook";
import { latestReservationByPhone } from "@/lib/reservation/store";
import { notifyGuestWhatsApp } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * A guest wrote to the MakiLove WhatsApp number: log it (this opens the
 * 24-hour window for free-form replies) and forward it to Telegram, linked
 * to the guest's latest booking when the number matches one.
 */
export async function POST(req: NextRequest) {
  const params = await readTwilioWebhook(req, "/api/twilio/inbound");
  if (!params) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const phone = (params.From ?? "").replace(/^whatsapp:/, "");
  if (/^\+\d{8,15}$/.test(phone)) {
    const reservation = await latestReservationByPhone(phone);
    const body = params.Body ?? "";
    await logMessage({
      reservationId: reservation?.id ?? null,
      phone,
      direction: "in",
      kind: "inbound",
      channel: "whatsapp",
      body,
      twilioSid: params.MessageSid ?? null,
      status: "received",
    });
    await notifyGuestWhatsApp({
      phone,
      profileName: params.ProfileName || null,
      body,
      media: Number(params.NumMedia ?? 0) || 0,
      reservation,
    });
  }
  return new NextResponse(EMPTY_TWIML, { headers: { "content-type": "text/xml" } });
}
