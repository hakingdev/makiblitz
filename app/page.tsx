import { PageShell } from "@/components/site/PageShell";
import { ReservationCta } from "@/components/site/ReservationCta";
import { Hero } from "@/components/home/Hero";
import { BrandPromise } from "@/components/home/BrandPromise";
import { MenuTeaser } from "@/components/home/MenuTeaser";
import { RestaurantTeaser } from "@/components/home/RestaurantTeaser";

/** Startseite (Figma 2:61 mobile · 2:60 desktop). */
export default function HomePage() {
  return (
    <PageShell>
      <Hero />
      <BrandPromise />
      <MenuTeaser />
      <RestaurantTeaser />
      <ReservationCta />
    </PageShell>
  );
}
