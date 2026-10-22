import { STATUS_TONES, type Status, statusLabel } from "@mailnitio/shared";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  CircleDot,
  CircleSlash,
  Clock,
  EyeOff,
  Lock,
  type LucideIcon,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cn } from "../lib/cn";
import { Badge } from "./badge";

const ICONS: Record<Status, LucideIcon> = {
  Processed: CheckCircle2,
  Rerouted: ArrowRightLeft,
  "Needs Review": AlertTriangle,
  Escalated: ShieldAlert,
  Shadow: EyeOff,
  Skipped: CircleSlash,
  Failed: XCircle,
  Open: CircleDot,
  Pending: Clock,
  Resolved: CheckCircle2,
  Closed: Lock,
};

/**
 * Status always carries text (and an icon by default), never colour alone. Fixed vocabulary from the brief.
 */
export function StatusChip({
  status,
  variant = "icon",
  className,
}: {
  status: Status;
  variant?: "icon" | "dot" | "plain";
  className?: string;
}) {
  const Icon = ICONS[status];
  const tone = STATUS_TONES[status];
  return (
    <Badge
      tone={tone}
      className={cn(status === "Shadow" && "border border-dashed border-neutral/40", className)}
    >
      {variant === "icon" ? <Icon aria-hidden /> : null}
      {variant === "dot" ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {statusLabel(status)}
    </Badge>
  );
}
