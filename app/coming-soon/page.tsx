import type { Metadata } from "next";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { WaitlistForm } from "@/components/coming-soon/WaitlistForm";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
    url: "/",
    siteName: t.comingSoon.brand,
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
  },
};

/* TikTok glyph from simple-icons (CC0) — lucide ships no TikTok icon. */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export default function ComingSoonPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-gradient">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-28 right-[-12%] h-72 w-72 rounded-full bg-brand/25 blur-3xl sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-14%] h-72 w-72 rounded-full bg-brand-700/40 blur-3xl sm:h-96 sm:w-96" />

      <header className="relative mx-auto w-full max-w-shell px-5 pt-6 sm:px-8">
        {/* Two-tone wordmark, same treatment as the shop header */}
        <p className="font-display text-lg text-white">
          {t.comingSoon.brand.slice(0, 4)}
          <span className="text-brand">{t.comingSoon.brand.slice(4)}</span>
        </p>
      </header>

      <main className="relative mx-auto flex w-full max-w-shell flex-1 items-center px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <section className="animate-fade-up text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-light sm:text-sm">
              {t.comingSoon.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-2xl leading-snug text-white sm:text-3xl md:text-4xl xl:text-5xl">
              {t.comingSoon.h1}
            </h1>
            {/* Short subline < 640px, full subline from sm upwards */}
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:hidden lg:mx-0">
              {t.comingSoon.sublineShort}
            </p>
            <p className="mx-auto mt-4 hidden max-w-xl text-lg leading-relaxed text-white/70 sm:block lg:mx-0">
              {t.comingSoon.subline}
            </p>

            <ul className="mt-7 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              {t.comingSoon.trust.map((item) => (
                <li
                  key={item}
                  className="rounded-chip border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="animate-fade-up rounded-card border border-white/10 bg-ink-800/80 p-6 text-center shadow-card backdrop-blur [animation-delay:150ms] sm:p-8">
            <WaitlistForm />
          </section>
        </div>
      </main>

      <footer className="relative border-t border-white/10">
        <div className="mx-auto flex w-full max-w-shell flex-col items-center justify-between gap-4 px-5 py-6 text-sm text-white/60 sm:flex-row sm:px-8">
          <nav
            aria-label="Rechtliches"
            className="flex items-center gap-5 font-semibold"
          >
            <Link
              href="/impressum"
              className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {t.footer.impressum}
            </Link>
            <Link
              href="/datenschutz"
              className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {t.footer.datenschutz}
            </Link>
          </nav>

          <a
            href={`mailto:${t.footer.contactEmail}`}
            className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {t.footer.contactEmail}
          </a>

          <div className="flex items-center gap-4">
            <a
              href="#"
              aria-label={t.footer.instagramLabel}
              className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <Instagram aria-hidden="true" className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label={t.footer.tiktokLabel}
              className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <TikTokIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
