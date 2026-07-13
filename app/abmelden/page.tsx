import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

export const metadata: Metadata = {
  title: `${t.unsubscribePage.metaTitle} – ${t.comingSoon.brand}`,
  robots: { index: false, follow: false },
};

/** Landing page of the opt-out link (redirect target of /api/unsubscribe). */
export default function AbmeldenPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const state = searchParams.state === "success" ? "success" : "invalid";
  const copy = t.unsubscribePage[state];

  return (
    <LegalPageShell title={copy.title}>
      <p>{copy.body.replace("{email}", t.footer.contactEmail)}</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center justify-center rounded-pill bg-brand-gradient px-6 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        {t.unsubscribePage.cta}
      </Link>
    </LegalPageShell>
  );
}
