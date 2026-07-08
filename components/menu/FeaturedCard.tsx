import Link from "next/link";
import { ProductImage } from "@/components/ui/ProductImage";
import { PriceBadge } from "@/components/ui/Chip";
import { Rating } from "@/components/ui/Rating";
import { AddButton } from "./AddButton";
import { formatPrice, cn } from "@/lib/utils";
import type { Product } from "@/lib/data/menu";

/** Hero "featured dish" card — large image, floating price + rating. */
export function FeaturedCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center rounded-card bg-white/5 px-6 pb-6 pt-16 text-center",
        className,
      )}
    >
      {/* Floating price badge */}
      <PriceBadge
        price={formatPrice(product.price).replace(/\s?€/, "")}
        className="absolute -top-6 left-6 h-20 w-20 md:h-24 md:w-24"
      />
      {/* Floating rating */}
      <div className="absolute -top-3 right-6 rounded-full bg-ink-800 px-3 py-1.5">
        <Rating value={product.rating} />
      </div>

      <Link href={`/product/${product.slug}`} className="contents">
        <ProductImage
          emoji={product.emoji}
          size="lg"
          className="h-40 w-40 md:h-48 md:w-48"
        />
        <h3 className="mt-5 font-bold text-white">{product.name}</h3>
        <p className="mt-1 text-xs text-white/60">{product.description}</p>
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <Link href={`/product/${product.slug}`}>
          <span className="rounded-pill border border-white/15 px-5 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/5">
            Details
          </span>
        </Link>
        <AddButton product={product} label="Add" />
      </div>
    </div>
  );
}
