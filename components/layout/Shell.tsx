import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

/** Page frame: dark gradient background, header, content container, mobile bottom nav. */
export function Shell({
  children,
  className,
  hideBottomNav = false,
}: {
  children: React.ReactNode;
  className?: string;
  hideBottomNav?: boolean;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-ink-gradient">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute -left-40 top-40 h-[480px] w-[480px] rounded-full bg-brand/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-[60vh] h-[420px] w-[420px] rounded-full bg-brand/10 blur-[120px]" />

      <div className="relative z-10">
        <Header />
        <main
          className={cn(
            "mx-auto max-w-shell px-5 pb-28 pt-2 md:px-8 md:pb-16",
            className,
          )}
        >
          {children}
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
