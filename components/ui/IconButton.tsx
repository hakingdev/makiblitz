import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Filled brand-red circle vs. translucent surface. */
  tone?: "surface" | "brand";
  size?: "sm" | "md";
};

const sizes = {
  sm: "h-8 w-8",
  md: "h-[34px] w-[34px] md:h-10 md:w-10",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone = "surface", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        tone === "brand"
          ? "bg-brand-gradient text-white shadow-brand"
          : "bg-white/10 text-white hover:bg-white/15 backdrop-blur",
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
