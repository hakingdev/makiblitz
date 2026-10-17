import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const t = getMessages();

/** MakiLove / Wordmark — Rock Salt, "Maki" ink + "Love" red. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${t.brand.name} – ${t.nav.home}`}
      className={cn(
        "focus-ring inline-flex rounded font-script text-xl leading-[48px] lg:text-[25px]",
        className,
      )}
    >
      <span className="text-ink">{t.brand.first}</span>
      <span className="text-brand">{t.brand.second}</span>
    </Link>
  );
}
