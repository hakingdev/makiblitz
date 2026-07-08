import { Shell } from "@/components/layout/Shell";
import { Hero } from "@/components/home/Hero";
import { CategoryChips } from "@/components/menu/CategoryChips";
import { FeaturedCard } from "@/components/menu/FeaturedCard";
import { ProductListCard } from "@/components/menu/ProductListCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getFeatured, getPopular } from "@/lib/data/menu";

export default function HomePage() {
  const featured = getFeatured();
  const popular = getPopular();

  return (
    <Shell className="space-y-10 pt-4">
      <Hero />

      <section>
        <SectionHeader title="Categories" href="/menu" />
        <CategoryChips />
      </section>

      <section>
        <SectionHeader title="Chef's picks" href="/menu" />
        {/* Mobile: horizontal scroll · Desktop: grid */}
        <div className="no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5 pt-8 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
          {featured.map((p) => (
            <FeaturedCard
              key={p.id}
              product={p}
              className="w-64 shrink-0 md:w-auto"
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Popular today" href="/menu" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {popular.map((p) => (
            <ProductListCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </Shell>
  );
}
