import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain";

const toneClass: Record<Tone, string> = {
  musgo: "border-musgo/40 text-musgo",
  arcilla: "border-arcilla/40 text-arcilla",
  carbon: "border-carbon/30 text-carbon",
  nogal: "border-nogal/30 text-nogal/70",
  muted: "border-border text-muted-foreground",
};

export function StatusPill({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-normal",
        toneClass[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}
