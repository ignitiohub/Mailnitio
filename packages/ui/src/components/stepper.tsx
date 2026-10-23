import { Check } from "lucide-react";
import { cn } from "../lib/cn";

/** Horizontal progress through a multi-step flow (onboarding, setup wizards). */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            className="flex flex-1 items-center gap-2"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-caption tabular",
                done && "border-primary bg-primary text-primary-fg",
                active && "border-primary text-primary",
                !done && !active && "border-border-strong text-text-subtle",
              )}
            >
              {done ? <Check aria-hidden className="size-3.5 stroke-[2]" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-small max-sm:sr-only",
                active ? "font-medium text-text" : "text-text-muted",
              )}
            >
              {step}
              {done ? <span className="sr-only"> (completed)</span> : null}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
