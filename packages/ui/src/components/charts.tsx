"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "../lib/cn";
import { formatNumber } from "../lib/format";
import { Button } from "./button";

/**
 * Charts follow the dataviz method: form first, validated categorical hues in fixed order
 * (--series-1..5, then "Other"), thin marks with 2px surface gaps and 4px rounded data ends, a legend
 * for 2+ series, a hover/focus tooltip on every mark, and a table view. Text uses text tokens only.
 */

const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
];

export function seriesColor(index: number, key?: string): string {
  if (key === "other") return "var(--series-other)";
  return SERIES_VARS[index] ?? "var(--series-other)";
}

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= value) ?? 10;
  return step * pow * 4;
}

export interface StackedSeries {
  key: string;
  label: string;
}

export interface StackedBarChartProps {
  /** Accessible name; the visible title lives in the surrounding card. */
  label: string;
  series: StackedSeries[];
  points: { label: string; detail?: string; values: Record<string, number> }[];
  height?: number;
  className?: string;
}

export function StackedBarChart({ label, series, points, height = 220, className }: StackedBarChartProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const totals = points.map((p) => series.reduce((sum, s) => sum + (p.values[s.key] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5 text-caption font-normal text-text-muted">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px]"
                style={{ background: seriesColor(i, s.key) }}
              />
              {s.label}
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          aria-pressed={view === "table"}
        >
          {view === "chart" ? <Table2 aria-hidden /> : <BarChart3 aria-hidden />}
          {view === "chart" ? "View as table" : "View as chart"}
        </Button>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="text-caption text-text-muted">
                <th scope="col" className="py-1 pr-3 text-left">
                  Day
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-2 py-1 text-right">
                    {s.label}
                  </th>
                ))}
                <th scope="col" className="py-1 pl-2 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.label} className="border-t border-border">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-text">
                    {p.detail ?? p.label}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-1.5 text-right text-text-muted tabular">
                      {formatNumber(p.values[s.key] ?? 0)}
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-right font-medium text-text tabular">
                    {formatNumber(totals[i] ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2" role="group" aria-label={label}>
          {/* Y axis: recessive, four gridlines */}
          <div className="flex flex-col justify-between pb-6 text-right" style={{ height }} aria-hidden>
            {ticks
              .slice()
              .reverse()
              .map((t) => (
                <span key={t} className="text-caption leading-none font-normal text-text-subtle tabular">
                  {formatNumber(t)}
                </span>
              ))}
          </div>
          <div className="relative flex-1">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
              style={{ height: height - 24 }}
              aria-hidden
            >
              {ticks.map((t) => (
                <span key={t} className="h-px w-full bg-border" />
              ))}
            </div>
            <div className="relative flex items-end gap-[6%]" style={{ height }}>
              {points.map((p, i) => {
                const total = totals[i] ?? 0;
                const tooltipId = `${id}-tip-${i}`;
                return (
                  <div key={p.label} className="flex h-full flex-1 flex-col items-center">
                    <button
                      type="button"
                      className="group relative flex w-full flex-1 cursor-default flex-col-reverse items-center rounded-control outline-offset-2"
                      aria-describedby={tooltipId}
                      aria-label={`${p.detail ?? p.label}: ${formatNumber(total)} in total`}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                    >
                      <span
                        className="flex w-full max-w-10 flex-col-reverse gap-[2px]"
                        style={{ height: `${max > 0 ? (total / max) * 100 : 0}%` }}
                      >
                        {series.map((s, si) => {
                          const v = p.values[s.key] ?? 0;
                          if (v <= 0) return null;
                          const isTop = series
                            .slice(si + 1)
                            .every((later) => (p.values[later.key] ?? 0) <= 0);
                          return (
                            <span
                              key={s.key}
                              className={cn(
                                "w-full min-h-[2px] transition-opacity duration-150",
                                isTop && "rounded-t-[4px]",
                                active !== null && active !== i && "opacity-60",
                              )}
                              style={{ flexGrow: v, flexBasis: 0, background: seriesColor(si, s.key) }}
                            />
                          );
                        })}
                      </span>
                      <span
                        id={tooltipId}
                        role="tooltip"
                        className={cn(
                          "pointer-events-none absolute bottom-full z-20 mb-2 w-max min-w-40 rounded-card border border-border bg-surface p-3 text-left shadow-md",
                          active === i ? "block" : "hidden",
                          i > points.length / 2 ? "right-0" : "left-0",
                        )}
                      >
                        <span className="mb-1.5 block text-caption text-text">{p.detail ?? p.label}</span>
                        {series.map((s, si) => (
                          <span
                            key={s.key}
                            className="flex items-center justify-between gap-4 text-small text-text-muted"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                aria-hidden
                                className="size-2 rounded-[2px]"
                                style={{ background: seriesColor(si, s.key) }}
                              />
                              {s.label}
                            </span>
                            <span className="tabular text-text">{formatNumber(p.values[s.key] ?? 0)}</span>
                          </span>
                        ))}
                        <span className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-small font-medium text-text">
                          Total <span className="tabular">{formatNumber(total)}</span>
                        </span>
                      </span>
                    </button>
                    <span className="mt-2 h-4 text-caption leading-4 font-normal text-text-subtle">
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Horizontal single-series bars with direct value labels (e.g. open tickets by team). */
export function BarList({
  label,
  items,
  valueLabel,
  className,
}: {
  label: string;
  items: { key: string; label: string; value: number; detail?: string; href?: string }[];
  valueLabel: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("flex flex-col gap-3", className)} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-small">
            <span className="truncate text-text">{item.label}</span>
            <span className="shrink-0 text-text-muted tabular">
              {valueLabel(item.value)}
              {item.detail ? <span className="ml-2 text-text-subtle">{item.detail}</span> : null}
            </span>
          </div>
          <span className="h-2 w-full rounded-full bg-surface-2" aria-hidden>
            <span
              className="block h-2 rounded-full bg-[var(--series-1)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
