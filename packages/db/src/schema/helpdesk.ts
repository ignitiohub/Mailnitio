import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { workspaces } from "./workspace";

/**
 * Helpdesk + AI pipeline tables (plan §13.4, middleware spec §6). Every table carries
 * workspace_id NOT NULL and is protected by RLS (migration 0005_helpdesk_rls.sql).
 */

const workspaceId = () =>
  uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const textArray = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);
const jsonObject = <T>(name: string) => jsonb(name).$type<T>().notNull().default(sql`'{}'::jsonb`);

// ---------------------------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------------------------

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  /** email_graph | email_gmail | crm_dataverse | llm */
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  /** pending | ok | error | disabled */
  status: text("status").notNull().default("pending"),
  settings: jsonObject<Record<string, unknown>>("settings"),
  /** Envelope-encrypted secret (@mailnitio/crypto); never returned by the API. */
  secretEncrypted: text("secret_encrypted"),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: createdAt(),
});

export const mailboxes = pgTable(
  "mailboxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    connectionId: uuid("connection_id").references(() => connections.id, { onDelete: "set null" }),
    address: text("address").notNull(),
    displayName: text("display_name").notNull(),
    defaultCategory: text("default_category").notNull(),
    /** shadow | live | paused */
    mode: text("mode").notNull().default("shadow"),
    ackEnabled: boolean("ack_enabled").notNull().default(false),
    /** ok | error | not_connected */
    health: text("health").notNull().default("ok"),
    lastReceivedAt: timestamp("last_received_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("mailboxes_workspace_address_uq").on(t.workspaceId, t.address)],
);

export const configVersions = pgTable(
  "config_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    version: integer("version").notNull(),
    /** draft | active | archived */
    status: text("status").notNull().default("draft"),
    /** Validated by tenantConfigSchema (@mailnitio/config). */
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("config_versions_workspace_version_uq").on(t.workspaceId, t.version),
    uniqueIndex("config_versions_one_active_uq").on(t.workspaceId).where(sql`status = 'active'`),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    emailAlias: text("email_alias"),
    /** none | round_robin */
    autoAssign: text("auto_assign").notNull().default("none"),
    businessHoursId: uuid("business_hours_id"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("teams_workspace_key_uq").on(t.workspaceId, t.key)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    workspaceId: workspaceId(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** member | lead */
    role: text("role").notNull().default("member"),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.userId] }),
    index("team_members_user_idx").on(t.workspaceId, t.userId),
  ],
);

export const businessHours = pgTable("business_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  /** { mon: [["08:00","17:00"]], ... } */
  schedule: jsonObject<Record<string, [string, string][]>>("schedule"),
  holidays: jsonb("holidays").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: createdAt(),
});

