"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getMessages } from "@/lib/i18n";
import { contactErrors, normalizeContact, NAME_MAX, NOTES_MAX, type ContactField } from "@/lib/reservation/validate";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formTitle } from "@/components/reservation/ReservationChrome";
import { VisitSummary, guestsLabel } from "@/components/reservation/VisitSummary";
import { useReservation, type Contact } from "@/components/reservation/ReservationProvider";

const t = getMessages();
const c = t.reservation.contact;

type FieldName = ContactField;
type Errors = Partial<Record<FieldName, string>>;

const FIELDS = ["name", "email", "phone"] as const;

function validate(values: Contact): Errors {
  const found = contactErrors(values);
  return Object.fromEntries(FIELDS.filter((f) => found[f]).map((f) => [f, c[f].error]));
}

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

type SubmitError = "full" | "rate" | "generic";

/** Step 2 — contact details (Figma 6:290 mobile · 6:101 desktop). */
export function ContactStep() {
  const router = useRouter();
  const { visit, contact, hydrated, setContact, confirm } = useReservation();
  const [errors, setErrors] = useState<Errors>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
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

  function showFieldErrors(next: Errors) {
    setErrors(next);
    const firstInvalid = FIELDS.find((f) => next[f]);
    if (firstInvalid) refs[firstInvalid].current?.focus();
    return Boolean(firstInvalid);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting || showFieldErrors(validate(contact))) return;

    const clean = normalizeContact(contact);
    setContact(clean);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...visit, ...clean }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; fields?: FieldName[] };
      if (res.status === 201 && data.id) {
        confirm(data.id);
        router.push("/reservieren/bestaetigt");
        return;
      }
      if (res.status === 400 && data.fields?.length) {
        showFieldErrors(Object.fromEntries(data.fields.map((f) => [f, c[f].error])));
      } else {
        setSubmitError(res.status === 409 ? "full" : res.status === 429 ? "rate" : "generic");
      }
    } catch {
      setSubmitError("generic");
    }
    setSubmitting(false);
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
        maxLength={NAME_MAX}
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
            maxLength={NOTES_MAX}
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

      {submitError && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-brand bg-white px-4 py-3 text-xs font-bold leading-[18px] text-brand lg:text-sm lg:leading-5">
          <p>
            {submitError === "full"
              ? fill(c.errorFull, { time: visit.time, guests: guestsLabel(visit.guests) })
              : submitError === "rate"
                ? c.errorRateLimit
                : c.errorGeneric}
          </p>
          {submitError === "full" && (
            <Link href="/reservieren" className="focus-ring rounded underline underline-offset-2 hover:text-brand-dark">
              {c.errorFullAction}
            </Link>
          )}
        </div>
      )}

      <Button type="submit" disabled={submitting} aria-busy={submitting} className="w-full">
        {submitting ? c.submitting : c.submit}
      </Button>

      <p className="text-xs leading-5 text-muted">{c.note}</p>
    </form>
  );
}
