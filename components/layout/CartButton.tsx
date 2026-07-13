"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

export function CartButton({ className }: { className?: string }) {
  const { itemCount } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${itemCount} items`}
      className={cn(
        "relative inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand transition hover:brightness-110 md:h-10 md:w-10",
        className,
      )}
    >
      <ShoppingBag className="h-4 w-4 md:h-[18px] md:w-[18px]" />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-600">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
