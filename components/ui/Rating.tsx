import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold text-white",
        className,
      )}
    >
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      {value.toFixed(1)}
    </span>
  );
}
