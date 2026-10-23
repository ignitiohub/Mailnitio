import type { Priority, TenantConfig } from "@mailnitio/config";

/**
 * Routing decision table (middleware spec §11). Code decides; the AI only advises (rule 6).
 * Precedence: escalation → spam → confidence bands → fallback.
 */

export interface RouteInput {
  config: TenantConfig;
  /** The receiving mailbox's default category. */
  mailboxDefaultCategory: string;
  /** null when the classifier failed or was not called (AI failed). */
  classification: {
    category: string;
    confidence: number;
    priority: Priority;
    escalation: { flag: boolean; reason: string | null };
  } | null;
  /** Escalation terms found in the subject/body by rule. */
  escalationTerms: string[];
  customerFlags: string[];
}

export type ReviewReason =
  | "escalation"
  | "low_confidence"
  | "medium_confidence"
  | "ai_failed"
  | "unknown_category"
  | "customer_to_confirm"
  | "third_party_sender";

export interface RouteDecision {
  /** Skip without a ticket (spam). */
  skip: boolean;
  /** Final category (the AI's, or the mailbox default on fallback). */
  category: string;
  /** Team key the ticket is routed to. */
  team: string;
  /** Team the receiving mailbox would have used. */
  originalTeam: string;
  rerouted: boolean;
  priority: Priority;
  escalated: boolean;
  escalationReason: string | null;
  needsReview: boolean;
  reviewReasons: ReviewReason[];
}

const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "urgent"];

export function findEscalationTerms(text: string, terms: string[]): string[] {
  const found: string[] = [];
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Short all-caps acronyms (SEC, CBN, NERC) must match case-sensitively to avoid "second", "secure".
    const caseSensitive = term.length <= 5 && term === term.toUpperCase();
    if (new RegExp(`\\b${escaped}\\b`, caseSensitive ? "" : "i").test(text)) found.push(term);
  }
  return found;
}

export function route(input: RouteInput): RouteDecision {
  const { config, classification } = input;
  const teamFor = (categoryKey: string) =>
    config.categories.find((c) => c.key === categoryKey)?.team ??
    config.categories.find((c) => c.key === config.defaultCategory)?.team ??
    config.escalation.team;
  const defaultCategory = config.categories.some((c) => c.key === input.mailboxDefaultCategory)
    ? input.mailboxDefaultCategory
    : config.defaultCategory;
  const originalTeam = teamFor(defaultCategory);
  const reasons: ReviewReason[] = [];

  const customerReasons = input.customerFlags.filter(
    (f): f is "customer_to_confirm" | "third_party_sender" =>
      f === "customer_to_confirm" || f === "third_party_sender",
  );

  const known = classification && config.categories.some((c) => c.key === classification.category);
  const category = known && classification ? classification.category : defaultCategory;
  let priority: Priority =
    known && classification
      ? classification.priority
      : (config.categories.find((c) => c.key === defaultCategory)?.defaultPriority ?? "medium");

  const decision = (team: string, extra: Partial<RouteDecision> = {}): RouteDecision => ({
    skip: false,
    category,
    team,
    originalTeam,
    rerouted: team !== originalTeam,
    priority,
    escalated: false,
    escalationReason: null,
    needsReview: reasons.length > 0,
    reviewReasons: [...reasons],
    ...extra,
  });

  // 1. Escalation: rule terms first, then the AI flag. Escalation forces urgent priority.
  if (input.escalationTerms.length > 0 || classification?.escalation.flag) {
    priority = "urgent";
    reasons.push("escalation", ...customerReasons);
    const reason =
      input.escalationTerms.length > 0
        ? `Mentions ${input.escalationTerms.join(", ")}`
        : (classification?.escalation.reason ?? "Flagged by AI");
    return decision(config.escalation.team, { escalated: true, escalationReason: reason, priority });
  }

  // 2. AI failed or returned an unknown category: mailbox default + review.
  if (!classification) {
    reasons.push("ai_failed", ...customerReasons);
    return decision(originalTeam);
  }
  if (!known) {
    reasons.push("unknown_category", ...customerReasons);
    return decision(originalTeam);
  }

  // 3. Spam above the spam threshold: skip, no ticket.
  if (classification.category === "spam" && classification.confidence >= config.thresholds.spam) {
    return { ...decision(originalTeam), skip: true, needsReview: false, reviewReasons: [] };
  }

  // 4. Confidence bands.
  const { high, low } = config.thresholds;
  if (classification.confidence < low) {
    reasons.push("low_confidence", ...customerReasons);
    return decision(originalTeam, { category: defaultCategory });
  }
  if (classification.confidence < high) reasons.push("medium_confidence");
  reasons.push(...customerReasons);
  return decision(teamFor(classification.category));
}

export function raisePriority(priority: Priority, steps = 1): Priority {
  const index = Math.min(PRIORITY_ORDER.length - 1, PRIORITY_ORDER.indexOf(priority) + steps);
  return PRIORITY_ORDER[index] ?? priority;
}
