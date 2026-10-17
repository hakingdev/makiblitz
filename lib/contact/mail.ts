import { getMessages } from "@/lib/i18n";
import { OWNER_TO, escapeHtml, sendMail } from "@/lib/waitlist/mailer";
import type { ContactMessage } from "./validate";

const o = getMessages().emails.contactOwner;

/** Forwards a contact-form message to the restaurant; replying answers the sender. */
export async function sendContactMail(m: ContactMessage) {
  const rows: [string, string][] = [
    [o.labels.name, m.name],
    [o.labels.email, m.email],
  ];
  if (m.phone) rows.push([o.labels.phone, m.phone]);
  await sendMail({
    to: OWNER_TO(),
    replyTo: { email: m.email, name: m.name },
    subject: o.subject.replace("{name}", m.name),
    text: [o.heading, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", `${o.labels.message}:`, m.message, "", "--", o.replyHint].join("\n"),
    html: `<!doctype html><html lang="de"><body style="margin:0;background:#FFFCF8;font-family:Mulish,Arial,sans-serif;color:#211D1B;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<p style="margin:0 0 16px;font-size:18px;font-weight:700;">${escapeHtml(o.heading)}</p>
<table role="presentation" style="border-collapse:collapse;font-size:15px;margin:0 0 16px;">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#706864;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:700;">${escapeHtml(value)}</td></tr>`,
      )
      .join("")}</table>
<div style="background:#F9EBE7;border-radius:16px;padding:16px 20px;font-size:15px;line-height:24px;">${escapeHtml(m.message).replace(/\n/g, "<br/>")}</div>
<p style="margin:16px 0 0;font-size:12px;color:#706864;">${escapeHtml(o.replyHint)}</p>
</div></body></html>`,
  });
}
