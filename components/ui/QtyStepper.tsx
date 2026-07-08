"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({
  value,
  onChange,
  min = 0,
  size = "md",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const btn =
    size === "sm" ? "h-5 w-5" : "h-7 w-7 md:h-8 md:w-8";
  const icon = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "grid place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90",
          btn,
        )}
      >
        <Minus className={icon} />
      </button>
      <span className="min-w-[1ch] text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + 1)}
        className={cn(
          "grid place-items-center rounded-full bg-brand-gradient text-white shadow-brand transition hover:brightness-110 active:scale-90",
          btn,
        )}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}
