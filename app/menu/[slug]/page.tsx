import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { CategoryChips } from "@/components/menu/CategoryChips";
import { ProductCard } from "@/components/menu/ProductCard";
import {
  categories,
  getCategoryBySlug,
  getProductsByCategory,
} from "@/lib/data/menu";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const category = getCategoryBySlug(params.slug);
  return { title: category ? `${category.name} — MakiLove` : "MakiLove" };
}

export default function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = getCategoryBySlug(params.slug);
  if (!category) notFound();

  const items = getProductsByCategory(category.slug);

  return (
    <Shell className="space-y-8 pt-4">
      <div>
        <h1 className="mb-1 font-display text-2xl text-white md:text-3xl">
          {category.emoji} {category.name}
        </h1>
        <p className="text-sm text-white/60">
          {items.length} {items.length === 1 ? "dish" : "dishes"}
        </p>
      </div>

      <CategoryChips activeSlug={category.slug} />

      {items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-white/50">
          Nothing here yet — check back soon.
        </p>
      )}
    </Shell>
  );
}
