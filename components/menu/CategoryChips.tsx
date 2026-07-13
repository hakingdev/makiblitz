import Link from "next/link";
import { categories } from "@/lib/data/menu";
import { cn } from "@/lib/utils";

export function CategoryChips({ activeSlug }: { activeSlug?: string }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.id}
            href={`/menu/${c.slug}`}
            className="flex shrink-0 flex-col items-center gap-2"
          >
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-xl shadow-brand transition-all hover:brightness-110 md:h-14 md:w-14",
                active && "ring-2 ring-brand ring-offset-2 ring-offset-ink-900",
              )}
            >
              {c.emoji}
            </span>
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                active ? "text-white" : "text-white/60",
              )}
            >
              {c.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
