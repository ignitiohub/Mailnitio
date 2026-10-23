import type { Priority, TenantConfig } from "../tenant-config";

export type PackId = "financial-services" | "utilities" | "generic";

/** Output of the classifier agent (middleware spec §10.4). Precomputed for samples in D2. */
export interface ClassifierDecision {
  category: string;
  confidence: number;
  priority: Priority;
  summary: string;
  reason: string;
  escalation: { flag: boolean; reason: string | null };
}

/** Output of the context agent (middleware spec §8.3). */
export interface ContextDecision {
  decision: "same_case" | "new_issue" | "related_case" | "new_case" | "duplicate" | "mixed";
  replyType: "continuation" | "closure" | "new_issue" | "escalation" | "mixed";
  confidence: number;
  reason: string;
  updatedSummary: string;
  newIssueSummary: string | null;
}

export interface SampleFollowUp {
  /** Agent email (from pack.agents) to assign the ticket to. */
  assignee?: string;
  reply?: { body: string; afterMinutes: number };
  note?: { body: string; afterMinutes: number };
  status?: "open" | "pending" | "on_hold" | "resolved" | "closed";
}

/** A synthetic inbound email with the decisions the AI would have made. */
export interface SampleEmail {
  id: string;
  /** Receiving mailbox address. */
  mailbox: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  /** Minutes before "now" the email arrived (spread over 30 days). */
  ageMinutes: number;
  /** Sample id this email replies to (sets In-Reply-To so the thread resolver matches by headers). */
  inReplyTo?: string;
  headers?: Record<string, string>;
  classifier?: ClassifierDecision;
  context?: ContextDecision;
  /** The AI call fails (invalid output after repair): pipeline falls back to the mailbox default + review. */
  aiFails?: boolean;
  /** Processing fails permanently (e.g. malformed message): status failed, appears for replay. */
  processingFails?: boolean;
  followUp?: SampleFollowUp;
  /** Short label for the simulator's "pick a sample" list. */
  label: string;
}

export interface PackTeam {
  key: string;
  name: string;
  emailAlias: string;
}

export interface PackMailbox {
  address: string;
  displayName: string;
  defaultCategory: string;
  mode: "live" | "shadow" | "paused";
  ackEnabled: boolean;
}

export interface PackAgent {
  name: string;
  email: string;
  role: "admin" | "supervisor" | "agent" | "reviewer" | "viewer";
  teams: string[];
}

export interface PackCannedResponse {
  title: string;
  body: string;
  team?: string;
}

export interface PackKbEntry {
  topic: string;
  questions: string[];
  answer: string;
}

export interface CategoryTemplates {
  category: string;
  /** Relative share of new emails in this category. */
  weight: number;
  subjects: string[];
  bodies: string[];
  summaries: string[];
  reasons: string[];
  replies: string[];
}

export interface InsightReport {
  title: string;
  period: string;
  emailsAnalysed: number;
  misroutedShare: number;
  duplicateShare: number;
  autoAnswerShare: number;
  topics: { label: string; share: number; volume: number; misrouted: number; autoAnswerCandidate: boolean }[];
  findings: string[];
}

export interface IndustryPack {
  id: PackId;
  name: string;
  workspaceName: string;
  domain: string;
  config: TenantConfig;
  teams: PackTeam[];
  mailboxes: PackMailbox[];
  agents: PackAgent[];
  cannedResponses: PackCannedResponse[];
  kb: PackKbEntry[];
  templates: CategoryTemplates[];
  escalationEmails: { subject: string; body: string; reason: string }[];
  followUpLines: {
    continuation: string[];
    closure: string[];
    newIssue: { line: string; category: string }[];
  };
  insightReport: InsightReport;
}
