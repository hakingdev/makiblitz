import Link from "next/link";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { SiteFooter } from "@/components/legal/SiteFooter";

const t = getMessages();

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-gradient">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8">
        <p className="font-display text-lg text-white">
          <Link
            href="/"
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {t.comingSoon.brand.slice(0, 4)}
            <span className="text-brand">{t.comingSoon.brand.slice(4)}</span>
          </Link>
        </p>

        <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-white/75 sm:text-base">
          {children}
        </div>

        <Link
          href="/"
          className="mt-12 inline-block rounded text-sm font-semibold text-brand-light transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          ← {t.legal.backToHome}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
