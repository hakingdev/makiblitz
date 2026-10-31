/**
 * WhatsApp templates for guest messages (Twilio Content API, category
 * UTILITY, German, "du"). The bodies here are the source of truth: the setup
 * script (scripts/twilio-setup.ts) creates them in Twilio and submits them to
 * Meta; the same texts, with the link spelled out, are the SMS fallback.
 *
 * WhatsApp rules: a body never starts or ends with a variable; the link sits
 * in a URL button whose only variable is at the end of the URL.
 */

export type TemplateKey = "booked" | "reminder_24h" | "reminder_2h";

export const MANAGE_BASE = "https://www.makilove.de/r/";

export type TemplateDef = {
  /** Lower-case name the template carries at Meta. */
  name: string;
  body: string;
  button: string;
  /** Variable number of the manage token (URL button suffix). */
  tokenVar: string;
  /** Sample values Meta reviews the template with. */
  sample: Record<string, string>;
};

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  booked: {
    name: "makilove_booking_confirmed",
    body:
      "Hallo {{1}}, dein Tisch bei MakiLove ist reserviert ✓\n" +
      "📅 {{2}} um {{3}} Uhr · 👥 {{4}}\n" +
      "📍 Kurhausstr. 11A, Bad Kissingen\n\n" +
      "Über den Button kannst du deine Reservierung bestätigen oder absagen.\n" +
      "Bis bald – dein MakiLove-Team",
    button: "Reservierung ansehen",
    tokenVar: "5",
    sample: { "1": "Anna", "2": "Sa, 7. Nov.", "3": "19:00", "4": "2 Personen", "5": "3f2a9c0d1e4b4f6a8b7c5d2e1f0a9b8c" },
  },
  reminder_24h: {
    name: "makilove_reminder_24h",
    body:
      "Hallo {{1}}, morgen um {{2}} Uhr erwarten wir dich bei MakiLove (👥 {{3}}). " +
      "Kommt ihr wie geplant? Bitte bestätige kurz – oder sag ab, falls etwas dazwischenkommt.",
    button: "Bestätigen / absagen",
    tokenVar: "4",
    sample: { "1": "Anna", "2": "19:00", "3": "2 Personen", "4": "3f2a9c0d1e4b4f6a8b7c5d2e1f0a9b8c" },
  },
  reminder_2h: {
    name: "makilove_reminder_2h",
    body:
      "Hallo {{1}}, heute um {{2}} Uhr ist dein Tisch bei MakiLove für dich bereit. " +
      "Wir schätzen deine Zeit und möchten keinen Tisch unnötig blockieren – bitte bestätige kurz, " +
      "dass ihr kommt, oder gib uns Bescheid, falls etwas dazwischengekommen ist.",
    button: "Bestätigen / absagen",
    tokenVar: "3",
    sample: { "1": "Anna", "2": "19:00", "3": "3f2a9c0d1e4b4f6a8b7c5d2e1f0a9b8c" },
  },
};

/** Twilio Content SIDs of the templates above (printed by scripts/twilio-setup.ts). */
export const TEMPLATE_SIDS: Record<TemplateKey, string> = {
  booked: "HX7bff58a88abb2ea451b960108f83a1ae",
  reminder_24h: "HXa3ca7b69182567d775a73d8860d8f3c9",
  reminder_2h: "HXb499153d8f0f9864c76527fe6dbc9603",
};

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{\{(\d+)\}\}/g, (_, n: string) => vars[n] ?? "");

/** Plain-text version for SMS: the same body plus the link. */
export function smsText(key: TemplateKey, vars: Record<string, string>): string {
  const t = TEMPLATES[key];
  return `${fill(t.body, vars)}\n${MANAGE_BASE}${vars[t.tokenVar] ?? ""}`;
}
