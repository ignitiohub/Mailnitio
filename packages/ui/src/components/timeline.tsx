import { CheckCircle2, Circle, type LucideIcon, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface TimelineStep {
  id: string;
  label: string;
  /** Pre-formatted timestamp in the workspace timezone. */
  timestamp?: string;
  /** ISO timestamp for the <time> element. */
  dateTime?: string;
  detail?: ReactNode;
  state?: "done" | "failed" | "pending";
  icon?: LucideIcon;
}

/** Vertical decision trail: step icon + label + timestamp + detail. Failed steps use danger. */
export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {steps.map((step, index) => {
        const state = step.state ?? "done";
        const Icon =
          step.icon ?? (state === "failed" ? XCircle : state === "pending" ? Circle : CheckCircle2);
        const last = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-surface",
                state === "failed"
                  ? "border-danger/40 text-danger"
                  : state === "pending"
                    ? "border-border text-text-subtle"
                    : "border-border text-success",
              )}
            >
              <Icon aria-hidden className="size-3.5 stroke-[1.75]" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn("text-body font-medium", state === "failed" ? "text-danger" : "text-text")}>
                  {step.label}
                  {state === "failed" ? <span className="sr-only"> (failed)</span> : null}
                </p>
                {step.timestamp ? (
                  <time
                    dateTime={step.dateTime}
                    className="text-caption font-normal text-text-subtle tabular"
                  >
                    {step.timestamp}
                  </time>
                ) : null}
              </div>
              {step.detail ? <div className="text-small text-text-muted">{step.detail}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