export const slaPolicies = pgTable("sla_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  name: text("name").notNull(),
  /** low | medium | high | urgent */
  priority: text("priority").notNull(),
  firstResponseMins: integer("first_response_mins").notNull(),
  resolutionMins: integer("resolution_mins").notNull(),
  businessHoursId: uuid("business_hours_id").references(() => businessHours.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const cannedResponses = pgTable("canned_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  actions: jsonObject<{ status?: string; tags?: string[] }>("actions"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const kbEntries = pgTable("kb_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  topic: text("topic").notNull(),
  questionVariants: textArray("question_variants"),
  answer: text("answer").notNull(),
  /** draft | approved | archived */
  status: text("status").notNull().default("approved"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    company: text("company"),
    identifiers: jsonObject<Record<string, string>>("identifiers"),
    fields: jsonObject<Record<string, unknown>>("fields"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("customers_workspace_email_uq").on(t.workspaceId, t.email)],
);

export const customerEmails = pgTable(
  "customer_emails",
  {
    workspaceId: workspaceId(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.email] })],
);

// ---------------------------------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------------------------------

/** Per-workspace ticket number sequence (MN-<n>); incremented under a row lock. */
export const ticketCounters = pgTable("ticket_counters", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  lastNumber: bigint("last_number", { mode: "number" }).notNull(),
});

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    number: bigint("number", { mode: "number" }).notNull(),
    key: text("key").notNull(),
    mailboxId: uuid("mailbox_id").references(() => mailboxes.id, { onDelete: "set null" }),
    threadId: uuid("thread_id"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    /** new | open | pending | on_hold | resolved | closed */
    status: text("status").notNull().default("new"),
    /** low | medium | high | urgent */
    priority: text("priority").notNull().default("medium"),
    category: text("category"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    tags: textArray("tags"),
    source: text("source").notNull().default("email"),
    aiConfidence: numeric("ai_confidence", { precision: 4, scale: 3, mode: "number" }),
    aiReason: text("ai_reason"),
    aiSummary: text("ai_summary"),
    needsReview: boolean("needs_review").notNull().default(false),
    escalated: boolean("escalated").notNull().default(false),
    slaPolicyId: uuid("sla_policy_id").references(() => slaPolicies.id, { onDelete: "set null" }),
    firstResponseDue: timestamp("first_response_due", { withTimezone: true }),
    resolutionDue: timestamp("resolution_due", { withTimezone: true }),
    firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    reopenedCount: integer("reopened_count").notNull().default(0),
    relatedTicketIds: uuid("related_ticket_ids").array().notNull().default(sql`'{}'::uuid[]`),
    mergedIntoId: uuid("merged_into_id"),
    crmCaseId: text("crm_case_id"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tickets_workspace_number_uq").on(t.workspaceId, t.number),
    uniqueIndex("tickets_workspace_key_uq").on(t.workspaceId, t.key),
    index("tickets_workspace_status_idx").on(t.workspaceId, t.status, t.updatedAt),
    index("tickets_workspace_team_idx").on(t.workspaceId, t.teamId),
    index("tickets_workspace_assignee_idx").on(t.workspaceId, t.assigneeId),
    index("tickets_workspace_customer_idx").on(t.workspaceId, t.customerId),
  ],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    emailLogId: uuid("email_log_id"),
    /** inbound | outbound | note */
    direction: text("direction").notNull(),
    /** customer | agent | system */
    authorType: text("author_type").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    fromAddr: text("from_addr"),
    fromName: text("from_name"),
    toAddrs: textArray("to_addrs"),
    ccAddrs: textArray("cc_addrs"),
    subject: text("subject"),
    bodyText: text("body_text").notNull(),
    /** received | simulated | sent | failed (D2: replies are stored as simulated) */
    sentStatus: text("sent_status").notNull().default("received"),
    mentions: uuid("mentions").array().notNull().default(sql`'{}'::uuid[]`),
    internetMessageId: text("internet_message_id"),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.workspaceId, t.ticketId, t.createdAt)],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    /** created | status | priority | team | assignee | tags | merged | split | linked | reopened | ai | review */
    type: text("type").notNull(),
    /** user | system | ai */
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    data: jsonObject<Record<string, unknown>>("data"),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_events_ticket_idx").on(t.workspaceId, t.ticketId, t.createdAt)],
);

