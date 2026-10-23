import { findTicketKeys, normalizeSubject } from "./normalize";

/**
 * Deterministic thread resolution (middleware spec §8.1), in priority order:
 * 1. ticket token in subject/body, 2. In-Reply-To/References headers, 3. conversation id,
 * 4. heuristic (same sender + normalised subject + recent activity).
 * Lookups are injected so the resolver is pure and testable.
 */

export interface ThreadLookups {
  ticketByKey(key: string): Promise<{ ticketId: string; threadId: string | null } | null>;
  messageIndex(
    internetMessageId: string,
  ): Promise<{ ticketId: string | null; threadId: string | null } | null>;
  threadByConversation(conversationId: string): Promise<{ threadId: string; ticketId: string | null } | null>;
  recentTicketBySenderSubject(
    sender: string,
    normalizedSubject: string,
    sinceDays: number,
  ): Promise<{ ticketId: string; threadId: string | null } | null>;
}

export interface ThreadInput {
  subject: string;
  body: string;
  from: string;
  inReplyTo?: string | null;
  references?: string[];
  conversationId?: string | null;
}

export type MatchMethod = "token" | "headers" | "conversation" | "heuristic" | "none";

export interface ThreadMatch {
  method: MatchMethod;
  ticketId: string | null;
  threadId: string | null;
  /** Token and header matches are certain; heuristics always need the Context Agent's judgement. */
  confident: boolean;
}

export async function resolveThread(
  input: ThreadInput,
  lookups: ThreadLookups,
  options: { ticketPattern: string; heuristicDays?: number },
): Promise<ThreadMatch> {
  for (const key of findTicketKeys(`${input.subject}\n${input.body}`, options.ticketPattern)) {
    const ticket = await lookups.ticketByKey(key);
    if (ticket)
      return { method: "token", ticketId: ticket.ticketId, threadId: ticket.threadId, confident: true };
  }

  const headerIds = [input.inReplyTo, ...(input.references ?? []).slice().reverse()].filter(
    (id): id is string => Boolean(id),
  );
  for (const id of headerIds) {
    const hit = await lookups.messageIndex(id);
    if (hit && (hit.ticketId || hit.threadId)) {
      return { method: "headers", ticketId: hit.ticketId, threadId: hit.threadId, confident: true };
    }
  }

  if (input.conversationId) {
    const thread = await lookups.threadByConversation(input.conversationId);
    if (thread)
      return {
        method: "conversation",
        ticketId: thread.ticketId,
        threadId: thread.threadId,
        confident: true,
      };
  }

  const normalized = normalizeSubject(input.subject, options.ticketPattern);
  const looksLikeReply = normalized !== input.subject.trim().toLowerCase().replace(/\s+/g, " ");
  if (looksLikeReply && normalized.length >= 4) {
    const recent = await lookups.recentTicketBySenderSubject(
      input.from,
      normalized,
      options.heuristicDays ?? 14,
    );
    if (recent)
      return { method: "heuristic", ticketId: recent.ticketId, threadId: recent.threadId, confident: false };
  }

  return { method: "none", ticketId: null, threadId: null, confident: false };
}
