import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";
import { Skeleton } from "./skeleton";

/** Minimal inline sparkline. Decorative: the value and delta carry the meaning. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const width = 96;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 4)}`)
    .join(" ");
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-24 overflow-visible text-primary", className)}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface KpiDelta {
  /** Change vs previous period, e.g. 0.184 for +18.4%. */
  value: number;
  /** Whether an increase is good (default) or bad (e.g. complaint rate). */
  goodDirection?: "up" | "down";
  label?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  context,
  sparkline,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  context?: ReactNode;
  sparkline?: number[];
  className?: string;
}) {
  let deltaNode: ReactNode = null;
  if (delta) {
    const direction = delta.value > 0 ? "up" : delta.value < 0 ? "down" : "flat";
    const good = direction === "flat" ? null : direction === (delta.goodDirection ?? "up");
    const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
    const pct = `${delta.value > 0 ? "+" : ""}${(delta.value * 100).toFixed(1)}%`;
    deltaNode = (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-caption tabular",
          good === null ? "text-text-muted" : good ? "text-success" : "text-danger",
        )}
      >
        <Icon aria-hidden className="size-3.5 stroke-[1.75]" />
        <span>
          {pct}
          <span className="sr-only">
            {direction === "up" ? " increase" : direction === "down" ? " decrease" : " no change"}
          </span>
        </span>
        <span className="text-text-subtle">{delta.label ?? "vs previous period"}</span>
      </span>
    );
  }

  return (
    <Card className={cn("flex flex-col gap-2 p-4", className)}>
      <p className="text-caption text-text-muted">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-h2 text-text tabular">{value}</p>
        {sparkline ? <Sparkline values={sparkline} /> : null}
      </div>
      {deltaNode}
      {context ? <p className="text-small text-text-muted">{context}</p> : null}
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-36" />
    </Card>
  );
}
