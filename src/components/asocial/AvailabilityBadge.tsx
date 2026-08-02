import { cn } from "@/lib/utils";
import { seatsLabel } from "@/lib/format";

export function AvailabilityBadge({ available, className }: { available: number; className?: string }) {
  const tone =
    available <= 0 ? "text-carbon border-carbon/30" : available <= 2 ? "text-arcilla border-arcilla/40" : "text-musgo border-musgo/40";
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs", tone, className)}>
      {seatsLabel(available)}
    </span>
  );
}

export function OccupancyBar({ value, className }: { value: number; className?: string }) {
  const pctValue = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full rounded-full bg-musgo transition-all duration-200"
        style={{ width: `${pctValue}%` }}
      />
    </div>
  );
}
