import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { workspaces } from "./workspace";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    /** user | api_key | system */
    actorType: text("actor_type").notNull().default("user"),
    /** Dotted event name, e.g. auth.sign_in, member.role_changed. */
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_workspace_created_idx").on(t.workspaceId, t.createdAt.desc(), t.id.desc())],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** e.g. helpdesk.email_processed, send.email_sent, llm.tokens */
    metric: text("metric").notNull(),
    quantity: bigint("quantity", { mode: "number" }).notNull().default(1),
    /** Idempotency key so retried steps never double-count. */
    sourceKey: text("source_key").unique(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_workspace_metric_idx").on(t.workspaceId, t.metric, t.occurredAt)],
);

/** Platform-wide flag definitions (global, not tenant data). */
export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
  defaultEnabled: boolean("default_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-workspace overrides of feature flags (tenant data). */
export const featureFlagOverrides = pgTable(
  "feature_flag_overrides",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    flagKey: text("flag_key")
      .notNull()
      .references(() => featureFlags.key, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.flagKey] })],
);

/** Book-a-demo requests from the marketing site (platform data, not tenant data). */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    workEmail: text("work_email").notNull(),
    company: text("company").notNull(),
    role: text("role").notNull(),
    country: text("country").notNull(),
    monthlyVolume: text("monthly_volume").notNull(),
    emailPlatform: text("email_platform").notNull(),
    crm: text("crm").notNull(),
    interest: text("interest"),
    message: text("message"),
    preferredSlot: timestamp("preferred_slot", { withTimezone: true }),
    source: text("source"),
    /** UTM parameters captured on the visitor's first page view. */
    utm: jsonb("utm").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    /** Sales pipeline: new → contacted → demo → poc → won | lost. */
    status: text("status").notNull().default("new"),
    /** Delivery flags so the notification job is idempotent across retries. */
    teamNotifiedAt: timestamp("team_notified_at", { withTimezone: true }),
    requesterNotifiedAt: timestamp("requester_notified_at", { withTimezone: true }),
    slackNotifiedAt: timestamp("slack_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  product: text("product"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
