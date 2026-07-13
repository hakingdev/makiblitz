import Link from "next/link";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

/**
 * Minimal legal footer for all secondary pages (legal + confirm/opt-out).
 * § 5 DDG: the Impressum must be reachable from every page.
 * The coming-soon landing page ships its own richer footer.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-white/60 sm:flex-row sm:px-8">
        <nav aria-label="Rechtliches" className="flex items-center gap-5 font-semibold">
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
      </div>
    </footer>
  );
}
