import Link from "next/link";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { ComingSoonFooter } from "@/components/coming-soon/ComingSoonFooter";

const t = getMessages();

/** Trust badges — same treatment as the coming-soon landing. */
function TrustBadges() {
  return (
    <ul className="mt-10 flex flex-wrap justify-center gap-2.5">
      {t.conversion.trust.map((item) => (
        <li
          key={item}
          className="rounded-chip border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Single-screen shell for the conversion pages (/danke, /confirm): same dark
 * gradient, ambient glows, wordmark and footer as the coming-soon stub, with a
 * centered content slot followed by the trust badges.
 */
export function ConversionShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-gradient">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-28 right-[-12%] h-72 w-72 rounded-full bg-brand/25 blur-3xl sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-14%] h-72 w-72 rounded-full bg-brand-700/40 blur-3xl sm:h-96 sm:w-96" />

      <header className="relative mx-auto w-full max-w-shell px-5 pt-6 sm:px-8">
        <p className="font-display text-lg text-white">
          <Link
            href="/"
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {t.comingSoon.brand.slice(0, 4)}
            <span className="text-brand">{t.comingSoon.brand.slice(4)}</span>
          </Link>
        </p>
      </header>

      <main className="relative mx-auto flex w-full max-w-shell flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-16">
        <div className="animate-fade-up w-full max-w-2xl text-center">
          {children}
          <TrustBadges />
        </div>
      </main>

      <ComingSoonFooter />
    </div>
  );
}
