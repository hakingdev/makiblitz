import type { Metadata } from "next";
import Link from "next/link";
import { ConversionShell } from "@/components/coming-soon/ConversionShell";
import { LeadEvent } from "@/components/analytics/LeadEvent";
import { getMessages } from "@/lib/i18n";

const t = getMessages();
const d = t.danke;

export const metadata: Metadata = {
  title: `${d.metaTitle} – ${t.comingSoon.brand}`,
  robots: { index: false, follow: false },
};

/**
 * Post-submit "thank you" page and the Meta "Lead" conversion point. Reached
 * via router.push after a successful /api/subscribe; the actual event only
 * fires for a real submission (guarded by a one-shot sessionStorage flag).
 */
export default function DankePage() {
  return (
    <ConversionShell>
      <LeadEvent />

      <h1 className="font-display text-2xl leading-snug text-white sm:text-3xl md:text-4xl">
        {d.h1}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
        {d.subline}
      </p>

      <div className="mt-10 text-left">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-light">
          {d.stepsHeading}
        </h2>
        <ol className="mt-5 space-y-4">
          {d.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-card border border-white/10 bg-white/5 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-white">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-white/60">
        {d.hinweis}
      </p>

      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-pill bg-brand-gradient px-6 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          {d.backLink}
        </Link>
      </div>
    </ConversionShell>
  );
}
