import { createHash } from "node:crypto";

/** One email = one source_key = sha256(workspace_id + ':' + lower(internetMessageId)) (middleware spec §7.4). */
export function sourceKey(workspaceId: string, internetMessageId: string): string {
  return createHash("sha256")
    .update(`${workspaceId}:${internetMessageId.trim().toLowerCase()}`)
    .digest("hex");
}

const PREFIX = /^(?:\s*(?:re|fw|fwd|aw|sv|rv|tr|antw)\s*(?:\[\d+\])?\s*:\s*)+/i;
const TAG = /\[(?:external|ext|caution|warning)\]/gi;

/**
 * Subject normalisation (spec §8.2): lowercase, strip reply/forward prefixes (repeated), strip ticket
 * tokens and [external]-style tags, collapse whitespace.
 */
export function normalizeSubject(subject: string, ticketPattern?: string): string {
  let s = subject.toLowerCase().replace(TAG, " ");
  if (ticketPattern) {
    s = s.replace(new RegExp(`\\[?\\s*${ticketPattern}\\s*\\]?`, "gi"), " ");
  }
  s = s.replace(/\s+/g, " ").trim();
  // Prefixes can reappear after removing a leading tag or token ("[EXTERNAL] RE: ...").
  let previous: string;
  do {
    previous = s;
    s = s.replace(PREFIX, "").trim();
  } while (s !== previous);
  return s.replace(/\s+/g, " ").trim();
}

/** Ticket keys found in a subject or body, e.g. ["MN-1042"]. */
export function findTicketKeys(text: string, ticketPattern: string): string[] {
  const matches = text.match(new RegExp(ticketPattern, "gi")) ?? [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}
