import { and, desc, eq, inArray, isNull, type SQL, schema, sql } from "@mailnitio/db";
import {
  addTicketMessage,
  linkTickets,
  mergeTickets,
  splitTicket,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  updateTicket,
} from "@mailnitio/helpdesk";
import { AppError } from "@mailnitio/shared";
import { alias } from "drizzle-orm/pg-core";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import {
  access,
  actor,
  cursorOf,
  type HelpdeskDeps,
  idParams,
  likePattern,
  listQuery,
  page,
  READ_ROLES,
  WORK_ROLES,
} from "./common";

const t = schema.tickets;
const OPEN = sql`${t.status} not in ('resolved','closed')`;
export const TICKET_VIEWS = ["mine", "unassigned", "team", "escalations", "needs_review", "all"] as const;

const patchSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    teamId: z.string().uuid().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nothing to update");

function viewCondition(
  view: (typeof TICKET_VIEWS)[number],
  userId: string,
  teamId?: string,
): SQL | undefined {
  switch (view) {
    case "mine":
      return and(eq(t.assigneeId, userId), OPEN);
    case "unassigned":
      return and(isNull(t.assigneeId), OPEN);
    case "team":
      return teamId
        ? and(eq(t.teamId, teamId), OPEN)
        : and(sql`${t.teamId} in (select team_id from team_members where user_id = ${userId})`, OPEN);
    case "escalations":
      return and(eq(t.escalated, true), OPEN);
    case "needs_review":
      return and(eq(t.needsReview, true), OPEN);
    case "all":
      return undefined;
  }
}

async function ticketByKeyOrId(
  tx: Parameters<Parameters<HelpdeskDeps["appDb"]["withTenant"]>[1]>[0],
  value: string,
) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(value);
  const [row] = await tx
    .select({ id: t.id, key: t.key })
    .from(t)
    .where(isUuid ? eq(t.id, value) : eq(t.key, value.trim().toUpperCase()));
  if (!row) throw new AppError("not_found", `Ticket ${value} was not found.`);
  return row;
}

