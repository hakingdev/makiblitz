import { cn } from "@/lib/utils";

/**
 * Icons exported 1:1 from the Figma file (public/icons). Colours are baked
 * into the SVGs, so each colour variant is its own file.
 */
const ICONS = {
  "arrow-white": 20,
  "arrow-red": 20,
  "arrow-link": 24,
  calendar: 16,
  "check-16": 16,
  "check-18": 18,
  "check-32": 32,
  clock: 16,
  close: 20,
  heart: 20,
  "heart-24": 24,
  menu: 24,
  pin: 16,
  users: 16,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const size = ICONS[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing to optimise
    <img
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("block shrink-0", className)}
    />
  );
}
