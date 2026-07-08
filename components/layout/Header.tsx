"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { CartButton } from "./CartButton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/menu/sushi-sets", label: "Sets" },
  { href: "/menu/drinks", label: "Drinks" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-ink-900/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-5 md:h-20 md:px-8">
        {/* Left: location (mobile) / logo (desktop) */}
        <div className="flex items-center gap-3">
          <IconButton aria-label="Location" className="md:hidden">
            <MapPin className="h-4 w-4" />
          </IconButton>
          <Link
            href="/"
            className="font-display text-lg text-white md:text-2xl"
          >
            Maki<span className="text-brand">blitz</span>
          </Link>
        </div>

        {/* Center: desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-semibold transition-colors",
                  active ? "text-white" : "text-white/55 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: search + cart */}
        <div className="flex items-center gap-3">
          <IconButton aria-label="Search" className="hidden md:inline-flex">
            <Search className="h-[18px] w-[18px]" />
          </IconButton>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
