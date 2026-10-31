import { getMessages } from "@/lib/i18n";
import { formatShortDate } from "@/lib/reservation/dates";
import type { StoredReservation } from "@/lib/reservation/store";
import { logMessage, type GuestMessage } from "./log";
import { TEMPLATE_SIDS, smsText, type TemplateKey } from "./templates";
import { SMS_FROM, WHATSAPP_FROM, isTwilioConfigured, sendTwilioMessage } from "./twilio";
import { getBaseUrl } from "@/lib/site";

/**
 * WhatsApp/SMS to the guest via Twilio: an approved WhatsApp template first;
 * if Twilio can't deliver it (number not on WhatsApp, …) the same text goes
 * out once as SMS from "MakiLove" (see the status webhook). Every message is
 * logged in guest_messages.
 */
export type GuestMessageKind = TemplateKey;

const t = getMessages();

export function isGuestMessagingConfigured(): boolean {
  return isTwilioConfigured() && Object.values(TEMPLATE_SIDS).every(Boolean);
}

export const statusCallbackUrl = () => `${getBaseUrl()}/api/twilio/status`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const guestsText = (n: number) => `${n} ${n === 1 ? t.reservation.person : t.reservation.persons}`;

export function templateVariables(kind: GuestMessageKind, r: StoredReservation): Record<string, string> {
  const token = r.manageToken ?? "";
  if (kind === "booked") {
    return { "1": firstName(r.name), "2": formatShortDate(r.date), "3": r.time, "4": guestsText(r.guests), "5": token };
  }
  if (kind === "reminder_24h") return { "1": firstName(r.name), "2": r.time, "3": guestsText(r.guests), "4": token };
  return { "1": firstName(r.name), "2": r.time, "3": token };
}

export async function sendGuestMessage(kind: GuestMessageKind, r: StoredReservation): Promise<boolean> {
  if (!isGuestMessagingConfigured() || !r.phone || !r.manageToken) return false;
  const vars = templateVariables(kind, r);
  const body = smsText(kind, vars);
  const sent = await sendTwilioMessage({
    To: `whatsapp:${r.phone}`,
    From: WHATSAPP_FROM,
    ContentSid: TEMPLATE_SIDS[kind],
    ContentVariables: JSON.stringify(vars),
    StatusCallback: statusCallbackUrl(),
  });
  const logged = await logMessage({
    reservationId: r.id,
    phone: r.phone,
    direction: "out",
    kind,
    channel: "whatsapp",
    body,
    twilioSid: sent.ok ? sent.sid : null,
    status: sent.ok ? sent.status : "failed",
    errorCode: sent.ok ? null : sent.error,
  });
  if (sent.ok) return true;
  // Rejected right away (e.g. not a WhatsApp number): straight to SMS.
  return logged ? Boolean(await sendSmsFallback(logged)) : false;
}

/** Sends a failed WhatsApp message once more as SMS; returns the SMS log entry. */
export async function sendSmsFallback(failed: GuestMessage): Promise<GuestMessage | null> {
  if (!failed.body) return null;
  const sent = await sendTwilioMessage({
    To: failed.phone,
    From: SMS_FROM,
    Body: failed.body,
    StatusCallback: statusCallbackUrl(),
  });
  return logMessage({
    reservationId: failed.reservationId,
    phone: failed.phone,
    direction: "out",
    kind: failed.kind,
    channel: "sms",
    body: failed.body,
    twilioSid: sent.ok ? sent.sid : null,
    status: sent.ok ? sent.status : "failed",
    errorCode: sent.ok ? null : sent.error,
    fallbackOf: failed.id,
  }).then((logged) => (sent.ok ? logged : null));
}

/** Free-form WhatsApp (only inside the 24-hour window after the guest wrote). */
export async function sendWhatsAppReply(phone: string, text: string, reservationId: string | null): Promise<boolean> {
  if (!isTwilioConfigured()) return false;
  const sent = await sendTwilioMessage({ To: `whatsapp:${phone}`, From: WHATSAPP_FROM, Body: text, StatusCallback: statusCallbackUrl() });
  await logMessage({
    reservationId,
    phone,
    direction: "out",
    kind: "reply",
    channel: "whatsapp",
    body: text,
    twilioSid: sent.ok ? sent.sid : null,
    status: sent.ok ? sent.status : "failed",
    errorCode: sent.ok ? null : sent.error,
  });
  return sent.ok;
}
