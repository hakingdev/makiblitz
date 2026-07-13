import nodemailer from "nodemailer";
import { getMessages } from "@/lib/i18n";
import type { WaitlistRecord } from "@/lib/waitlist/store";

const t = getMessages();

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_TO);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
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

const FROM = () => process.env.MAIL_FROM || "noreply@makiblitz.de";
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

  await getTransporter().sendMail({
    from: FROM(),
    to: opts.to,
    subject: m.subject,
    text,
    html,
  });
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#111827;">${escapeHtml(value)}</td></tr>`;

/**
 * Owner notification — sent ONLY after the subscriber clicked the
 * confirmation link. Pre-opt-in submissions are unverified (invented
 * mailboxes on real domains pass every DNS check) and are therefore never
 * mailed to the owner — double-opt-in is the spam filter.
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

  await getTransporter().sendMail({
    from: FROM(),
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

  await getTransporter().sendMail({
    from: FROM(),
    to: OWNER_TO(),
    subject: m.subject.replace("{email}", opts.email),
    text,
    html,
  });
}
