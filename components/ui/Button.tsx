import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

/** MakiLove / Button (Figma 7:100) — 56 px pill, label + arrow. */
export type ButtonVariant = "primary" | "secondary" | "white";

const base =
  "focus-ring inline-flex h-14 items-center justify-center gap-3 rounded-full px-6 text-base font-bold leading-6 whitespace-nowrap transition-colors";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-brand bg-paper text-brand hover:bg-blush",
  white: "bg-white text-brand hover:bg-paper focus-visible:ring-white/60 focus-visible:ring-offset-brand",
};

const disabledClass = "cursor-not-allowed bg-line text-muted hover:bg-line";

function Content({
  children,
  variant,
  disabled,
}: {
  children: ReactNode;
  variant: ButtonVariant;
  disabled?: boolean;
}) {
  return (
    <>
      <span>{children}</span>
      {/* Figma "Primary / Disabled" drops the arrow. */}
      {!disabled && (
        <Icon name={variant === "primary" ? "arrow-white" : "arrow-red"} />
      )}
    </>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      <Content variant={variant}>{children}</Content>
    </Link>
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(base, variants[variant], disabled && disabledClass, className)}
      {...props}
    >
      <Content variant={variant} disabled={disabled}>
        {children}
      </Content>
    </button>
  );
}