export const savedViews = pgTable("saved_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonObject<Record<string, unknown>>("filters"),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** assignment | customer_reply | mention */
    type: text("type").notNull(),
    data: jsonObject<Record<string, unknown>>("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.workspaceId, t.userId, t.createdAt)],
);

// ---------------------------------------------------------------------------------------------------
// AI pipeline
// ---------------------------------------------------------------------------------------------------

export const emailThreads = pgTable(
  "email_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    conversationId: text("conversation_id").notNull(),
    rootInternetMessageId: text("root_internet_message_id"),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    relatedTicketIds: uuid("related_ticket_ids").array().notNull().default(sql`'{}'::uuid[]`),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    normalizedSubject: text("normalized_subject"),
    messageCount: integer("message_count").notNull().default(0),
    rollingSummary: text("rolling_summary"),
    category: text("category"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("email_threads_workspace_conversation_uq").on(t.workspaceId, t.conversationId)],
);

export interface TimelineStep {
  step: string;
  label: string;
  at: string;
  detail?: string;
  state: "done" | "failed" | "skipped";
}

export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    mailboxId: uuid("mailbox_id").references(() => mailboxes.id, { onDelete: "set null" }),
    internetMessageId: text("internet_message_id").notNull(),
    /** sha256(workspace_id + ':' + lower(internetMessageId)) */
    sourceKey: text("source_key").notNull(),
    /** graph | gmail | simulator | seed | replay */
    source: text("source").notNull(),
    conversationId: text("conversation_id"),
    threadId: uuid("thread_id").references(() => emailThreads.id, { onDelete: "set null" }),
    direction: text("direction").notNull().default("inbound"),
    sender: text("sender").notNull(),
    senderName: text("sender_name"),
    toAddrs: textArray("to_addrs"),
    ccAddrs: textArray("cc_addrs"),
    subject: text("subject").notNull(),
    normalizedSubject: text("normalized_subject"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    hasAttachments: boolean("has_attachments").notNull().default(false),
    /** received | processing | processed | skipped | failed | shadow */
    status: text("status").notNull().default("received"),
    skipReason: text("skip_reason"),
    /** created_ticket | appended | reopened | new_linked_ticket | skipped */
    action: text("action"),
    /** token | headers | conversation | heuristic | none */
    matchMethod: text("match_method"),
    /** continuation | closure | new_issue | escalation | mixed */
    replyType: text("reply_type"),
    /** existing | created | unidentified */
    customerMatchMethod: text("customer_match_method"),
    customerFlags: textArray("customer_flags"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    ticketKey: text("ticket_key"),
    relatedTicketId: uuid("related_ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    category: text("category"),
    categoryConfidence: numeric("category_confidence", { precision: 4, scale: 3, mode: "number" }),
    priority: text("priority"),
    summary: text("summary"),
    aiReason: text("ai_reason"),
    escalated: boolean("escalated").notNull().default(false),
    escalationReason: text("escalation_reason"),
    originalTeam: text("original_team"),
    routedTeam: text("routed_team"),
    rerouted: boolean("rerouted").notNull().default(false),
    needsReview: boolean("needs_review").notNull().default(false),
    reviewReasons: textArray("review_reasons"),
    ackSent: boolean("ack_sent").notNull().default(false),
    stepTicket: boolean("step_ticket").notNull().default(false),
    stepAppended: boolean("step_appended").notNull().default(false),
    stepReopened: boolean("step_reopened").notNull().default(false),
    stepLinked: boolean("step_linked").notNull().default(false),
    stepAck: boolean("step_ack").notNull().default(false),
    timeline: jsonb("timeline").$type<TimelineStep[]>().notNull().default(sql`'[]'::jsonb`),
    configVersion: integer("config_version"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** transient | permanent | config | ai */
    errorClass: text("error_class"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("email_log_workspace_source_key_uq").on(t.workspaceId, t.sourceKey),
    index("email_log_workspace_received_idx").on(t.workspaceId, t.receivedAt),
    index("email_log_workspace_status_idx").on(t.workspaceId, t.status),
    index("email_log_needs_review_idx").on(t.workspaceId).where(sql`needs_review`),
  ],
);

export const messageIndex = pgTable(
  "message_index",
  {
    workspaceId: workspaceId(),
    internetMessageId: text("internet_message_id").notNull(),
    threadId: uuid("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.internetMessageId] })],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    emailLogId: uuid("email_log_id")
      .notNull()
      .references(() => emailLog.id, { onDelete: "cascade" }),
    /** classifier | context | summary */
    agentType: text("agent_type").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    promptVersion: text("prompt_version"),
    output: jsonb("output").$type<Record<string, unknown>>(),
    ok: boolean("ok").notNull(),
    error: text("error"),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6, mode: "number" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("agent_runs_email_idx").on(t.workspaceId, t.emailLogId),
    index("agent_runs_created_idx").on(t.workspaceId, t.createdAt),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    emailLogId: uuid("email_log_id")
      .notNull()
      .references(() => emailLog.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    reasons: textArray("reasons"),
    /** open | approved | overridden | dismissed */
    status: text("status").notNull().default("open"),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("reviews_email_uq").on(t.workspaceId, t.emailLogId),
    index("reviews_status_idx").on(t.workspaceId, t.status, t.createdAt),
  ],
);

export const overrides = pgTable(
  "overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    emailLogId: uuid("email_log_id")
      .notNull()
      .references(() => emailLog.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id").references(() => reviews.id, { onDelete: "set null" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** category | team | ticket_link | customer | split */
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("overrides_email_idx").on(t.workspaceId, t.emailLogId)],
);

export const insightReports = pgTable("insight_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: workspaceId(),
  title: text("title").notNull(),
  /** InsightReport (@mailnitio/config/packs) */
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
});
