import Link from "next/link";
import { ProductImage } from "@/components/ui/ProductImage";
import { Rating } from "@/components/ui/Rating";
import { AddButton } from "./AddButton";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/data/menu";

/** Vertical grid card — used on menu/category pages. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group relative flex flex-col rounded-card bg-white/5 p-4 transition hover:bg-white/[0.07]">
      <Link href={`/product/${product.slug}`} className="contents">
        <div className="relative mx-auto">
          <ProductImage
            emoji={product.emoji}
            size="lg"
            className="h-32 w-32"
          />
          <span className="absolute right-0 top-0 rounded-full bg-ink-800/90 px-2 py-1">
            <Rating value={product.rating} />
          </span>
        </div>
        <h3 className="mt-4 font-bold text-white">{product.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-xs text-white/55">
          {product.description}
        </p>
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-extrabold text-white">
          {formatPrice(product.price)}
        </span>
        <AddButton product={product} label="Add" />
      </div>
    </div>
  );
}
