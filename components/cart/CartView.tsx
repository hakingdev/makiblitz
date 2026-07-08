"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2, Bike, Store, ShoppingBag } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/CartContext";
import { formatPrice, cn } from "@/lib/utils";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/data/menu";

export function CartView() {
  const {
    items,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    deliveryType,
    setDeliveryType,
    setQuantity,
    removeItem,
    freeDeliveryRemaining,
  } = useCart();
  const [placed, setPlaced] = useState(false);

  if (placed) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="mt-4 font-display text-2xl text-white">Order placed!</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          This is a demo checkout. The real payment & order flow (Stripe,
          Telegram, kitchen print) is wired in the next phase.
        </p>
        <Link href="/menu" className="mt-6">
          <Button>Back to menu</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-white/5 text-4xl">
          <ShoppingBag className="h-8 w-8 text-white/40" />
        </span>
        <h1 className="mt-5 font-display text-2xl text-white">
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Add some fresh sushi to get started.
        </p>
        <Link href="/menu" className="mt-6">
          <Button>Browse menu</Button>
        </Link>
      </div>
    );
  }

  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  return (
    <div className="md:grid md:grid-cols-[1fr_360px] md:gap-10">
      {/* Items */}
      <div>
        <h1 className="mb-1 font-display text-2xl text-white md:text-3xl">
          Your cart
        </h1>
        <p className="mb-6 text-sm text-white/60">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>

        <div className="space-y-4">
          {items.map((item) => {
            const addOnTotal = item.addOns.reduce((s, a) => s + a.price, 0);
            const lineTotal =
              (item.product.price + addOnTotal) * item.quantity;
            const addonSummary = summariseAddOns(item.addOns);
            return (
              <div
                key={item.lineId}
                className="flex gap-4 rounded-card bg-white/5 p-3"
              >
                <ProductImage
                  emoji={item.product.emoji}
                  size="sm"
                  className="h-20 w-20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white">
                      {item.product.name}
                    </h3>
                    <button
                      aria-label="Remove"
                      onClick={() => removeItem(item.lineId)}
                      className="text-white/40 transition hover:text-brand-light"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.spice && (
                    <p className="text-xs text-white/50">Spice: {item.spice}</p>
                  )}
                  {addonSummary && (
                    <p className="text-xs text-white/50">{addonSummary}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <QtyStepper
                      value={item.quantity}
                      onChange={(n) => setQuantity(item.lineId, n)}
                      min={1}
                    />
                    <span className="font-extrabold text-white">
                      {formatPrice(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 md:mt-0">
        <div className="rounded-card bg-white/5 p-5 md:sticky md:top-24">
          {/* Delivery toggle */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-pill bg-ink-900/60 p-1">
            <DeliveryTab
              active={deliveryType === "delivery"}
              onClick={() => setDeliveryType("delivery")}
              icon={<Bike className="h-4 w-4" />}
              label="Delivery"
            />
            <DeliveryTab
              active={deliveryType === "pickup"}
              onClick={() => setDeliveryType("pickup")}
              icon={<Store className="h-4 w-4" />}
              label="Pickup"
            />
          </div>

          {/* Free delivery progress */}
          {deliveryType === "delivery" && (
            <div className="mb-5">
              <p className="mb-2 text-xs text-white/60">
                {freeDeliveryRemaining > 0 ? (
                  <>
                    Add{" "}
                    <span className="font-bold text-white">
                      {formatPrice(freeDeliveryRemaining)}
                    </span>{" "}
                    for free delivery
                  </>
                ) : (
                  <span className="font-bold text-brand-light">
                    🎉 You&apos;ve unlocked free delivery!
                  </span>
                )}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row
              label="Delivery"
              value={deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
            />
            <div className="my-3 border-t border-white/10" />
            <Row label="Total" value={formatPrice(total)} emphasize />
          </dl>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => setPlaced(true)}
          >
            Checkout · {formatPrice(total)}
          </Button>
          <p className="mt-3 text-center text-[11px] text-white/40">
            Demo checkout — payment integration coming next.
          </p>
        </div>
      </div>
    </div>
  );
}

function DeliveryTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-pill py-2 text-sm font-semibold transition",
        active ? "bg-brand-gradient text-white shadow-brand" : "text-white/55",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={emphasize ? "font-bold text-white" : "text-white/60"}>
        {label}
      </dt>
      <dd
        className={
          emphasize ? "text-lg font-extrabold text-white" : "text-white"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function summariseAddOns(addOns: { id: string; name: string }[]): string {
  if (!addOns.length) return "";
  const counts = new Map<string, number>();
  for (const a of addOns) counts.set(a.name, (counts.get(a.name) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
    .join(", ");
}
