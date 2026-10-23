"use client";

import type { Status } from "@mailnitio/shared";
import { Badge, cn, formatDateTime, formatRelativeTime, StatusChip } from "@mailnitio/ui";
import { AlarmClock, ArrowDown, ArrowUp, ChevronsUp, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";

/** Ticket status → the fixed chip vocabulary. */
const TICKET_CHIP: Record<string, Status> = {
  new: "Open",
  open: "Open",
  pending: "Pending",
  on_hold: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: "New",
  open: "Open",
  pending: "Pending (waiting on customer)",
  on_hold: "On hold",
  resolved: "Resolved",
  closed: "Closed",
};

export function TicketStatusChip({ status }: { status: string }) {
  const chip = TICKET_CHIP[status] ?? "Open";
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusChip status={chip} variant="dot" />
      {status === "new" || status === "on_hold" ? (
        <span className="text-caption font-normal text-text-subtle">
          {status === "new" ? "New" : "On hold"}
        </span>
      ) : null}
    </span>
  );
}

export function EmailChip({ chip }: { chip: string }) {
  if (chip === "Processing") return <Badge tone="info">Processing</Badge>;
  return <StatusChip status={chip as Status} />;
}

const PRIORITY: Record<
  string,
  { label: string; tone: "danger" | "warning" | "neutral" | "outline"; icon: typeof ArrowUp }
> = {
  urgent: { label: "Urgent", tone: "danger", icon: ChevronsUp },
  high: { label: "High", tone: "warning", icon: ArrowUp },
  medium: { label: "Medium", tone: "neutral", icon: Minus },
  low: { label: "Low", tone: "outline", icon: ArrowDown },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY[priority] ?? (PRIORITY.medium as (typeof PRIORITY)[string]);
  return (
    <Badge tone={p.tone}>
      <p.icon aria-hidden />
      {p.label}
    </Badge>
  );
}

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function duration(ms: number) {
  const mins = Math.round(Math.abs(ms) / 60_000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ${mins % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/** First-response SLA: time left, at risk (< 1 h) or overdue. Text always states the state. */
export function SlaTimer({
  due,
  respondedAt,
  status,
}: {
  due: string | null;
  respondedAt: string | null;
  status: string;
}) {
  const now = useNow();
  if (!due) return <span className="text-small text-text-subtle">No SLA</span>;
  if (respondedAt) return <span className="text-small text-text-muted">Responded</span>;
  if (status === "resolved" || status === "closed")
    return <span className="text-small text-text-subtle">Done</span>;
  const left = new Date(due).getTime() - now.getTime();
  const state = left < 0 ? "breached" : left < 3_600_000 ? "risk" : "ok";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-small tabular",
        state === "breached" ? "text-danger" : state === "risk" ? "text-warning" : "text-text-muted",
      )}
      title={`First response due ${formatDateTime(due)}`}
    >
      {state !== "ok" ? <AlarmClock aria-hidden className="size-3.5 stroke-[1.75]" /> : null}
      {state === "breached" ? `Overdue ${duration(left)}` : `${duration(left)} left`}
    </span>
  );
}

/** Relative time in lists, absolute (workspace timezone) on hover. */
export function When({ at, className }: { at: string | Date | null | undefined; className?: string }) {
  const { me } = useMe();
  useNow(60_000);
  if (!at) return <span className={cn("text-text-subtle", className)}>Never</span>;
  const iso = typeof at === "string" ? at : at.toISOString();
  return (
    <time
      dateTime={iso}
      title={formatDateTime(iso, me.workspace.timezone)}
      className={cn("tabular", className)}
    >
      {formatRelativeTime(iso)}
    </time>
  );
}

export function TicketKey({ value, className }: { value: string; className?: string }) {
  return <span className={cn("font-mono text-small text-text-muted", className)}>{value}</span>;
}

export const ACTION_LABELS: Record<string, string> = {
  created_ticket: "Created ticket",
  appended: "Appended",
  reopened: "Reopened",
  new_linked_ticket: "Linked new ticket",
  skipped: "Skipped",
};

export const REVIEW_REASON_LABELS: Record<string, string> = {
  escalation: "Escalation",
  low_confidence: "Low confidence",
  medium_confidence: "Medium confidence",
  ai_failed: "AI failed",
  unknown_category: "Unknown category",
  customer_to_confirm: "Customer to confirm",
  third_party_sender: "Third-party sender",
  thread_uncertain: "Thread uncertain",
};

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value > 0 && value < 1 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
  }).format(value);
}

export function canWork(role: string) {
  return ["owner", "admin", "supervisor", "agent", "reviewer"].includes(role);
}
export function canReview(role: string) {
  return ["owner", "admin", "supervisor", "reviewer"].includes(role);
}
export function canAdmin(role: string) {
  return ["owner", "admin"].includes(role);
}
export function canManage(role: string) {
  return ["owner", "admin", "supervisor"].includes(role);
}
