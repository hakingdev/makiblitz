import { getMessages } from "@/lib/i18n";
import type { WaitlistRecord } from "@/lib/waitlist/store";

const t = getMessages();

/** True once we have a Brevo API key to send through. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Sender for every mail. MAIL_FROM must be a VERIFIED sender (or an
 * authenticated domain) in Brevo — an unverified address is rejected with
 * HTTP 400. Accepts a bare address or "Name <addr>"; MAIL_FROM_NAME adds a
 * display name to a bare address.
 */
function sender(): { email: string; name?: string } {
  const raw = process.env.MAIL_FROM || "info@makiblitz.de";
  const named = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (named) {
    const name = named[1]?.trim();
    return name ? { name, email: named[2]! } : { email: named[2]! };
  }
  const name = process.env.MAIL_FROM_NAME?.trim();
  return name ? { name, email: raw } : { email: raw };
}

/**
 * Transport for all outgoing mail: Brevo's transactional API over HTTPS.
 * Chosen over SMTP because Vercel serverless functions have no stable
 * outbound IP and SMTP sockets are unreliable there; a plain POST is not.
 */
async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
        textContent: opts.text,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBerlinTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

/** Owner notifications always have a working fallback destination. */
const OWNER_TO = () => process.env.MAIL_TO || "info@makiblitz.de";

/**
 * § 7 UWG / DSGVO footer for every mail sent TO subscribers:
 * sender identification (Impressum data) + one-click unsubscribe link.
 * Owner notifications are internal and do not need it.
 */
function subscriberFooterText(unsubscribeUrl: string): string {
  return [
    "--",
    t.emails.footer.sender,
    ...t.emails.footer.senderLines,
    "",
    t.emails.footer.unsubscribe,
    unsubscribeUrl,
  ].join("\n");
}

function subscriberFooterHtml(unsubscribeUrl: string): string {
  const senderLines = t.emails.footer.senderLines
    .map((line) => escapeHtml(line))
    .join("<br/>");
  return `
    <hr style="margin:28px 0 16px;border:none;border-top:1px solid #e5e7eb;"/>
    <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6b7280;">
      ${escapeHtml(t.emails.footer.sender)}<br/>${senderLines}
    </p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
      ${escapeHtml(t.emails.footer.unsubscribe)}
      <a href="${unsubscribeUrl}" style="color:#6b7280;">${unsubscribeUrl}</a>
    </p>`;
}

/**
 * Neutral double-opt-in mail (no advertising — § 7 UWG, BGH I ZR 164/09):
 * only the confirmation request, validity note, footer.
 */
