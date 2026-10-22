import { createSystemMailer } from "@mailnitio/core";
import { and, createDatabase, isNull, lt, schema } from "@mailnitio/db";
import { createLogger, initSentry } from "@mailnitio/observability";
import * as Sentry from "@sentry/node";
import { PgBoss } from "pg-boss";
import { z } from "zod";
import { notifyLead } from "./jobs/notify-lead";

/** Empty variables count as unset. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const env = z
  .object({
    APP_ENV: z.string().default("local"),
    DATABASE_URL: z.string().url(),
    LEADS_NOTIFY_EMAIL: z.string().email().default("sales@mailnitio.com"),
    SLACK_WEBHOOK_URL: optional(z.string().url()),
    SENTRY_DSN: optional(z.string().url()),
    LOG_LEVEL: z.string().default("info"),
  })
  .parse(process.env);

const LEAD_NOTIFY_QUEUE = "leads.notify";
const LEAD_SWEEP_QUEUE = "leads.sweep";
const HEARTBEAT_QUEUE = "system.heartbeat";

initSentry({
  dsn: env.SENTRY_DSN,
  service: "worker",
  environment: env.APP_ENV,
  release: process.env.RENDER_GIT_COMMIT,
});
const logger = createLogger("worker", { level: env.LOG_LEVEL });
const db = createDatabase(env.DATABASE_URL, { max: 5 });
const mailer = createSystemMailer(logger);

const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });
boss.on("error", (error) => {
  logger.error({ err: error }, "pg-boss error");
  Sentry.captureException(error);
});

await boss.start();
for (const name of [LEAD_NOTIFY_QUEUE, LEAD_SWEEP_QUEUE, HEARTBEAT_QUEUE]) {
  await boss.createQueue(name);
}

await boss.work<{ leadId: string }>(LEAD_NOTIFY_QUEUE, async (jobs) => {
  for (const job of jobs) {
    try {
      await notifyLead(
        { db, mailer, logger, teamEmail: env.LEADS_NOTIFY_EMAIL, slackWebhookUrl: env.SLACK_WEBHOOK_URL },
        job.data.leadId,
      );
    } catch (error) {
      logger.error({ err: error, leadId: job.data.leadId }, "lead notification failed; will retry");
      Sentry.captureException(error, { tags: { job: LEAD_NOTIFY_QUEUE } });
      throw error;
    }
  }
});

/** Safety net: re-enqueue leads whose notification never completed (e.g. the API failed to enqueue). */
await boss.work(LEAD_SWEEP_QUEUE, async () => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const pending = await db.withPlatform((tx) =>
    tx
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(and(isNull(schema.leads.requesterNotifiedAt), lt(schema.leads.createdAt, cutoff)))
      .limit(100),
  );
  for (const lead of pending) {
    await boss.send(
      LEAD_NOTIFY_QUEUE,
      { leadId: lead.id },
      { singletonKey: lead.id, retryLimit: 5, retryBackoff: true },
    );
  }
  if (pending.length > 0) logger.info({ count: pending.length }, "re-enqueued pending lead notifications");
});

await boss.work(HEARTBEAT_QUEUE, async () => {
  logger.debug("heartbeat");
});

await boss.schedule(LEAD_SWEEP_QUEUE, "*/15 * * * *");
await boss.schedule(HEARTBEAT_QUEUE, "*/5 * * * *");
logger.info("worker started");

const shutdown = async (signal: string) => {
  logger.info({ signal }, "shutting down");
  await boss.stop({ graceful: true, timeout: 20_000 });
  await db.close();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
