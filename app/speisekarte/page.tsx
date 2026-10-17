import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { ReservationCta } from "@/components/site/ReservationCta";
import { GalleryHeading, GalleryPhoto } from "@/components/gallery/GalleryPhoto";
import { getMessages } from "@/lib/i18n";

const t = getMessages();
const p = t.menuPage;

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.body,
};

const ROLLS = Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(2, "0"));

/** Speisekarte — "Eigene Rollen / Schwarze Keramik" board (Figma 11:99). */
export default function SpeisekartePage() {
  return (
    <PageShell>
      <section className="page-container flex flex-col gap-6 pb-12 pt-8 lg:pb-16 lg:pt-12">
        <GalleryHeading title={p.title} body={p.body} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROLLS.map((n, i) => (
            <GalleryPhoto
              key={n}
              src={`/images/rolle-${n}.png`}
              alt={p.photoAlt.replace("{n}", n)}
              caption={p.caption.replace("{n}", n)}
              aspectClass="aspect-[4/3]"
              sizes="(min-width: 1024px) 432px, (min-width: 640px) 50vw, 100vw"
              priority={i < 2}
            />
          ))}
        </div>
      </section>
      <ReservationCta />
    </PageShell>
  );
}