export async function sendConfirmMail(opts: {
  to: string;
  confirmUrl: string;
  unsubscribeUrl: string;
}): Promise<void> {
  const m = t.emails.confirm;

  const text = [
    m.greeting,
    "",
    m.body,
    "",
    `${m.button}: ${opts.confirmUrl}`,
    "",
    m.validity,
    m.ignore,
    "",
    subscriberFooterText(opts.unsubscribeUrl),
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:520px;">
      <p style="margin:0 0 12px;">${escapeHtml(m.greeting)}</p>
      <p style="margin:0 0 20px;">${escapeHtml(m.body)}</p>
      <p style="margin:0 0 20px;">
        <a href="${opts.confirmUrl}"
           style="display:inline-block;padding:12px 28px;border-radius:9999px;background:#e23b3b;color:#ffffff;font-weight:700;text-decoration:none;">
          ${escapeHtml(m.button)}
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${escapeHtml(m.validity)}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">${escapeHtml(m.ignore)}</p>
      ${subscriberFooterHtml(opts.unsubscribeUrl)}
    </div>`;

  await sendMail({
    to: opts.to,
    subject: m.subject,
    text,
    html,
  });
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#111827;">${escapeHtml(value)}</td></tr>`;

/**
 * Owner heads-up for EVERY form submission — sent right after the
 * double-opt-in mail, before any confirmation. Clearly marked "pending":
 * the "confirmed" mail below stays the legally meaningful one (§ 7 UWG).
 *
 * Fakes are filtered upstream (numeric-garbage domains + MX reachability in
 * validate.ts / email-dns.ts) before this ever fires, so the notifications
 * stay clean. Best-effort: a failure here must not fail the signup.
 */
export async function sendOwnerPendingMail(
  record: WaitlistRecord,
): Promise<void> {
  const m = t.emails.ownerPending;
  const labels = t.emails.ownerConfirmed.labels;
  const phone = record.phone || "–";
  const consentAt = record.consentAt ? formatBerlinTime(record.consentAt) : "–";

  const text = [
    m.heading,
    "",
    `${labels.email}:          ${record.email}`,
    `${labels.phone}:         ${phone}`,
    `${labels.plz}:             ${record.plz ?? "–"}`,
    `${labels.consentAt}:   ${consentAt}`,
    `${labels.consentVersion}: ${record.consentTextVersion ?? "–"}`,
    `${labels.userAgent}:      ${record.userAgent}`,
    "",
    m.note,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">🍣 ${escapeHtml(m.heading)}</h2>
      <table style="border-collapse:collapse;">
        ${row(labels.email, record.email)}
        ${row(labels.phone, phone)}
        ${row(labels.plz, record.plz ?? "–")}
        ${row(labels.consentAt, consentAt)}
        ${row(labels.consentVersion, record.consentTextVersion ?? "–")}
        ${row(labels.userAgent, record.userAgent)}
      </table>
      <p style="margin:14px 0 0;font-size:13px;color:#6b7280;">${escapeHtml(m.note)}</p>
    </div>`;

  await sendMail({
    to: OWNER_TO(),
    subject: m.subject.replace("{plz}", record.plz ?? "?"),
    text,
    html,
  });
}

/**
 * Owner notification — sent ONLY after the subscriber clicked the
 * confirmation link. This is the actual "signup" mail.
 */
export async function sendOwnerConfirmedMail(
  record: WaitlistRecord,
): Promise<void> {
  const m = t.emails.ownerConfirmed;
  const phone = record.phone || "–";
  const consentAt = record.consentAt ? formatBerlinTime(record.consentAt) : "–";
  const confirmedAt = record.confirmedAt
    ? formatBerlinTime(record.confirmedAt)
    : "–";

  const text = [
    m.heading,
    "",
    `${m.labels.email}:          ${record.email}`,
    `${m.labels.phone}:         ${phone}`,
    `${m.labels.plz}:             ${record.plz ?? "–"}`,
    `${m.labels.consentAt}:   ${consentAt}`,
    `${m.labels.confirmedAt}:   ${confirmedAt}`,
    `${m.labels.consentVersion}: ${record.consentTextVersion ?? "–"}`,
    `${m.labels.userAgent}:      ${record.userAgent}`,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">🍣 ${escapeHtml(m.heading)}</h2>
      <table style="border-collapse:collapse;">
        ${row(m.labels.email, record.email)}
        ${row(m.labels.phone, phone)}
        ${row(m.labels.plz, record.plz ?? "–")}
        ${row(m.labels.consentAt, consentAt)}
        ${row(m.labels.confirmedAt, confirmedAt)}
        ${row(m.labels.consentVersion, record.consentTextVersion ?? "–")}
        ${row(m.labels.userAgent, record.userAgent)}
      </table>
    </div>`;

  await sendMail({
    to: OWNER_TO(),
    subject: m.subject.replace("{plz}", record.plz ?? "?"),
    text,
    html,
  });
}

/** Owner notification about an opt-out (Art. 7 Abs. 3 DSGVO). */
export async function sendOwnerUnsubscribedMail(opts: {
  email: string;
  unsubscribedAt: string;
}): Promise<void> {
  const m = t.emails.ownerUnsubscribed;
  const when = formatBerlinTime(opts.unsubscribedAt);

  const text = [
    m.heading,
    "",
    `${m.labels.email}: ${opts.email}`,
    `${m.labels.unsubscribedAt}: ${when}`,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">${escapeHtml(m.heading)}</h2>
      <table style="border-collapse:collapse;">
        ${row(m.labels.email, opts.email)}
        ${row(m.labels.unsubscribedAt, when)}
      </table>
    </div>`;

  await sendMail({
    to: OWNER_TO(),
    subject: m.subject.replace("{email}", opts.email),
    text,
    html,
  });
}
