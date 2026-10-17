import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** MakiLove / Field (Figma 7:101) — label, 56 px input, error text. */

export const fieldLabel = "text-sm font-bold leading-5 text-ink";

export const inputBase =
  "w-full rounded-lg border bg-white px-4 text-base leading-[26px] text-ink placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand/15";

function inputState(invalid: boolean) {
  return invalid ? "border-brand focus:border-brand" : "border-line focus:border-ink/40";
}

type Common = { label: string; error?: string | null; className?: string };

export const Field = forwardRef<
  HTMLInputElement,
  Common & Omit<InputHTMLAttributes<HTMLInputElement>, "className">
>(function Field({ label, error, className, id, ...props }, ref) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(inputBase, "h-14", inputState(Boolean(error)))}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs leading-[18px] text-brand">
          {error}
        </p>
      )}
    </div>
  );
});

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">
>(function TextareaField({ label, error, className, id, ...props }, ref) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        className={cn(inputBase, "min-h-[112px] resize-y py-[15px]", inputState(Boolean(error)))}
        {...props}
      />
    </div>
  );
});
