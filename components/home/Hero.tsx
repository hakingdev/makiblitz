import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-600/40 via-ink-700 to-ink-800 px-6 py-7 md:flex md:items-center md:justify-between md:px-10 md:py-12">
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative max-w-md text-center md:text-left">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-light">
          Today&apos;s offer
        </p>
        <h1 className="font-display text-2xl leading-tight text-white md:text-4xl">
          20% OFF on All Salmon Rolls
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Fresh sushi made by master chefs. Quick delivery or easy pickup.
        </p>
        <div className="mt-6 flex justify-center gap-3 md:justify-start">
          <Link href="/menu">
            <Button size="md">Order now</Button>
          </Link>
          <Link href="/menu/maki-rolls">
            <Button size="md" variant="outline">
              View rolls
            </Button>
          </Link>
        </div>
      </div>
      <div className="relative mt-6 hidden text-[120px] md:block">🍣</div>
    </section>
  );
}
