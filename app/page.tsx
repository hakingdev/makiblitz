import { PageShell } from "@/components/site/PageShell";
import { ReservationCta } from "@/components/site/ReservationCta";
import { Hero } from "@/components/home/Hero";
import { BrandPromise } from "@/components/home/BrandPromise";
import { GalleryTeaser } from "@/components/home/GalleryTeaser";
import { RestaurantTeaser } from "@/components/home/RestaurantTeaser";

/** Startseite (Figma 2:61 mobile · 2:60 desktop). */
export default function HomePage() {
  return (
    <PageShell footer="home">
      <Hero />
      <BrandPromise />
      <GalleryTeaser />
      <RestaurantTeaser />
      <ReservationCta />
    </PageShell>
  );
}
