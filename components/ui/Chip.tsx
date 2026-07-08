"use client";

import { cn } from "@/lib/utils";

/** Selectable pill — used for spice levels, filters, etc. */
export function Chip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill px-5 py-1.5 text-xs font-semibold transition-all duration-200",
        active
          ? "bg-brand-gradient text-white shadow-brand"
          : "bg-white/5 text-white/70 hover:bg-white/10",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function PriceBadge({
  price,
  unit = "/package",
  className,
}: {
  price: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid aspect-square place-items-center rounded-full bg-brand-gradient text-center text-white shadow-brand",
        className,
      )}
    >
      <div className="leading-none">
        <div className="text-2xl font-extrabold">{price}</div>
        <div className="mt-1 text-[10px] font-medium opacity-90">{unit}</div>
      </div>
    </div>
  );
}
