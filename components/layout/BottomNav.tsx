"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/cart", label: "Cart", icon: ShoppingBag, badge: true },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="mx-4 mb-4 flex items-center justify-around rounded-card border border-white/10 bg-ink-800/90 px-2 py-2 backdrop-blur-lg">
        {TABS.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors",
                active ? "text-white" : "text-white/45",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full transition-all",
                  active && "bg-brand-gradient shadow-brand",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {badge && itemCount > 0 && (
                  <span className="absolute right-2 top-0 grid h-4 min-w-[1rem] place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
