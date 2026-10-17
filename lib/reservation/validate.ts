import { validateEmail } from "@/lib/email/validate-email";

/** Contact-field rules shared by the form (instant feedback) and the API (source of truth). */

export type ContactInput = { name: string; email: string; phone: string; notes: string };
export type ContactField = "name" | "email" | "phone";

export const NAME_MAX = 100;
export const NOTES_MAX = 500;

const PHONE_CHARS = /^[+()\d\s/.-]+$/;

export function contactErrors(values: ContactInput): Partial<Record<ContactField, true>> {
  const errors: Partial<Record<ContactField, true>> = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > NAME_MAX) errors.name = true;
  if (!validateEmail(values.email)) errors.email = true;
  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  if (phone && (!PHONE_CHARS.test(phone) || digits < 6 || digits > 15)) errors.phone = true;
  return errors;
}

/** Trimmed values with the normalized (lower-cased) e-mail. */
export function normalizeContact(values: ContactInput): ContactInput {
  return {
    name: values.name.trim(),
    email: validateEmail(values.email) ?? values.email.trim(),
    phone: values.phone.trim(),
    notes: values.notes.trim().slice(0, NOTES_MAX),
  };
}
