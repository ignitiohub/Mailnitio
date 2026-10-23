import { tenantConfigSchema } from "@mailnitio/config";
import { generateSamples, industryPacks, type SampleEmail } from "@mailnitio/config/packs";
import { recordAudit } from "@mailnitio/core";
import { asc, eq, schema } from "@mailnitio/db";
import { PROCESS_EMAIL_QUEUE, type ProcessEmailJob } from "@mailnitio/middleware";
import { AppError } from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import { ADMIN_ROLES, access, actor, type HelpdeskDeps } from "./common";

/**
 * Email Simulator (staff/admin only). Injects an email into the same pipeline entry point the Graph
 * connector will use: a process-email job with source "simulator". Pack samples carry the decision a real
 * model would make; hand-written emails are classified by the stub agent's keyword rules.
 */

interface SimulatorSample {
  id: string;
  label: string;
  group: "New email" | "Follow-up on a ticket" | "Escalation" | "Filtered";
  from: string;
  fromName: string;
  mailbox: string;
  subject: string;
  body: string;
  needsTicket: boolean;
  sample: SampleEmail;
}

const cache = new Map<string, SimulatorSample[]>();

function samplesFor(industry: string): SimulatorSample[] {
  const pack =
    Object.values(industryPacks).find((p) => p.config.industry === industry) ?? industryPacks.generic;
  const cached = cache.get(pack.id);
  if (cached) return cached;
  const all = generateSamples(pack, { count: 500, seed: 7 });
  const picked: SimulatorSample[] = [];
  const seen = new Map<string, number>();
  for (const s of all) {
    const group: SimulatorSample["group"] = s.inReplyTo
      ? "Follow-up on a ticket"
      : s.classifier?.escalation.flag
        ? "Escalation"
        : s.headers?.["Auto-Submitted"] ||
            s.from.startsWith("mailer-daemon") ||
            s.classifier?.category === "spam"
          ? "Filtered"
          : "New email";
    const key = `${group}:${s.label}`;
    if ((seen.get(key) ?? 0) >= 2 || s.processingFails) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    picked.push({
      id: s.id,
      label: s.label,
      group,
      from: s.from,
      fromName: s.fromName,
      mailbox: s.mailbox,
      subject: s.subject.replace(/^RE:\s*/i, ""),
      body: s.body,
      needsTicket: Boolean(s.inReplyTo),
      sample: s,
    });
  }
  const order = { "New email": 0, Escalation: 1, "Follow-up on a ticket": 2, Filtered: 3 } as const;
  picked.sort((a, b) => order[a.group] - order[b.group] || a.label.localeCompare(b.label));
  cache.set(pack.id, picked);
  return picked;
}

const injectSchema = z.union([
  z.object({
    sampleId: z.string().min(1).max(20),
    mailboxId: z.string().uuid().optional(),
    replyToTicketKey: z.string().trim().max(30).optional(),
  }),
  z.object({
    mailboxId: z.string().uuid(),
    fromName: z.string().trim().min(2, "Enter the sender's name").max(120),
    fromEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
    subject: z.string().trim().min(2, "Enter a subject").max(300),
    body: z.string().trim().min(2, "Write the email").max(10_000),
    replyToTicketKey: z.string().trim().max(30).optional(),
  }),
]);

