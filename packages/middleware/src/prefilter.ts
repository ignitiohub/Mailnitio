/** Pre-filter and loop protection (middleware spec §12.3): emails skipped before any AI call. */

export interface PrefilterInput {
  from: string;
  subject: string;
  headers: Record<string, string>;
}

export type SkipReason =
  | "auto_submitted"
  | "auto_reply_header"
  | "bulk_precedence"
  | "auto_reply_subject"
  | "system_sender"
  | "own_mailbox"
  | "own_message";

const AUTO_SUBJECT =
  /^(automatic reply|auto-?reply|out of (the )?office|undeliverable|delivery status notification|mail delivery failed)/i;
const SYSTEM_SENDER = /^(mailer-daemon|postmaster|no-?reply|donotreply|do-not-reply)@/i;

function header(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export function prefilter(input: PrefilterInput, context: { ownAddresses: string[] }): SkipReason | null {
  const { headers } = input;
  if (header(headers, "X-Mailnitio-Ref")) return "own_message";
  const autoSubmitted = header(headers, "Auto-Submitted");
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") return "auto_submitted";
  if (header(headers, "X-Autoreply") || header(headers, "X-Autorespond")) return "auto_reply_header";
  if (header(headers, "X-Auto-Response-Suppress")?.toLowerCase() === "all") return "auto_reply_header";
  const precedence = header(headers, "Precedence")?.toLowerCase();
  if (precedence && ["bulk", "junk", "list", "auto_reply"].includes(precedence)) return "bulk_precedence";
  if (AUTO_SUBJECT.test(input.subject.trim())) return "auto_reply_subject";
  if (SYSTEM_SENDER.test(input.from.trim())) return "system_sender";
  const from = input.from.trim().toLowerCase();
  if (context.ownAddresses.some((a) => a.toLowerCase() === from)) return "own_mailbox";
  return null;
}

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  auto_submitted: "Automatic reply",
  auto_reply_header: "Automatic reply",
  bulk_precedence: "Bulk or list email",
  auto_reply_subject: "Automatic reply or delivery report",
  system_sender: "System sender",
  own_mailbox: "Sent by one of our own mailboxes",
  own_message: "Mailnitio's own message",
};
