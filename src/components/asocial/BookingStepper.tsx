import { cn } from "@/lib/utils";

export function BookingStepper({ step, className }: { step: 1 | 2 | 3 | 4; className?: string }) {
  const steps = ["Sesión", "Asistentes", "Resumen"];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {steps.map((label, index) => {
        const value = index + 1;
        const active = step === value;
        const done = step > value;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors duration-200",
                  active
                    ? "border-carbon bg-carbon text-lino"
                    : done
                      ? "border-musgo text-musgo"
                      : "border-border text-muted-foreground/60",
                )}
              >
                {value}
              </span>
              <span
                className={cn(
                  "text-xs transition-colors duration-200",
                  active ? "text-foreground" : done ? "text-musgo" : "text-muted-foreground/60",
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 ? <span className="h-px w-5 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}
