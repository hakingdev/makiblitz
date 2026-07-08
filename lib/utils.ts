import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** Format a number as German euro currency, e.g. 6.9 -> "6,90 €" */
export function formatPrice(value: number): string {
  return euro.format(value);
}
