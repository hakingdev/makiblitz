import Link from "next/link";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { PageShell } from "@/components/site/PageShell";

const t = getMessages();

/** Text pages (Impressum, Datenschutz, opt-out/confirm results) in the site frame. */
export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <PageShell>
      <div className="page-container pb-16 pt-8 lg:pt-12">
        <div className="max-w-3xl">
          <h1 className="text-[32px] font-extrabold leading-[40px] md:text-[40px] md:leading-[52px]">
            {title}
          </h1>
          <div className="mt-8 space-y-8 text-[15px] leading-[26px] text-muted md:text-base [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
            {children}
          </div>
          <Link
            href="/"
            className="focus-ring mt-12 inline-block rounded text-sm font-bold text-brand hover:underline"
          >
            ← {t.legal.backToHome}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
