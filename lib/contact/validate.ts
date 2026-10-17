import { validateEmail } from "@/lib/email/validate-email";
import { NAME_MAX } from "@/lib/reservation/validate";

/** Contact-form rules shared by the form (instant feedback) and /api/contact. */

export type ContactMessage = { name: string; email: string; message: string };
export type ContactMessageField = keyof ContactMessage;

export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 2000;

export function contactMessageErrors(values: ContactMessage): Partial<Record<ContactMessageField, true>> {
  const errors: Partial<Record<ContactMessageField, true>> = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > NAME_MAX) errors.name = true;
  if (!validateEmail(values.email)) errors.email = true;
  const message = values.message.trim();
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) errors.message = true;
  return errors;
}

export function normalizeContactMessage(values: ContactMessage): ContactMessage {
  return {
    name: values.name.trim(),
    email: validateEmail(values.email) ?? values.email.trim(),
    message: values.message.trim(),
  };
}
