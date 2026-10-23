import { and, desc, eq, type SQL, schema, sql } from "@mailnitio/db";
import { AppError } from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import {
  access,
  cursorOf,
  EMAIL_CHIPS,
  type HelpdeskDeps,
  idParams,
  likePattern,
  listQuery,
  page,
  READ_ROLES,
} from "./common";

const e = schema.emailLog;

/** The single status chip for an email, in precedence order. */
export const emailChip = sql<string>`case
  when ${e.status} = 'failed' then 'Failed'
  when ${e.status} = 'skipped' then 'Skipped'
  when ${e.status} = 'shadow' then 'Shadow'
  when ${e.status} in ('received','processing') then 'Processing'
  when ${e.escalated} then 'Escalated'
  when ${e.needsReview} then 'Needs Review'
  when ${e.rerouted} then 'Rerouted'
  else 'Processed' end`;

const chipCondition: Record<(typeof EMAIL_CHIPS)[number], SQL> = {
  Failed: sql`${e.status} = 'failed'`,
  Skipped: sql`${e.status} = 'skipped'`,
  Shadow: sql`${e.status} = 'shadow'`,
  Escalated: sql`${e.status} = 'processed' and ${e.escalated}`,
  "Needs Review": sql`${e.status} = 'processed' and not ${e.escalated} and ${e.needsReview}`,
  Rerouted: sql`${e.status} = 'processed' and not ${e.escalated} and not ${e.needsReview} and ${e.rerouted}`,
  Processed: sql`${e.status} = 'processed' and not ${e.escalated} and not ${e.needsReview} and not ${e.rerouted}`,
};

