import type { Priority, TenantConfig } from "@mailnitio/config";
import type { ClassifierDecision, ContextDecision } from "@mailnitio/config/packs";
import type { Tx } from "@mailnitio/db";

export type { ClassifierDecision, ContextDecision };

/** An inbound email as the pipeline sees it (Graph `uniqueBody`, never the quoted history). */
export interface InboundMessage {
  internetMessageId: string;
  conversationId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  from: string;
  fromName?: string | null;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  /** ISO timestamp */
  receivedAt: string;
  headers: Record<string, string>;
  hasAttachments?: boolean;
}

export type EmailSource = "graph" | "gmail" | "simulator" | "seed" | "replay";

/** The process-email job (middleware spec §7.1). D3 fetches `message` from Graph by id instead. */
export interface ProcessEmailJob {
  workspaceId: string;
  mailboxId: string;
  source: EmailSource;
  message: InboundMessage;
  /** D2 only: decisions precomputed for pack samples, used by the stub agents. */
  precomputed?: {
    classifier?: ClassifierDecision;
    context?: ContextDecision;
    aiFails?: boolean;
    processingFails?: boolean;
  };
}

export interface AgentMeta {
  model: string;
  provider: string;
  promptVersion: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AgentResult<T> {
  ok: boolean;
  output: T | null;
  error?: string;
  meta: AgentMeta;
}

export interface ClassifyInput {
  config: TenantConfig;
  mailbox: { address: string; defaultCategory: string };
  subject: string;
  /** PII-masked body; agents never see the raw text. */
  maskedBody: string;
  fromDomain: string;
  job: ProcessEmailJob;
}

export interface ContextInput {
  config: TenantConfig;
  subject: string;
  maskedBody: string;
  rollingSummary: string | null;
  candidate: {
    key: string;
    subject: string;
    category: string | null;
    status: string;
    summary: string | null;
  };
  job: ProcessEmailJob;
}

/** The AI agents (middleware spec §10.2). D2: precomputed stub; D3: LLM gateway. */
export interface Agents {
  classify(input: ClassifyInput): Promise<AgentResult<ClassifierDecision>>;
  context(input: ContextInput): Promise<AgentResult<ContextDecision>>;
}

export interface CaseRef {
  id: string;
  key: string;
  status: string;
  resolvedAt: Date | null;
  closedAt: Date | null;
  threadId: string | null;
  teamKey: string | null;
  teamName: string | null;
  category: string | null;
  subject: string;
  summary: string | null;
  mergedIntoId: string | null;
}

export interface CreateCaseInput {
  workspaceId: string;
  mailboxId: string;
  emailLogId: string;
  threadId: string;
  customerId: string | null;
  message: InboundMessage;
  category: string;
  team: string;
  priority: Priority;
  confidence: number | null;
  reason: string | null;
  summary: string | null;
  needsReview: boolean;
  escalated: boolean;
  relatedCaseId: string | null;
  at: Date;
}

/**
 * Where the pipeline writes (architecture rule 3). Native mode: HelpdeskDestination (tickets in
 * Mailnitio). Middleware mode: CrmDestination (cases in Dynamics 365). The pipeline is identical.
 */
export interface Destination {
  resolveCustomer(
    tx: Tx,
    input: {
      workspaceId: string;
      email: string;
      name: string | null;
      body: string;
      thirdPartyDomains: string[];
      at: Date;
    },
  ): Promise<{ customerId: string | null; method: "existing" | "created" | "unidentified"; flags: string[] }>;
  getCase(tx: Tx, caseId: string): Promise<CaseRef | null>;
  findCaseByKey(tx: Tx, key: string): Promise<CaseRef | null>;
  createCase(tx: Tx, input: CreateCaseInput): Promise<CaseRef>;
  appendMessage(
    tx: Tx,
    input: { caseId: string; emailLogId: string; message: InboundMessage; at: Date },
  ): Promise<void>;
  reopen(tx: Tx, input: { caseId: string; at: Date }): Promise<void>;
  linkRelated(tx: Tx, input: { caseId: string; relatedCaseId: string; at: Date }): Promise<void>;
  route(
    tx: Tx,
    input: {
      caseId: string;
      team: string;
      priority: Priority;
      escalated: boolean;
      needsReview: boolean;
      reason: string;
      at: Date;
    },
  ): Promise<void>;
}

/** Sends the acknowledgement from the receiving mailbox. D2: recorded as a simulated outbound message. */
export interface Acknowledger {
  send(
    tx: Tx,
    input: {
      workspaceId: string;
      caseId: string;
      emailLogId: string;
      mailboxAddress: string;
      to: string;
      subject: string;
      body: string;
      at: Date;
    },
  ): Promise<{ internetMessageId: string }>;
}

export class ProcessingError extends Error {
  constructor(
    readonly errorClass: "transient" | "permanent" | "config" | "ai",
    message: string,
  ) {
    super(message);
    this.name = "ProcessingError";
  }
}

/** The single pipeline entry point: Graph webhooks (D3), the simulator and replays all enqueue here. */
export const PROCESS_EMAIL_QUEUE = "process-email";
export const PROCESS_EMAIL_DLQ = "process-email-dlq";

/** Queue options for process-email (spec §7.1); used by whoever creates the queue first. */
export const PROCESS_EMAIL_QUEUE_OPTIONS = {
  retryLimit: 8,
  retryDelay: 15,
  retryBackoff: true,
  expireInSeconds: 900,
  deadLetter: PROCESS_EMAIL_DLQ,
} as const;
