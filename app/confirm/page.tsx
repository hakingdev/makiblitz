import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

export const metadata: Metadata = {
  title: `${t.confirmPage.metaTitle} – ${t.comingSoon.brand}`,
  robots: { index: false, follow: false },
};

type ConfirmState = "success" | "expired" | "invalid";

function resolveState(value: string | undefined): ConfirmState {
  return value === "success" || value === "expired" ? value : "invalid";
}

/** Landing page of the double-opt-in link (redirect target of /api/confirm). */
export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const state = resolveState(searchParams.state);
  const copy = t.confirmPage[state];

  return (
    <LegalPageShell title={copy.title}>
      <p>{copy.body}</p>
      {state !== "success" && (
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-pill bg-brand-gradient px-6 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          {t.confirmPage.cta}
        </Link>
      )}
    </LegalPageShell>
  );
}
