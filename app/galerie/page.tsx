import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "@/components/site/PageShell";
import { PageIntro } from "@/components/site/PageIntro";
import { ButtonLink } from "@/components/ui/Button";
import { getMessages } from "@/lib/i18n";

const p = getMessages().galleryPage;

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.body,
};

const ROLLS = Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(2, "0"));

/** Galerie (Figma 15:1103 mobile · 15:594 desktop) — the nine roll photos, 1 → 2 → 3 columns. */
export default function GaleriePage() {
  return (
    <PageShell>
      <PageIntro eyebrow={p.eyebrow} title={p.title}>
        <p className="max-w-[760px] text-base leading-[26px] text-muted">{p.body}</p>
      </PageIntro>

      <div className="page-container grid gap-6 pb-12 sm:grid-cols-2 lg:grid-cols-3 lg:pb-16">
        {ROLLS.map((n, i) => (
          <div key={n} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-line">
            <Image
              src={`/images/rolle-${n}.png`}
              alt={p.photoAlt.replace("{n}", n)}
              fill
              priority={i < 2}
              sizes="(min-width: 1024px) 410px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <section className="bg-blush">
        <div className="page-container py-8">
          <ButtonLink href="/speisekarte" variant="secondary" className="w-full md:w-[280px]">
            {p.cta}
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
