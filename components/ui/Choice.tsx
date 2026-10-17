import { cn } from "@/lib/utils";

/**
 * MakiLove / Choice (Figma 7:102) — selectable guest count or time slot.
 * A native radio underneath keeps arrow-key navigation and form semantics;
 * "Unavailable" maps to `disabled`.
 */
export function Choice({
  name,
  value,
  label,
  checked,
  disabled,
  onSelect,
  className,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("relative block", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex h-12 items-center justify-center rounded-lg border px-2 text-base font-bold leading-[23px] transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-focus-visible:ring-offset-2",
          disabled
            ? "border-line bg-line text-muted"
            : checked
              ? "border-brand bg-brand text-white"
              : "border-line bg-white text-ink hover:border-ink/30",
        )}
      >
        {label}
      </span>
    </label>
  );
}
