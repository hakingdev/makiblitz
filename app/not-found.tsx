import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-gradient px-6 text-center">
      <div>
        <span className="text-6xl">🍱</span>
        <h1 className="mt-4 font-display text-3xl text-white">Page not found</h1>
        <p className="mt-2 text-sm text-white/60">
          This dish isn&apos;t on the menu.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back home</Button>
        </Link>
      </div>
    </div>
  );
}
