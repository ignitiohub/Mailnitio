import { cn } from "../lib/cn";

/**
 * 0–100% confidence with the number always visible. Bands follow the workspace thresholds:
 * >= high = success, between = warning, < low = danger.
 */
export function ConfidenceBar({
  value,
  high = 0.85,
  low = 0.6,
  label = "Confidence",
  className,
}: {
  /** 0..1 */
  value: number;
  high?: number;
  low?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const pct = Math.round(clamped * 100);
  const band = clamped >= high ? "high" : clamped < low ? "low" : "medium";
  const bandLabel = band === "high" ? "High" : band === "low" ? "Low" : "Medium";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}%, ${bandLabel.toLowerCase()} confidence`}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200",
            band === "high" ? "bg-success" : band === "low" ? "bg-danger" : "bg-warning",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-small font-medium text-text tabular">{pct}%</span>
    </div>
  );
}
