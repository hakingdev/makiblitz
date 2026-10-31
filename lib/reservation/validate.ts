import { validateEmail } from "@/lib/email/validate-email";

/** Contact-field rules shared by the form (instant feedback) and the API (source of truth). */

export type ContactInput = { name: string; email: string; phone: string; notes: string };
export type ContactField = "name" | "email" | "phone";

export const NAME_MAX = 100;
export const NOTES_MAX = 500;

const PHONE_CHARS = /^[+()\d\s/.-]+$/;

/** Empty is fine (phone is optional); otherwise 6–15 digits in usual notation. */
export function isValidPhone(value: string): boolean {
  const phone = value.trim();
  if (!phone) return true;
  const digits = phone.replace(/\D/g, "").length;
  return PHONE_CHARS.test(phone) && digits >= 6 && digits <= 15;
}

/**
 * Phone in international form (+4917112345678) for WhatsApp/SMS, or null.
 * German habits are understood: "0171 …" → +49171…, "0049 …" → +49…,
 * a bare "171 …" is taken as German too. 8–15 digits (E.164).
 */
export function toE164(value: string): string | null {
  const raw = value.trim();
  if (!raw || !PHONE_CHARS.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  let e164: string;
  if (raw.startsWith("+")) e164 = digits;
  else if (digits.startsWith("00")) e164 = digits.slice(2);
  else if (digits.startsWith("0")) e164 = `49${digits.slice(1)}`;
  else if (digits.startsWith("49") && digits.length >= 11) e164 = digits;
  else e164 = `49${digits}`;
  return e164.length >= 8 && e164.length <= 15 && !e164.startsWith("0") ? `+${e164}` : null;
}

/** Reservation rules: the phone is required — confirmation and reminders go there. */
export function contactErrors(values: ContactInput): Partial<Record<ContactField, true>> {
  const errors: Partial<Record<ContactField, true>> = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > NAME_MAX) errors.name = true;
  if (!validateEmail(values.email)) errors.email = true;
  if (!toE164(values.phone)) errors.phone = true;
  return errors;
}

/** Trimmed values with the normalized (lower-cased) e-mail. */
export function normalizeContact(values: ContactInput): ContactInput {
  return {
    name: values.name.trim(),
    email: validateEmail(values.email) ?? values.email.trim(),
    phone: toE164(values.phone) ?? values.phone.trim(),
    notes: values.notes.trim().slice(0, NOTES_MAX),
  };
}
