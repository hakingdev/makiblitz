import type { Metadata } from "next";
import { WaitlistForm } from "@/components/coming-soon/WaitlistForm";
import { ComingSoonFooter } from "@/components/coming-soon/ComingSoonFooter";
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

      <ComingSoonFooter />
    </div>
  );
}
