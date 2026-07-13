"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { PriceBadge, Chip } from "@/components/ui/Chip";
import { Rating } from "@/components/ui/Rating";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/CartContext";
import { formatPrice } from "@/lib/utils";
import { SPICE_LEVELS, type Product, type SpiceLevel } from "@/lib/data/menu";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [spice, setSpice] = useState<SpiceLevel>("Medium");
  const [quantity, setQuantity] = useState(1);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  const addonsTotal = useMemo(
    () =>
      product.addOns.reduce(
        (sum, a) => sum + a.price * (addonQty[a.id] ?? 0),
        0,
      ),
    [addonQty, product.addOns],
  );

  const unitPrice = product.price + addonsTotal;
  const total = unitPrice * quantity;

  function handleAdd() {
    const selectedAddOns = product.addOns.flatMap((a) =>
      Array.from({ length: addonQty[a.id] ?? 0 }, () => a),
    );
    addItem(product, {
      quantity,
      spice: product.hasSpice ? spice : undefined,
      addOns: selectedAddOns,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="pb-28 md:pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-white shadow-brand transition hover:brightness-110"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Rating value={product.rating} className="rounded-full bg-brand-gradient px-3 py-2 shadow-brand" />
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-12">
        {/* Visual */}
        <div className="relative mx-auto mt-10 w-full max-w-sm md:mt-4">
          <PriceBadge
            price={formatPrice(product.price).replace(/\s?€/, "")}
            className="absolute -top-6 left-2 z-10 h-24 w-24"
          />
          <ProductImage
            emoji={product.emoji}
            size="xl"
            className="aspect-square w-full"
          />
        </div>

        {/* Details */}
        <div className="mt-8 md:mt-4">
          <h1 className="font-display text-2xl leading-snug text-white md:text-3xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm text-white/70">{product.longDescription}</p>

          <p className="mt-4 text-xs text-white/45">
            {product.ingredients.join(" · ")}
          </p>

          {/* Spice */}
          {product.hasSpice && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-white">Spice level</h3>
              <div className="flex gap-3">
                {SPICE_LEVELS.map((level) => (
                  <Chip
                    key={level}
                    label={level}
                    active={spice === level}
                    onClick={() => setSpice(level)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {product.addOns.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-white">Add-ons</h3>
              <div className="space-y-3">
                {product.addOns.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-card bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-lg shadow-brand">
                        {a.emoji}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {a.name}
                        </p>
                        <p className="text-xs text-white/50">
                          +{formatPrice(a.price)}
                        </p>
                      </div>
                    </div>
                    <QtyStepper
                      value={addonQty[a.id] ?? 0}
                      onChange={(n) =>
                        setAddonQty((prev) => ({ ...prev, [a.id]: n }))
                      }
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6 flex items-center justify-between rounded-card bg-white/5 p-4">
            <span className="text-sm font-bold text-white">Quantity</span>
            <QtyStepper
              value={quantity}
              onChange={(n) => setQuantity(Math.max(1, n))}
              min={1}
            />
          </div>

          {/* Desktop add action */}
          <div className="mt-8 hidden items-center justify-between md:flex">
            <div>
              <p className="text-xs text-white/55">Total</p>
              <p className="text-2xl font-extrabold text-white">
                {formatPrice(total)}
              </p>
            </div>
            <Button size="lg" onClick={handleAdd} className="min-w-[200px]">
              {added ? <Check className="h-5 w-5" /> : null}
              {added ? "Added to cart" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar — kit's red payment panel with inverse white CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[20px] bg-brand-gradient-v px-5 py-4 shadow-brand md:hidden">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/80">Grand total</p>
            <p className="text-xl font-extrabold text-white">
              {formatPrice(total)}
            </p>
          </div>
          <Button size="lg" variant="light" onClick={handleAdd} className="flex-1">
            {added ? <Check className="h-5 w-5 text-brand-600" /> : null}
            <span className="bg-brand-gradient-v bg-clip-text text-transparent">
              {added ? "Added" : "Add to Cart"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
