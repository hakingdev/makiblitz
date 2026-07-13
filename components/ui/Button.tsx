import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "light";
type Size = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-2 font-bold rounded-pill transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-brand-gradient text-white shadow-brand hover:brightness-110",
  ghost: "bg-white/5 text-white hover:bg-white/10",
  outline: "border border-white/15 text-white hover:bg-white/5",
  // Kit's inverse CTA for red surfaces: white pill, gradient-red label
  light: "bg-white text-brand-600 shadow-card hover:bg-cream",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
