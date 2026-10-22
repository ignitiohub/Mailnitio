/** Pipeline outcome statuses (decision trail, inbox log). */
export const PIPELINE_STATUSES = [
  "Processed",
  "Rerouted",
  "Needs Review",
  "Escalated",
  "Shadow",
  "Skipped",
  "Failed",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

/** Ticket lifecycle statuses. */
export const TICKET_STATUSES = ["Open", "Pending", "Resolved", "Closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type Status = PipelineStatus | TicketStatus;
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

export const STATUS_TONES: Record<Status, StatusTone> = {
  Processed: "success",
  Rerouted: "info",
  "Needs Review": "warning",
  Escalated: "danger",
  Shadow: "neutral",
  Skipped: "neutral",
  Failed: "danger",
  Open: "primary",
  Pending: "warning",
  Resolved: "success",
  Closed: "neutral",
};

/** UI labels are sentence case; the stored vocabulary keeps the brief's names. */
export function statusLabel(status: Status): string {
  return status === "Needs Review" ? "Needs review" : status;
}
