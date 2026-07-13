import type { Metadata } from "next";
import Link from "next/link";
import { ConversionShell } from "@/components/coming-soon/ConversionShell";
import { RegistrationEvent } from "@/components/analytics/RegistrationEvent";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

export const metadata: Metadata = {
  title: `${t.confirmPage.metaTitle} – ${t.comingSoon.brand}`,
  robots: { index: false, follow: false },
};

type ConfirmState = "success" | "already" | "expired" | "invalid";

function resolveState(value: string | undefined): ConfirmState {
  return value === "success" || value === "already" || value === "expired"
    ? value
    : "invalid";
}

/**
 * Landing page of the double-opt-in link (redirect target of /api/confirm).
 * On a successful confirmation it is the Meta "CompleteRegistration" conversion
 * point; invalid/expired fire nothing.
 */
export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const state = resolveState(searchParams.state);
  const copy = t.confirmPage[state];

  return (
    <ConversionShell>
      <RegistrationEvent active={state === "success"} />

      <h1 className="font-display text-2xl leading-snug text-white sm:text-3xl md:text-4xl">
        {copy.title}
      </h1>
      {copy.body && (
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          {copy.body}
        </p>
      )}

      {state !== "success" && (
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-brand-gradient px-6 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {t.confirmPage.cta}
          </Link>
        </div>
      )}
    </ConversionShell>
  );
}
