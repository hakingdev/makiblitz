import { Shell } from "@/components/layout/Shell";
import { CategoryChips } from "@/components/menu/CategoryChips";
import { ProductCard } from "@/components/menu/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { categories, getProductsByCategory } from "@/lib/data/menu";

export const metadata = { title: "Menu — Makiblitz" };

export default function MenuPage() {
  return (
    <Shell className="space-y-8 pt-4">
      <div>
        <h1 className="mb-1 font-display text-2xl text-white md:text-3xl">
          Our Menu
        </h1>
        <p className="text-sm text-white/60">
          Hand-rolled fresh, delivered fast.
        </p>
      </div>

      <CategoryChips />

      {categories.map((c) => {
        const items = getProductsByCategory(c.slug);
        if (!items.length) return null;
        return (
          <section key={c.id}>
            <SectionHeader title={`${c.emoji} ${c.name}`} href={`/menu/${c.slug}`} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        );
      })}
    </Shell>
  );
}
