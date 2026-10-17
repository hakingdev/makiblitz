"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { getMessages } from "@/lib/i18n";
import {
  MESSAGE_MAX,
  contactMessageErrors,
  normalizeContactMessage,
  type ContactMessage,
  type ContactMessageField,
} from "@/lib/contact/validate";
import { NAME_MAX } from "@/lib/reservation/validate";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const c = getMessages().contactPage;

const FIELDS = ["name", "email", "phone", "message"] as const;
type Errors = Partial<Record<ContactMessageField, string>>;

function validate(values: ContactMessage): Errors {
  const found = contactMessageErrors(values);
  return Object.fromEntries(FIELDS.filter((f) => found[f]).map((f) => [f, c[f].error]));
}

const EMPTY: ContactMessage = { name: "", email: "", phone: "", message: "" };

/** Contact / Message form (Figma 15:1078 · 15:569) — sends to /api/contact. */
export function ContactForm() {
  const [values, setValues] = useState<ContactMessage>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [submitError, setSubmitError] = useState<"rate" | "generic" | null>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };

  function update(field: ContactMessageField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validate(next)[field] }));
  }

  function blur(field: ContactMessageField) {
    if (values[field]) setErrors((e) => ({ ...e, [field]: validate(values)[field] }));
  }

  function showErrors(next: Errors) {
    setErrors(next);
    const first = FIELDS.find((f) => next[f]);
    if (first) refs[first].current?.focus();
    return Boolean(first);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending" || showErrors(validate(values))) return;
    setStatus("sending");
    setSubmitError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(normalizeContactMessage(values)),
      });
      if (res.ok) {
        setStatus("sent");
        setValues(EMPTY);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { fields?: ContactMessageField[] };
      if (res.status === 400 && data.fields?.length) {
        showErrors(Object.fromEntries(data.fields.map((f) => [f, c[f].error])));
      } else {
        setSubmitError(res.status === 429 ? "rate" : "generic");
      }
    } catch {
      setSubmitError("generic");
    }
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-blush p-5">
        <Icon name="check-18" className="mt-1" />
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold leading-6 text-ink">{c.success.title}</p>
          <p className="text-sm leading-[22px] text-muted">{c.success.body}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Field
        ref={refs.name}
        id="message-name"
        name="name"
        label={c.name.label}
        placeholder={c.name.placeholder}
        autoComplete="name"
        maxLength={NAME_MAX}
        required
        value={values.name}
        error={errors.name}
        onChange={(e) => update("name", e.target.value)}
        onBlur={() => blur("name")}
      />
      <Field
        ref={refs.email}
        id="message-email"
        name="email"
        type="email"
        inputMode="email"
        label={c.email.label}
        placeholder={c.email.placeholder}
        autoComplete="email"
        required
        value={values.email}
        error={errors.email}
        onChange={(e) => update("email", e.target.value)}
        onBlur={() => blur("email")}
      />
      {/* Not in the Figma frame: lets the restaurant answer via WhatsApp from the Telegram bot. */}
      <Field
        ref={refs.phone}
        id="message-phone"
        name="phone"
        type="tel"
        label={c.phone.label}
        placeholder={c.phone.placeholder}
        autoComplete="tel"
        value={values.phone}
        error={errors.phone}
        onChange={(e) => update("phone", e.target.value)}
        onBlur={() => blur("phone")}
      />
      <TextareaField
        ref={refs.message}
        id="message-text"
        name="message"
        label={c.message.label}
        placeholder={c.message.placeholder}
        inputClassName="h-40"
        maxLength={MESSAGE_MAX}
        required
        value={values.message}
        error={errors.message}
        onChange={(e) => update("message", e.target.value)}
        onBlur={() => blur("message")}
      />

      <p className="text-xs leading-5 text-muted">
        {c.privacyPrefix}
        <Link href="/datenschutz" className="focus-ring rounded underline underline-offset-2 hover:text-ink">
          {c.privacyLink}
        </Link>
        {c.privacySuffix}
      </p>

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-brand bg-white px-4 py-3 text-xs font-bold leading-[18px] text-brand lg:text-sm lg:leading-5"
        >
          {submitError === "rate" ? c.errorRateLimit : c.errorGeneric}
        </p>
      )}

      <Button type="submit" disabled={status === "sending"} aria-busy={status === "sending"} className="w-full">
        {status === "sending" ? c.submitting : c.submit}
      </Button>
    </form>
  );
}
