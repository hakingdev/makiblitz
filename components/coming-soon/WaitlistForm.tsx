"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getMessages } from "@/lib/i18n";
import {
  normalizeEmail,
  normalizePhone,
  normalizePlz,
} from "@/lib/waitlist/validate";
import { Button } from "@/components/ui/Button";

const t = getMessages();

type FieldErrors = { email?: string; phone?: string; plz?: string };

const inputBase =
  "h-12 w-full rounded-card border bg-white/5 px-4 text-base text-white placeholder:text-white/35 outline-none transition-colors focus:border-brand-light focus:ring-2 focus:ring-brand/40";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plz, setPlz] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [consentInvalid, setConsentInvalid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const plzRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // Inline validation on blur: only flag non-empty invalid input — an empty
  // required field is announced on submit, not while tabbing through.
  function validateOnBlur(field: keyof FieldErrors) {
    const message =
      field === "email"
        ? email && !normalizeEmail(email) && t.status.errorEmail
        : field === "phone"
          ? normalizePhone(phone) === null && t.status.errorPhone
          : plz && !normalizePlz(plz) && t.status.errorPlz;
    setFieldErrors((f) => ({ ...f, [field]: message || undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    if (!normalizeEmail(email)) errors.email = t.status.errorEmail;
    // Phone is optional ("" is fine) — only reject unparsable input (null).
    if (normalizePhone(phone) === null) errors.phone = t.status.errorPhone;
    if (!normalizePlz(plz)) errors.plz = t.status.errorPlz;
    const missingConsent = !consent;

    setFieldErrors(errors);
    setConsentInvalid(missingConsent);
    setFormError(missingConsent ? t.status.errorGeneric : null);

    if (errors.email || errors.phone || errors.plz || missingConsent) {
      (errors.email
        ? emailRef.current
        : errors.phone
          ? phoneRef.current
          : errors.plz
            ? plzRef.current
            : consentRef.current
      )?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, plz, consent, hp }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { field?: string };
      if (data.field === "email") {
        setFieldErrors({ email: t.status.errorEmail });
        emailRef.current?.focus();
      } else if (data.field === "phone") {
        setFieldErrors({ phone: t.status.errorPhone });
        phoneRef.current?.focus();
      } else if (data.field === "plz") {
        setFieldErrors({ plz: t.status.errorPlz });
        plzRef.current?.focus();
      } else if (data.field === "consent") {
        setConsentInvalid(true);
        setFormError(t.status.errorGeneric);
      } else {
        setFormError(t.status.errorGeneric);
      }
    } catch {
      setFormError(t.status.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="alert" className="py-6 text-center sm:py-10">
        <p className="text-2xl font-bold text-white">
          {t.status.successTitle}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          {t.status.successBody}
        </p>
      </div>
    );
  }

  return (
    <>
      <h2
        id="waitlist-title"
        className="text-xl font-bold text-white sm:text-2xl"
      >
        {t.form.title}
      </h2>

      <form
        aria-labelledby="waitlist-title"
        className="relative mt-5 space-y-4 text-left"
        noValidate
        onSubmit={handleSubmit}
      >
        {/* Honeypot — invisible to humans, tempting for bots.
            readOnly until focused: browser autofill and password managers
            skip readonly fields, so real users can never trip it (autofill
            used to fill this and silently drop genuine signups). */}
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden"
        >
          <input
            type="text"
            name="hp"
            tabIndex={-1}
            autoComplete="off"
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="wl-email"
            className="mb-1.5 block text-sm font-semibold text-white/80"
          >
            {t.form.email.label}
          </label>
          <input
            ref={emailRef}
            id="wl-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t.form.email.placeholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            onBlur={() => validateOnBlur("email")}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "wl-email-error" : undefined}
            className={cn(
              inputBase,
              fieldErrors.email ? "border-red-300/70" : "border-white/15",
            )}
          />
          {fieldErrors.email && (
            <p
              id="wl-email-error"
              role="alert"
              className="mt-1.5 text-sm font-semibold text-red-300"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="wl-phone"
            className="mb-1.5 block text-sm font-semibold text-white/80"
          >
            {t.form.phone.label}
          </label>
          <input
            ref={phoneRef}
            id="wl-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={26}
            placeholder={t.form.phone.placeholder}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFieldErrors((f) => ({ ...f, phone: undefined }));
            }}
            onBlur={() => validateOnBlur("phone")}
            aria-invalid={fieldErrors.phone ? true : undefined}
            aria-describedby={fieldErrors.phone ? "wl-phone-error" : undefined}
            className={cn(
              inputBase,
              fieldErrors.phone ? "border-red-300/70" : "border-white/15",
            )}
          />
          {fieldErrors.phone && (
            <p
              id="wl-phone-error"
              role="alert"
              className="mt-1.5 text-sm font-semibold text-red-300"
            >
              {fieldErrors.phone}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="wl-plz"
            className="mb-1.5 block text-sm font-semibold text-white/80"
          >
            {t.form.plz.label}
          </label>
          <input
            ref={plzRef}
            id="wl-plz"
            name="plz"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="postal-code"
            required
            placeholder={t.form.plz.placeholder}
            value={plz}
            onChange={(e) => {
              setPlz(e.target.value);
              setFieldErrors((f) => ({ ...f, plz: undefined }));
            }}
            onBlur={() => validateOnBlur("plz")}
            aria-invalid={fieldErrors.plz ? true : undefined}
            aria-describedby={
              fieldErrors.plz ? "wl-plz-error wl-plz-hint" : "wl-plz-hint"
            }
            className={cn(
              inputBase,
              fieldErrors.plz ? "border-red-300/70" : "border-white/15",
            )}
          />
          {fieldErrors.plz && (
            <p
              id="wl-plz-error"
              role="alert"
              className="mt-1.5 text-sm font-semibold text-red-300"
            >
              {fieldErrors.plz}
            </p>
          )}
          <p id="wl-plz-hint" className="mt-1.5 text-xs leading-relaxed text-white/50">
            {t.form.plz.hint}
          </p>
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            ref={consentRef}
            id="wl-consent"
            name="consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              setConsentInvalid(false);
            }}
            aria-invalid={consentInvalid ? true : undefined}
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
              consentInvalid && "ring-2 ring-red-300/70",
            )}
          />
          <label
            htmlFor="wl-consent"
            className="cursor-pointer text-sm leading-relaxed text-white/80"
          >
            {t.form.consent}{" "}
            {t.form.consentPrivacyPrefix}
            <Link
              href="/datenschutz"
              target="_blank"
              rel="noopener"
              className="rounded font-semibold text-brand-light underline transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {t.form.consentPrivacyLink}
            </Link>
            {t.form.consentPrivacySuffix}
          </label>
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? t.form.submitting : t.form.submit}
        </Button>

        {formError && (
          <p role="alert" className="text-sm font-semibold text-red-300">
            {formError}
          </p>
        )}

        <p className="text-xs leading-relaxed text-white/50">
          {t.form.microcopy}
        </p>
      </form>
    </>
  );
}
