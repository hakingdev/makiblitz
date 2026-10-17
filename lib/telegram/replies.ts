import { getMessages } from "@/lib/i18n";
import { getContactRequest, markContactRequestAnswered } from "@/lib/contact/store";
import { formatLongDate, formatShortDate } from "@/lib/reservation/dates";
import { getReservation } from "@/lib/reservation/store";
import { escapeHtml, isMailConfigured, sendMail } from "@/lib/waitlist/mailer";
import type { Ref } from "./refs";

const t = getMessages();
const m = t.emails.reply;

/** Who an answer from the bot goes to, and what it answers. */
export type Recipient = {
  ref: Ref;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  quoteLabel: string;
  quote: string;
};

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

const berlinDate = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium" });

export async function loadRecipient(ref: Ref): Promise<Recipient | null> {
  if (ref.kind === "c") {
    const req = await getContactRequest(ref.id);
    if (!req) return null;
    return {
      ref,
      name: req.name,
      email: req.email,
      phone: req.phone,
      subject: m.contactSubject,
      quoteLabel: fill(m.contactQuote, { date: berlinDate.format(new Date(req.createdAt)) }),
      quote: req.message,
    };
  }
  const res = await getReservation(ref.id);
  if (!res?.email) return null; // walk-ins have no address
  const guests = `${res.guests} ${res.guests === 1 ? t.reservation.person : t.reservation.persons}`;
  return {
    ref,
    name: res.name,
    email: res.email,
    phone: res.phone,
    subject: fill(m.reservationSubject, { date: formatShortDate(res.date), time: res.time }),
    quoteLabel: m.reservationQuote,
    quote: fill(m.reservationLine, { guests, date: formatLongDate(res.date), time: res.time }),
  };
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Text for the WhatsApp button, so the same answer can go out there with one tap. */
export function whatsappText(recipient: Recipient, answer: string) {
  return `${fill(m.greeting, { name: firstName(recipient.name) })}\n\n${answer}\n\n${m.whatsappSignoff}`;
}

/** Sends the owner's answer to the guest by e-mail; replies from the guest go to MAIL_TO. */
export async function sendReplyMail(recipient: Recipient, answer: string): Promise<boolean> {
  if (!isMailConfigured()) {
    console.info("[telegram] mail not configured — reply to", recipient.email, `(${answer.length} chars)`);
    return false;
  }
  const greeting = fill(m.greeting, { name: firstName(recipient.name) });
  const footer = [t.emails.footer.sender, ...t.emails.footer.senderLines];
  try {
    await sendMail({
      to: recipient.email,
      subject: recipient.subject,
      text: [greeting, "", answer, "", ...m.signoff, "", "> " + recipient.quoteLabel, ...recipient.quote.split("\n").map((l) => `> ${l}`), "", "--", ...footer].join("\n"),
      html: `<!doctype html><html lang="de"><body style="margin:0;background:#FFFCF8;font-family:Mulish,Arial,sans-serif;color:#211D1B;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<p style="margin:0 0 24px;font-size:22px;font-weight:700;">Maki<span style="color:#D91F2D;">Love</span></p>
<p style="margin:0 0 16px;font-size:16px;line-height:26px;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:26px;">${escapeHtml(answer).replace(/\n/g, "<br/>")}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:26px;">${m.signoff.map(escapeHtml).join("<br/>")}</p>
<div style="border-left:3px solid #E7DED8;padding:4px 0 4px 16px;color:#706864;font-size:14px;line-height:22px;">
<p style="margin:0 0 4px;font-weight:700;">${escapeHtml(recipient.quoteLabel)}</p>
<p style="margin:0;">${escapeHtml(recipient.quote).replace(/\n/g, "<br/>")}</p>
</div>
<hr style="margin:28px 0 16px;border:none;border-top:1px solid #E7DED8;"/>
<p style="margin:0;font-size:12px;line-height:1.6;color:#706864;">${footer.map(escapeHtml).join("<br/>")}</p>
</div></body></html>`,
    });
    if (recipient.ref.kind === "c") await markContactRequestAnswered(recipient.ref.id, answer);
    return true;
  } catch (error) {
    console.error("[telegram] reply mail failed:", error);
    return false;
  }
}
