import Link from "next/link";
import { ProductImage } from "@/components/ui/ProductImage";
import { Rating } from "@/components/ui/Rating";
import { AddButton } from "./AddButton";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/data/menu";

/** Horizontal list row — image, text block, price + add. */
export function ProductListCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-card bg-gradient-to-r from-brand/25 to-transparent p-3 transition hover:from-brand/35"
    >
      <ProductImage
        emoji={product.emoji}
        size="md"
        className="h-20 w-20 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-bold text-white">{product.name}</h3>
          <span className="rounded-pill bg-brand-gradient px-3 py-1 text-xs font-bold text-white shadow-brand">
            {formatPrice(product.price)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-white/60">
          {product.description}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <Rating value={product.rating} />
          <AddButton product={product} className="h-8 w-8" />
        </div>
      </div>
    </Link>
  );
}
