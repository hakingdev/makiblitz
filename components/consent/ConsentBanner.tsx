"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { getMessages } from "@/lib/i18n";
import { useConsent } from "@/lib/consent";

const t = getMessages();

/**
 * Consent banner (§ 25 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).
 *
 * Sits at the bottom and does NOT block the page (no cookie wall). Both choices
 * carry equal visual weight — a supervisory-authority requirement: rejecting
 * must be as easy as accepting. Keyboard-operable, role="dialog", labelled.
 */
export function ConsentBanner() {
  const { hydrated, bannerOpen, accept } = useConsent();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerOpen) dialogRef.current?.focus();
  }, [bannerOpen]);

  // Render nothing until we know the stored choice (avoids a hydration flash),
  // and nothing once the banner is closed.
  if (!hydrated || !bannerOpen) return null;

  const c = t.consent;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-label={c.ariaLabel}
        tabIndex={-1}
        className="mx-auto flex max-w-page flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_18px_40px_-20px_rgba(33,29,27,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
      >
        <p className="flex-1 text-sm leading-relaxed text-muted">
          {c.textPrefix}
          <Link
            href="/datenschutz"
            className="focus-ring rounded font-semibold text-brand underline underline-offset-2 hover:text-brand-dark"
          >
            {c.privacyLink}
          </Link>
          {c.textSuffix}
        </p>

        {/* Two equally prominent buttons (regulator requirement). */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => accept("necessary")}
            className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-bold text-white transition-colors hover:bg-ink/85"
          >
            {c.necessaryOnly}
          </button>
          <button
            type="button"
            onClick={() => accept("all")}
            className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            {c.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
