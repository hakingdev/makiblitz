import { getMessages } from "@/lib/i18n";
import { OWNER_TO, escapeHtml, isMailConfigured, sendMail } from "@/lib/waitlist/mailer";
import { formatLongDate, formatShortDate } from "./dates";
import type { NewReservation } from "./store";

const t = getMessages();
const g = t.emails.reservationGuest;
const o = t.emails.reservationOwner;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function senderFooter() {
  return { text: [t.emails.footer.sender, ...t.emails.footer.senderLines].join("\n"), lines: t.emails.footer.senderLines };
}

function rowsHtml(rows: [string, string][]): string {
  return rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#706864;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#211D1B;font-weight:700;">${escapeHtml(value).replace(/\n/g, "<br/>")}</td></tr>`,
    )
    .join("");
}

function layout(inner: string): string {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#FFFCF8;font-family:Mulish,Arial,sans-serif;color:#211D1B;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<p style="margin:0 0 24px;font-size:22px;font-weight:700;">Maki<span style="color:#D91F2D;">Love</span></p>
${inner}
</div></body></html>`;
}

/** Confirmation to the guest — transactional, no marketing content. */
async function sendGuestMail(r: NewReservation) {
  const firstName = r.name.split(/\s+/)[0] ?? r.name;
  const rows: [string, string][] = [
    [g.labels.date, formatLongDate(r.date)],
    [g.labels.time, `${r.time} Uhr`],
    [g.labels.guests, String(r.guests)],
  ];
  if (r.notes) rows.push([g.labels.notes, r.notes]);
  const footer = senderFooter();

  const text = [
    fill(g.greeting, { name: firstName }),
    "",
    g.body,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    g.address,
    "",
    g.change,
    "",
    g.signoff,
    "",
    "--",
    footer.text,
  ].join("\n");

  const html = layout(`
<p style="margin:0 0 8px;font-size:16px;line-height:26px;">${escapeHtml(fill(g.greeting, { name: firstName }))}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:26px;">${escapeHtml(g.body)}</p>
<div style="background:#F9EBE7;border-radius:16px;padding:16px 20px;margin:0 0 20px;">
<table role="presentation" style="border-collapse:collapse;font-size:15px;">${rowsHtml(rows)}</table>
</div>
<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#706864;">${escapeHtml(g.address)}</p>
<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#706864;">${escapeHtml(g.change)}</p>
<p style="margin:0;font-size:16px;line-height:26px;">${escapeHtml(g.signoff)}</p>
<hr style="margin:28px 0 16px;border:none;border-top:1px solid #E7DED8;"/>
<p style="margin:0;font-size:12px;line-height:1.6;color:#706864;">${escapeHtml(t.emails.footer.sender)}<br/>${footer.lines.map(escapeHtml).join("<br/>")}</p>`);

  await sendMail({
    to: r.email,
    subject: fill(g.subject, { date: formatShortDate(r.date), time: r.time }),
    text,
    html,
  });
}

/** Internal notice to the restaurant with everything needed to prepare the table. */
async function sendOwnerMail(r: NewReservation, id: string, seatsLeft: number) {
  const rows: [string, string][] = [
    [o.labels.date, formatLongDate(r.date)],
    [o.labels.time, `${r.time} Uhr`],
    [o.labels.guests, String(r.guests)],
    [o.labels.name, r.name],
    [o.labels.email, r.email],
    [o.labels.phone, r.phone || "–"],
    [o.labels.notes, r.notes || "–"],
    [o.labels.seatsLeft, String(seatsLeft)],
    [o.labels.id, id],
  ];
  await sendMail({
    to: OWNER_TO(),
    subject: fill(o.subject, { date: formatShortDate(r.date), time: r.time, guests: r.guests }),
    text: [o.heading, "", ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n"),
    html: layout(
      `<p style="margin:0 0 16px;font-size:18px;font-weight:700;">${escapeHtml(o.heading)}</p><table role="presentation" style="border-collapse:collapse;font-size:15px;">${rowsHtml(rows)}</table>`,
    ),
  });
}

/**
 * Sends the guest confirmation and — only when the Telegram notice didn't go
 * out — the owner e-mail as fallback. Failures are logged, never thrown: the
 * table is booked either way.
 */
export async function sendReservationMails(
  r: NewReservation,
  id: string,
  seatsLeft: number,
  { ownerFallback }: { ownerFallback: boolean },
) {
  if (!isMailConfigured()) {
    console.info("[reservation] mail not configured — booked", id, r.date, r.time, `${r.guests}p`);
    return;
  }
  const jobs = [sendGuestMail(r), ...(ownerFallback ? [sendOwnerMail(r, id, seatsLeft)] : [])];
  const results = await Promise.allSettled(jobs);
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[reservation] ${i === 0 ? "guest" : "owner"} mail failed for ${id}:`, result.reason);
    }
  });
}
