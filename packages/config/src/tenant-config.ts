import { z } from "zod";

/**
 * Tenant (workspace) configuration: what the AI pipeline needs to classify, route, thread and
 * acknowledge emails for one workspace. Stored versioned in `config_versions.config`, validated here.
 * See docs/specs/mailnitio-middleware-spec.md §8 (threading), §10.6 (PII), §11 (routing), §12 (ack).
 */

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

const key = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers and underscores");

export const categorySchema = z.object({
  key,
  label: z.string().min(2).max(60),
  description: z.string().min(5).max(400),
  /** Phrases and topics that indicate this category. */
  include: z.array(z.string().min(1).max(80)).max(30).default([]),
  /** Phrases that indicate a different category even if include signals match. */
  exclude: z.array(z.string().min(1).max(80)).max(30).default([]),
  /** Team key that owns this category. */
  team: key,
  defaultPriority: z.enum(PRIORITIES).default("medium"),
});
export type Category = z.infer<typeof categorySchema>;

export const thresholdsSchema = z
  .object({
    /** Confidence at or above which an email is routed without review. */
    high: z.number().min(0).max(1),
    /** Below this, the email goes to the mailbox default team for review. */
    low: z.number().min(0).max(1),
    /** Spam confidence at or above which the email is skipped. */
    spam: z.number().min(0).max(1),
    /** Context Agent confidence below which a thread decision goes to review. */
    context: z.number().min(0).max(1),
  })
  .refine((t) => t.low <= t.high, { message: "low must not exceed high", path: ["low"] });

export const ackTemplateSchema = z.object({
  subject: z.string().min(1).max(200),
  /** Variables: {{customer_first_name}} {{ticket_number}} {{team_name}} {{business_hours}} {{signature}} */
  body: z.string().min(1).max(4000),
});
export type AckTemplate = z.infer<typeof ackTemplateSchema>;

export const tenantConfigSchema = z
  .object({
    displayName: z.string().min(2).max(120),
    industry: z.string().min(2).max(60),
    categories: z.array(categorySchema).min(1).max(40),
    /** Category used when the AI fails or is not confident (mailbox default category). */
    defaultCategory: key,
    thresholds: thresholdsSchema,
    escalation: z.object({
      /** Terms that force escalation (regulators, legal, media). Matched case-insensitively on word boundaries. */
      terms: z.array(z.string().min(2).max(60)).max(60),
      team: key,
    }),
    threading: z.object({
      /** Regex that finds ticket keys in subjects and bodies, e.g. "MN-\\d+". */
      ticketPattern: z.string().min(2).max(120),
      /** A reply to a resolved ticket within this many days reopens it; later replies open a linked ticket. */
      reopenDays: z.number().int().min(0).max(365),
      /** Phrases that mark a reply as closing the conversation ("thanks, that's resolved"). */
      closurePhrases: z.array(z.string().min(2).max(80)).max(40),
    }),
    ack: z.object({
      enabled: z.boolean(),
      businessHours: z.string().max(200),
      signature: z.string().max(400),
      templates: z.object({ default: ackTemplateSchema }).catchall(ackTemplateSchema),
    }),
    pii: z.object({
      /** Extra regexes (customer ID formats) masked as [CUSTID] before any AI call. */
      customPatterns: z.array(z.string().min(2).max(200)).max(20).default([]),
    }),
    /** Sender domains of third parties (relationship managers, lawyers) writing on behalf of customers. */
    thirdPartyDomains: z.array(z.string().max(120)).max(100).default([]),
  })
  .superRefine((config, ctx) => {
    const keys = new Set<string>();
    for (const [index, category] of config.categories.entries()) {
      if (keys.has(category.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["categories", index, "key"],
          message: "Category keys must be unique",
        });
      }
      keys.add(category.key);
    }
    if (!keys.has(config.defaultCategory)) {
      ctx.addIssue({ code: "custom", path: ["defaultCategory"], message: "Must be one of the categories" });
    }
    try {
      new RegExp(config.threading.ticketPattern);
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["threading", "ticketPattern"],
        message: "Not a valid regular expression",
      });
    }
    for (const [index, pattern] of config.pii.customPatterns.entries()) {
      try {
        new RegExp(pattern);
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["pii", "customPatterns", index],
          message: "Not a valid regular expression",
        });
      }
    }
  });

export type TenantConfig = z.infer<typeof tenantConfigSchema>;

export function categoryByKey(config: TenantConfig, categoryKey: string): Category | undefined {
  return config.categories.find((c) => c.key === categoryKey);
}
