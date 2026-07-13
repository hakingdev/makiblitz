/**
 * Compact, hand-maintained deny-list of throwaway / disposable mailbox
 * providers. These domains publish real MX records (so they sail through the
 * DNS stage), but the mailbox is abandoned minutes later — worthless for a
 * launch waitlist and a reliable spam signal.
 *
 * Kept small and in-code on purpose: no external service, no heavy dependency,
 * trivial to extend — just add a lower-cased apex domain below. The matcher in
 * validate-email.ts also catches sub-domains (e.g. mail.mailinator.com).
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "byom.de",
  "discard.email",
  "dispostable.com",
  "einrot.com",
  "emailondeck.com",
  "fakeinbox.com",
  "fakemail.net",
  "getairmail.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "pokemail.net",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "tmpmail.net",
  "tmpmail.org",
  "trash-mail.com",
  "trashmail.com",
  "trashmail.de",
  "wegwerfemail.de",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);
