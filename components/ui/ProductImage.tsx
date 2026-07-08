import { cn } from "@/lib/utils";

/**
 * Placeholder visual for a dish — a soft red glow with the dish emoji.
 * Real photography replaces this when the catalogue is wired to the backend.
 */
export function ProductImage({
  emoji,
  className,
  size = "md",
  rounded = "full",
}: {
  emoji: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: "full" | "card";
}) {
  const emojiSize = {
    sm: "text-3xl",
    md: "text-5xl",
    lg: "text-7xl",
    xl: "text-8xl",
  }[size];

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden",
        rounded === "full" ? "rounded-full" : "rounded-card",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-ink-700 to-ink-900" />
      <div className="absolute -inset-6 bg-brand/20 blur-2xl" />
      <span className={cn("relative drop-shadow-lg", emojiSize)}>{emoji}</span>
    </div>
  );
}
