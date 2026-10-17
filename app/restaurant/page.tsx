import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { ReservationCta } from "@/components/site/ReservationCta";
import { GalleryHeading, GalleryPhoto } from "@/components/gallery/GalleryPhoto";
import { getMessages } from "@/lib/i18n";

const t = getMessages();
const p = t.restaurantPage;

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.body,
};

const photo = (n: string) => ({
  src: `/images/restaurant-${n}.jpg`,
  alt: p.photoAlt.replace("{n}", n),
  caption: p.caption.replace("{n}", n),
});

const WIDE = "aspect-[3/2]";
const COLUMN_SIZES = "(min-width: 1024px) 432px, (min-width: 768px) 50vw, 100vw";

/**
 * Unser Restaurant — original photos (Figma 12:99): one tall shot, then two
 * columns of two. Stacks on mobile; on md the last column spans both tracks.
 */
export default function RestaurantPage() {
  return (
    <PageShell>
      <section className="page-container flex flex-col gap-6 pb-12 pt-8 lg:gap-8 lg:pb-16 lg:pt-12">
        <GalleryHeading title={p.title} body={p.body} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <GalleryPhoto {...photo("01")} aspectClass="aspect-[2/3]" sizes={COLUMN_SIZES} priority />
          <div className="flex flex-col gap-6">
            <GalleryPhoto {...photo("02")} aspectClass={WIDE} sizes={COLUMN_SIZES} priority />
            <GalleryPhoto {...photo("03")} aspectClass={WIDE} sizes={COLUMN_SIZES} />
          </div>
          <div className="grid gap-6 md:col-span-2 md:grid-cols-2 lg:col-span-1 lg:flex lg:flex-col">
            <GalleryPhoto {...photo("04")} aspectClass={WIDE} sizes={COLUMN_SIZES} />
            <GalleryPhoto {...photo("05")} aspectClass={WIDE} sizes={COLUMN_SIZES} />
          </div>
        </div>
      </section>
      <ReservationCta />
    </PageShell>
  );
}
