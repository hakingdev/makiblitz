import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { ProductDetail } from "@/components/menu/ProductDetail";
import { ProductListCard } from "@/components/menu/ProductListCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  getProductBySlug,
  getProductsByCategory,
  products,
} from "@/lib/data/menu";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const product = getProductBySlug(params.slug);
  return {
    title: product ? `${product.name} — MakiLove` : "MakiLove",
    description: product?.description,
  };
}

export default function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const related = getProductsByCategory(product.categorySlug)
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <Shell className="pt-1" hideBottomNav>
      <ProductDetail product={product} />

      {related.length > 0 && (
        <section className="mt-4">
          <SectionHeader title="You may also like" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {related.map((p) => (
              <ProductListCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