export const emailRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/v1/emails",
      {
        preHandler: access(deps.guard, READ_ROLES),
        schema: {
          querystring: listQuery.extend({
            chip: z.enum(EMAIL_CHIPS).optional(),
            category: z.string().max(40).optional(),
            team: z.string().max(40).optional(),
            mailboxId: z.string().uuid().optional(),
            messageId: z.string().max(300).optional(),
          }),
        },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const q = request.query;
        const cursor = cursorOf(q.cursor);
        const filters: SQL[] = [];
        if (q.chip) filters.push(chipCondition[q.chip]);
        if (q.category) filters.push(eq(e.category, q.category));
        if (q.team) filters.push(eq(e.routedTeam, q.team));
        if (q.mailboxId) filters.push(eq(e.mailboxId, q.mailboxId));
        if (q.messageId) filters.push(eq(e.internetMessageId, q.messageId));
        if (q.q) {
          const p = likePattern(q.q);
          filters.push(
            sql`(${e.sender} ilike ${p} or ${e.senderName} ilike ${p} or ${e.subject} ilike ${p} or ${e.ticketKey} ilike ${p})`,
          );
        }
        if (cursor) filters.push(sql`(${e.receivedAt}, ${e.id}) < (${cursor.createdAt}, ${cursor.id})`);

        const rows = await deps.appDb.withTenant(workspaceId, (tx) =>
          tx
            .select({
              id: e.id,
              receivedAt: e.receivedAt,
              sender: e.sender,
              senderName: e.senderName,
              subject: e.subject,
              chip: emailChip,
              status: e.status,
              action: e.action,
              category: e.category,
              confidence: e.categoryConfidence,
              routedTeam: e.routedTeam,
              originalTeam: e.originalTeam,
              teamName: schema.teams.name,
              ticketId: e.ticketId,
              ticketKey: e.ticketKey,
              mailbox: schema.mailboxes.address,
              skipReason: e.skipReason,
            })
            .from(e)
            .leftJoin(schema.mailboxes, eq(schema.mailboxes.id, e.mailboxId))
            .leftJoin(
              schema.teams,
              and(eq(schema.teams.workspaceId, e.workspaceId), eq(schema.teams.key, e.routedTeam)),
            )
            .where(filters.length ? and(...filters) : undefined)
            .orderBy(desc(e.receivedAt), desc(e.id))
            .limit(q.limit + 1),
        );
        return page(rows, q.limit, (r) => r.receivedAt);
      },
    );

    app.get(
      "/v1/emails/:id",
      { preHandler: access(deps.guard, READ_ROLES), schema: { params: idParams } },
      async (request) => {
        const { workspaceId } = ctx(request);
        return deps.appDb.withTenant(workspaceId, async (tx) => {
          const [email] = await tx
            .select({
              email: e,
              chip: emailChip,
              mailbox: schema.mailboxes.address,
              mailboxMode: schema.mailboxes.mode,
            })
            .from(e)
            .leftJoin(schema.mailboxes, eq(schema.mailboxes.id, e.mailboxId))
            .where(eq(e.id, request.params.id));
          if (!email) throw new AppError("not_found", "Email not found.");
          const log = email.email;

          const runs = await tx
            .select()
            .from(schema.agentRuns)
            .where(eq(schema.agentRuns.emailLogId, log.id))
            .orderBy(schema.agentRuns.createdAt);
          const [ticket] = log.ticketId
            ? await tx
                .select({
                  id: schema.tickets.id,
                  key: schema.tickets.key,
                  subject: schema.tickets.subject,
                  status: schema.tickets.status,
                  priority: schema.tickets.priority,
                  teamName: schema.teams.name,
                })
                .from(schema.tickets)
                .leftJoin(schema.teams, eq(schema.teams.id, schema.tickets.teamId))
                .where(eq(schema.tickets.id, log.ticketId))
            : [];
          const [related] = log.relatedTicketId
            ? await tx
                .select({ id: schema.tickets.id, key: schema.tickets.key })
                .from(schema.tickets)
                .where(eq(schema.tickets.id, log.relatedTicketId))
            : [];
          const [thread] = log.threadId
            ? await tx.select().from(schema.emailThreads).where(eq(schema.emailThreads.id, log.threadId))
            : [];
          const messages = log.ticketId
            ? await tx
                .select({
                  id: schema.ticketMessages.id,
                  direction: schema.ticketMessages.direction,
                  authorType: schema.ticketMessages.authorType,
                  fromAddr: schema.ticketMessages.fromAddr,
                  fromName: schema.ticketMessages.fromName,
                  bodyText: schema.ticketMessages.bodyText,
                  sentStatus: schema.ticketMessages.sentStatus,
                  emailLogId: schema.ticketMessages.emailLogId,
                  createdAt: schema.ticketMessages.createdAt,
                })
                .from(schema.ticketMessages)
                .where(eq(schema.ticketMessages.ticketId, log.ticketId))
                .orderBy(schema.ticketMessages.createdAt)
                .limit(50)
            : [];
          const [customer] = log.customerId
            ? await tx
                .select({
                  id: schema.customers.id,
                  name: schema.customers.name,
                  email: schema.customers.email,
                })
                .from(schema.customers)
                .where(eq(schema.customers.id, log.customerId))
            : [];
          const [review] = await tx
            .select()
            .from(schema.reviews)
            .where(eq(schema.reviews.emailLogId, log.id));
          const overrides = await tx
            .select({
              id: schema.overrides.id,
              field: schema.overrides.field,
              oldValue: schema.overrides.oldValue,
              newValue: schema.overrides.newValue,
              note: schema.overrides.note,
              createdAt: schema.overrides.createdAt,
              userName: schema.users.name,
            })
            .from(schema.overrides)
            .leftJoin(schema.users, eq(schema.users.id, schema.overrides.userId))
            .where(eq(schema.overrides.emailLogId, log.id))
            .orderBy(schema.overrides.createdAt);

          return {
            data: {
              ...log,
              chip: email.chip,
              mailbox: email.mailbox,
              mailboxMode: email.mailboxMode,
              agentRuns: runs.map((r) => ({
                id: r.id,
                agentType: r.agentType,
                model: r.model,
                provider: r.provider,
                ok: r.ok,
                error: r.error,
                latencyMs: r.latencyMs,
                inputTokens: r.inputTokens,
                outputTokens: r.outputTokens,
                costUsd: r.costUsd,
                output: r.output,
                createdAt: r.createdAt,
              })),
              ticket: ticket ?? null,
              relatedTicket: related ?? null,
              thread: thread
                ? { id: thread.id, rollingSummary: thread.rollingSummary, messageCount: thread.messageCount }
                : null,
              messages,
              customer: customer ?? null,
              review: review ?? null,
              overrides,
            },
          };
        });
      },
    );
  };
