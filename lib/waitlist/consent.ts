import { getMessages } from "@/lib/i18n";

/**
 * Version marker of the consent wording shown next to the checkbox.
 * Bump it whenever the consent text in messages/de.json changes —
 * every logged signup stores this version as proof of what the
 * subscriber actually agreed to (Art. 7 Abs. 1 DSGVO).
 */
export const CONSENT_TEXT_VERSION = "2026-07-v1";

const t = getMessages();

/** Canonical full consent text as rendered next to the checkbox. */
export const CONSENT_TEXT =
  `${t.form.consent} ` +
  `${t.form.consentPrivacyPrefix}${t.form.consentPrivacyLink}${t.form.consentPrivacySuffix}`;
