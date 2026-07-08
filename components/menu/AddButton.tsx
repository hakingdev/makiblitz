"use client";

import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart/CartContext";
import type { Product } from "@/lib/data/menu";
import { cn } from "@/lib/utils";

/** Quick "+1" add for cards. Detail page handles options. */
export function AddButton({
  product,
  className,
  label,
}: {
  product: Product;
  className?: string;
  label?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  if (label) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-pill bg-brand-gradient px-4 py-1.5 text-xs font-bold text-white shadow-brand transition active:scale-95",
          className,
        )}
      >
        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {added ? "Added" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Add ${product.name} to cart`}
      onClick={handleAdd}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white shadow-brand transition hover:brightness-110 active:scale-90",
        className,
      )}
    >
      {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