export const ticketRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    const assignee = alias(schema.users, "assignee");

    app.get(
      "/v1/tickets",
      {
        preHandler: access(deps.guard, READ_ROLES),
        schema: {
          querystring: listQuery.extend({
            view: z.enum(TICKET_VIEWS).default("all"),
            status: z.enum(TICKET_STATUSES).optional(),
            priority: z.enum(TICKET_PRIORITIES).optional(),
            teamId: z.string().uuid().optional(),
            assigneeId: z.string().uuid().optional(),
            customerId: z.string().uuid().optional(),
          }),
        },
      },
      async (request) => {
        const c = ctx(request);
        const q = request.query;
        const cursor = cursorOf(q.cursor);
        const filters: SQL[] = [sql`${t.mergedIntoId} is null`];
        const view = viewCondition(q.view, c.user.id, q.view === "team" ? q.teamId : undefined);
        if (view) filters.push(view);
        if (q.status) filters.push(eq(t.status, q.status));
        if (q.priority) filters.push(eq(t.priority, q.priority));
        if (q.teamId && q.view !== "team") filters.push(eq(t.teamId, q.teamId));
        if (q.assigneeId) filters.push(eq(t.assigneeId, q.assigneeId));
        if (q.customerId) filters.push(eq(t.customerId, q.customerId));
        if (q.q) {
          const p = likePattern(q.q);
          filters.push(
            sql`(${t.key} ilike ${p} or ${t.subject} ilike ${p} or ${schema.customers.email} ilike ${p} or ${schema.customers.name} ilike ${p})`,
          );
        }
        if (cursor) filters.push(sql`(${t.updatedAt}, ${t.id}) < (${cursor.createdAt}, ${cursor.id})`);

        const rows = await deps.appDb.withTenant(c.workspaceId, (tx) =>
          tx
            .select({
              id: t.id,
              key: t.key,
              subject: t.subject,
              status: t.status,
              priority: t.priority,
              category: t.category,
              escalated: t.escalated,
              needsReview: t.needsReview,
              customerName: schema.customers.name,
              customerEmail: schema.customers.email,
              teamId: t.teamId,
              teamName: schema.teams.name,
              assigneeId: t.assigneeId,
              assigneeName: assignee.name,
              firstResponseDue: t.firstResponseDue,
              firstRespondedAt: t.firstRespondedAt,
              resolutionDue: t.resolutionDue,
              lastMessageAt: t.lastMessageAt,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            })
            .from(t)
            .leftJoin(schema.customers, eq(schema.customers.id, t.customerId))
            .leftJoin(schema.teams, eq(schema.teams.id, t.teamId))
            .leftJoin(assignee, eq(assignee.id, t.assigneeId))
            .where(and(...filters))
            .orderBy(desc(t.updatedAt), desc(t.id))
            .limit(q.limit + 1),
        );
        return page(rows, q.limit, (r) => r.updatedAt);
      },
    );

    app.get("/v1/tickets/counts", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const c = ctx(request);
      return deps.appDb.withTenant(c.workspaceId, async (tx) => {
        const [counts] = (
          await tx.execute<Record<string, number>>(sql`
            select
              count(*) filter (where assignee_id = ${c.user.id} and status not in ('resolved','closed'))::int mine,
              count(*) filter (where assignee_id is null and status not in ('resolved','closed'))::int unassigned,
              count(*) filter (where team_id in (select team_id from team_members where user_id = ${c.user.id}) and status not in ('resolved','closed'))::int team,
              count(*) filter (where escalated and status not in ('resolved','closed'))::int escalations,
              count(*) filter (where needs_review and status not in ('resolved','closed'))::int needs_review,
              count(*)::int "all"
            from tickets where merged_into_id is null`)
        ).rows;
        return { data: counts ?? {} };
      });
    });

    app.get(
      "/v1/tickets/:id",
      { preHandler: access(deps.guard, READ_ROLES), schema: { params: idParams } },
      async (request) => {
        const { workspaceId } = ctx(request);
        return deps.appDb.withTenant(workspaceId, async (tx) => {
          const [row] = await tx
            .select({
              ticket: t,
              teamName: schema.teams.name,
              assigneeName: assignee.name,
              mailbox: schema.mailboxes.address,
              mailboxMode: schema.mailboxes.mode,
            })
            .from(t)
            .leftJoin(schema.teams, eq(schema.teams.id, t.teamId))
            .leftJoin(assignee, eq(assignee.id, t.assigneeId))
            .leftJoin(schema.mailboxes, eq(schema.mailboxes.id, t.mailboxId))
            .where(eq(t.id, request.params.id));
          if (!row) throw new AppError("not_found", "Ticket not found.");
          const ticket = row.ticket;

          const messages = await tx
            .select({
              id: schema.ticketMessages.id,
              direction: schema.ticketMessages.direction,
              authorType: schema.ticketMessages.authorType,
              authorId: schema.ticketMessages.authorId,
              fromAddr: schema.ticketMessages.fromAddr,
              fromName: schema.ticketMessages.fromName,
              toAddrs: schema.ticketMessages.toAddrs,
              subject: schema.ticketMessages.subject,
              bodyText: schema.ticketMessages.bodyText,
              sentStatus: schema.ticketMessages.sentStatus,
              emailLogId: schema.ticketMessages.emailLogId,
              createdAt: schema.ticketMessages.createdAt,
            })
            .from(schema.ticketMessages)
            .where(eq(schema.ticketMessages.ticketId, ticket.id))
            .orderBy(schema.ticketMessages.createdAt);
          const actorUser = alias(schema.users, "actor");
          const events = await tx
            .select({
              id: schema.ticketEvents.id,
              type: schema.ticketEvents.type,
              actorType: schema.ticketEvents.actorType,
              actorName: actorUser.name,
              data: schema.ticketEvents.data,
              createdAt: schema.ticketEvents.createdAt,
            })
            .from(schema.ticketEvents)
            .leftJoin(actorUser, eq(actorUser.id, schema.ticketEvents.actorId))
            .where(eq(schema.ticketEvents.ticketId, ticket.id))
            .orderBy(schema.ticketEvents.createdAt);
          const [customer] = ticket.customerId
            ? await tx
                .select({
                  id: schema.customers.id,
                  name: schema.customers.name,
                  email: schema.customers.email,
                  phone: schema.customers.phone,
                  company: schema.customers.company,
                  createdAt: schema.customers.createdAt,
                  ticketCount: sql<number>`(select count(*)::int from tickets x where x.customer_id = ${schema.customers.id} and x.merged_into_id is null)`,
                  openCount: sql<number>`(select count(*)::int from tickets x where x.customer_id = ${schema.customers.id} and x.status not in ('resolved','closed') and x.merged_into_id is null)`,
                })
                .from(schema.customers)
                .where(eq(schema.customers.id, ticket.customerId))
            : [];
          const related = ticket.relatedTicketIds.length
            ? await tx
                .select({ id: t.id, key: t.key, subject: t.subject, status: t.status })
                .from(t)
                .where(inArray(t.id, ticket.relatedTicketIds))
            : [];
          const [ai] = await tx
            .select({
              emailLogId: schema.emailLog.id,
              category: schema.emailLog.category,
              confidence: schema.emailLog.categoryConfidence,
              aiReason: schema.emailLog.aiReason,
              replyType: schema.emailLog.replyType,
              rerouted: schema.emailLog.rerouted,
              originalTeam: schema.emailLog.originalTeam,
              matchMethod: schema.emailLog.matchMethod,
              customerMatchMethod: schema.emailLog.customerMatchMethod,
              model: sql<
                string | null
              >`(select model from agent_runs r where r.email_log_id = ${schema.emailLog.id} order by created_at desc limit 1)`,
              costUsd: sql<number>`(select coalesce(sum(cost_usd), 0)::float from agent_runs r where r.email_log_id = ${schema.emailLog.id})`,
            })
            .from(schema.emailLog)
            .where(and(eq(schema.emailLog.ticketId, ticket.id), sql`${schema.emailLog.category} is not null`))
            .orderBy(desc(schema.emailLog.receivedAt))
            .limit(1);
          const [review] = await tx
            .select({ id: schema.reviews.id, reasons: schema.reviews.reasons })
            .from(schema.reviews)
            .where(and(eq(schema.reviews.ticketId, ticket.id), eq(schema.reviews.status, "open")))
            .limit(1);
          const [mergedInto] = ticket.mergedIntoId
            ? await tx.select({ id: t.id, key: t.key }).from(t).where(eq(t.id, ticket.mergedIntoId))
            : [];

          return {
            data: {
              ...ticket,
              teamName: row.teamName,
              assigneeName: row.assigneeName,
              mailbox: row.mailbox,
              mailboxMode: row.mailboxMode,
              messages,
              events,
              customer: customer ?? null,
              related,
              // Tickets without a classified email (e.g. created by a split) fall back to their own AI fields.
              ai:
                ai ??
                (ticket.aiConfidence !== null || ticket.aiReason
                  ? {
                      emailLogId: null,
                      category: ticket.category,
                      confidence: ticket.aiConfidence,
                      aiReason: ticket.aiReason,
                      replyType: null,
                      rerouted: false,
                      originalTeam: null,
                      matchMethod: null,
                      customerMatchMethod: null,
                      model: null,
                      costUsd: 0,
                    }
                  : null),
              review: review ?? null,
              mergedInto: mergedInto ?? null,
            },
          };
        });
      },
    );

    app.patch(
      "/v1/tickets/:id",
      { preHandler: access(deps.guard, WORK_ROLES), schema: { params: idParams, body: patchSchema } },
      async (request) => {
        const { workspaceId } = ctx(request);
        const updated = await deps.appDb.withTenant(workspaceId, (tx) =>
          updateTicket(tx, workspaceId, request.params.id, request.body, actor(request)),
        );
        return { data: updated };
      },
    );

    app.post(
      "/v1/tickets/bulk",
      {
        preHandler: access(deps.guard, WORK_ROLES),
        schema: { body: z.object({ ids: z.array(z.string().uuid()).min(1).max(100), patch: patchSchema }) },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        await deps.appDb.withTenant(workspaceId, async (tx) => {
          for (const id of request.body.ids)
            await updateTicket(tx, workspaceId, id, request.body.patch, actor(request));
        });
        return { data: { updated: request.body.ids.length } };
      },
    );

    app.post(
      "/v1/tickets/:id/messages",
      {
        preHandler: access(deps.guard, WORK_ROLES),
        schema: {
          params: idParams,
          body: z.object({
            type: z.enum(["reply", "note"]),
            body: z.string().trim().min(1, "Write a message").max(20_000),
            mentions: z.array(z.string().uuid()).max(20).optional(),
            status: z.enum(TICKET_STATUSES).optional(),
          }),
        },
      },
      async (request, reply) => {
        const { workspaceId } = ctx(request);
        const message = await deps.appDb.withTenant(workspaceId, (tx) =>
          addTicketMessage(tx, workspaceId, request.params.id, request.body, actor(request)),
        );
        return reply.status(201).send({ data: message });
      },
    );

    app.post(
      "/v1/tickets/:id/merge",
      {
        preHandler: access(deps.guard, WORK_ROLES),
        schema: { params: idParams, body: z.object({ into: z.string().trim().min(1).max(60) }) },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const target = await deps.appDb.withTenant(workspaceId, async (tx) => {
          const into = await ticketByKeyOrId(tx, request.body.into);
          return mergeTickets(tx, workspaceId, request.params.id, into.id, actor(request));
        });
        return { data: { id: target.id, key: target.key } };
      },
    );

    app.post(
      "/v1/tickets/:id/split",
      {
        preHandler: access(deps.guard, WORK_ROLES),
        schema: {
          params: idParams,
          body: z.object({ messageIds: z.array(z.string().uuid()).min(1).max(50) }),
        },
      },
      async (request, reply) => {
        const { workspaceId } = ctx(request);
        const created = await deps.appDb.withTenant(workspaceId, (tx) =>
          splitTicket(tx, workspaceId, request.params.id, request.body.messageIds, actor(request)),
        );
        return reply.status(201).send({ data: { id: created.id, key: created.key } });
      },
    );

    app.post(
      "/v1/tickets/:id/link",
      {
        preHandler: access(deps.guard, WORK_ROLES),
        schema: { params: idParams, body: z.object({ with: z.string().trim().min(1).max(60) }) },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        await deps.appDb.withTenant(workspaceId, async (tx) => {
          const other = await ticketByKeyOrId(tx, request.body.with);
          await linkTickets(tx, workspaceId, request.params.id, other.id, actor(request));
        });
        return { data: { linked: true } };
      },
    );
  };
