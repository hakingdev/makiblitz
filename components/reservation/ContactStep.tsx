"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateEmail } from "@/lib/email/validate-email";
import { getMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formTitle } from "@/components/reservation/ReservationChrome";
import { VisitSummary } from "@/components/reservation/VisitSummary";
import { useReservation, type Contact } from "@/components/reservation/ReservationProvider";

const t = getMessages();
const c = t.reservation.contact;

type FieldName = "name" | "email" | "phone";
type Errors = Partial<Record<FieldName, string>>;

const PHONE_CHARS = /^[+()\d\s/.-]+$/;

function validate(values: Contact): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = c.name.error;
  if (!validateEmail(values.email)) errors.email = c.email.error;
  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  if (phone && (!PHONE_CHARS.test(phone) || digits < 6 || digits > 15)) errors.phone = c.phone.error;
  return errors;
}

/** Step 2 — contact details (Figma 6:290 mobile · 6:101 desktop). */
export function ContactStep() {
  const router = useRouter();
  const { visit, contact, hydrated, setContact, confirm } = useReservation();
  const [errors, setErrors] = useState<Errors>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
  };

  // Deep link / reload without a chosen slot → back to step 1.
  useEffect(() => {
    if (hydrated && !visit.time) router.replace("/reservieren");
  }, [hydrated, visit.time, router]);

  useEffect(() => {
    if (hydrated && contact.notes) setNotesOpen(true);
  }, [hydrated, contact.notes]);

  if (!hydrated || !visit.time) return null;

  function update(name: keyof Contact, value: string) {
    setContact({ [name]: value });
    // Clear a shown error as soon as the input becomes valid.
    if (name !== "notes" && errors[name]) {
      const next = validate({ ...contact, [name]: value });
      setErrors((e) => ({ ...e, [name]: next[name] }));
    }
  }

  function blur(name: FieldName) {
    if (!contact[name] && name !== "phone") return;
    setErrors((e) => ({ ...e, [name]: validate(contact)[name] }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = validate(contact);
    setErrors(next);
    const firstInvalid = (["name", "email", "phone"] as const).find((f) => next[f]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }
    setContact({
      name: contact.name.trim(),
      email: validateEmail(contact.email) ?? contact.email.trim(),
      phone: contact.phone.trim(),
      notes: contact.notes.trim(),
    });
    // Frontend-only for now: nothing is sent or stored server-side yet.
    confirm();
    router.push("/reservieren/bestaetigt");
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <h2 className={formTitle}>{c.formTitle}</h2>

      <VisitSummary visit={visit} />

      <Link
        href="/reservieren"
        className="focus-ring self-start rounded text-[13px] font-bold leading-[19px] text-brand hover:underline"
      >
        {c.change}
      </Link>

      <Field
        ref={refs.name}
        id="contact-name"
        name="name"
        label={c.name.label}
        placeholder={c.name.placeholder}
        autoComplete="name"
        required
        value={contact.name}
        error={errors.name}
        onChange={(e) => update("name", e.target.value)}
        onBlur={() => blur("name")}
      />
      <Field
        ref={refs.email}
        id="contact-email"
        name="email"
        type="email"
        inputMode="email"
        label={c.email.label}
        placeholder={c.email.placeholder}
        autoComplete="email"
        required
        value={contact.email}
        error={errors.email}
        onChange={(e) => update("email", e.target.value)}
        onBlur={() => blur("email")}
      />
      <Field
        ref={refs.phone}
        id="contact-phone"
        name="phone"
        type="tel"
        label={c.phone.label}
        placeholder={c.phone.placeholder}
        autoComplete="tel"
        value={contact.phone}
        error={errors.phone}
        onChange={(e) => update("phone", e.target.value)}
        onBlur={() => blur("phone")}
      />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={notesOpen}
          aria-controls="contact-notes-panel"
          onClick={() => setNotesOpen((o) => !o)}
          className="focus-ring self-start rounded text-sm font-bold leading-5"
        >
          {c.notesToggle}
          <span aria-hidden="true" className="ml-2 inline-block w-3">
            {notesOpen ? "−" : "+"}
          </span>
        </button>
        <div id="contact-notes-panel" hidden={!notesOpen}>
          <TextareaField
            id="contact-notes"
            name="notes"
            label={c.notes.label}
            className="[&>label]:sr-only"
            placeholder={c.notes.placeholder}
            maxLength={500}
            value={contact.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs leading-[19px] text-muted">
        <Icon name="check-16" className="mt-px" />
        <span>
          {c.privacyIntro}
          <br />
          {c.privacyPrefix}
          <Link
            href="/datenschutz"
            target="_blank"
            className="focus-ring rounded underline underline-offset-2 hover:text-ink"
          >
            {c.privacyLink}
          </Link>
          {c.privacySuffix}
        </span>
      </p>

      <Button type="submit" className="w-full">
        {c.submit}
      </Button>

      <p className="text-xs leading-5 text-muted">{c.note}</p>
    </form>
  );
}