export const simulatorRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get("/v1/simulator/samples", { preHandler: access(deps.guard, ADMIN_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      const industry = await deps.appDb.withTenant(workspaceId, async (tx) => {
        const [active] = await tx
          .select({ config: schema.configVersions.config })
          .from(schema.configVersions)
          .where(eq(schema.configVersions.status, "active"));
        const parsed = tenantConfigSchema.safeParse(active?.config);
        if (!parsed.success)
          throw new AppError("conflict", "Load an industry pack before using the simulator.");
        return parsed.data.industry;
      });
      return {
        data: samplesFor(industry).map(({ sample: _s, ...rest }) => rest),
      };
    });

    app.post(
      "/v1/simulator/emails",
      { preHandler: access(deps.guard, ADMIN_ROLES), schema: { body: injectSchema } },
      async (request, reply) => {
        const { workspaceId } = ctx(request);
        const body = request.body;
        const internetMessageId = `<sim.${crypto.randomUUID()}@simulator.mailnitio.local>`;

        const job = await deps.appDb.withTenant(workspaceId, async (tx): Promise<ProcessEmailJob> => {
          const [active] = await tx
            .select({ config: schema.configVersions.config })
            .from(schema.configVersions)
            .where(eq(schema.configVersions.status, "active"));
          const config = tenantConfigSchema.safeParse(active?.config);
          if (!config.success)
            throw new AppError("conflict", "Load an industry pack before using the simulator.");
          const mailboxes = await tx.select().from(schema.mailboxes).orderBy(asc(schema.mailboxes.address));
          if (mailboxes.length === 0)
            throw new AppError("conflict", "Add a mailbox before using the simulator.");

          let ticket: { key: string; subject: string } | null = null;
          if (body.replyToTicketKey) {
            const [row] = await tx
              .select({ key: schema.tickets.key, subject: schema.tickets.subject })
              .from(schema.tickets)
              .where(eq(schema.tickets.key, body.replyToTicketKey.toUpperCase()));
            if (!row) throw new AppError("bad_request", `Ticket ${body.replyToTicketKey} was not found.`);
            ticket = row;
          }

          if ("sampleId" in body) {
            const sample = samplesFor(config.data.industry).find((s) => s.id === body.sampleId);
            if (!sample) throw new AppError("bad_request", "That sample does not exist.");
            if (sample.needsTicket && !ticket)
              throw new AppError("bad_request", "Choose the ticket this follow-up replies to.");
            const mailbox =
              mailboxes.find((m) => m.id === body.mailboxId) ??
              mailboxes.find((m) => m.address === sample.mailbox) ??
              mailboxes[0];
            if (!mailbox) throw new AppError("conflict", "No mailbox available.");
            return {
              workspaceId,
              mailboxId: mailbox.id,
              source: "simulator",
              message: {
                internetMessageId,
                from: sample.from,
                fromName: sample.fromName,
                to: [mailbox.address],
                cc: [],
                subject: ticket ? `RE: ${ticket.subject} [${ticket.key}]` : sample.sample.subject,
                body: sample.body,
                receivedAt: new Date().toISOString(),
                headers: sample.sample.headers ?? {},
              },
              precomputed: {
                classifier: sample.sample.classifier,
                context: ticket ? sample.sample.context : undefined,
                aiFails: sample.sample.aiFails,
              },
            };
          }

          const mailbox = mailboxes.find((m) => m.id === body.mailboxId);
          if (!mailbox) throw new AppError("bad_request", "That mailbox does not exist.");
          return {
            workspaceId,
            mailboxId: mailbox.id,
            source: "simulator",
            message: {
              internetMessageId,
              from: body.fromEmail,
              fromName: body.fromName,
              to: [mailbox.address],
              cc: [],
              subject: ticket ? `RE: ${body.subject} [${ticket.key}]` : body.subject,
              body: body.body,
              receivedAt: new Date().toISOString(),
              headers: {},
            },
          };
        });

        const jobId = await deps.queue.send(PROCESS_EMAIL_QUEUE, job, {
          singletonKey: `${workspaceId}:${internetMessageId}`,
        });
        await deps.appDb.withTenant(workspaceId, (tx) =>
          recordAudit(tx, {
            workspaceId,
            actorUserId: actor(request).userId,
            action: "simulator.email_injected",
            targetType: "email",
            targetId: internetMessageId,
            metadata: {
              subject: job.message.subject,
              from: job.message.from,
              sample: "sampleId" in body ? body.sampleId : null,
            },
          }),
        );
        return reply.status(202).send({ data: { jobId, internetMessageId } });
      },
    );
  };
