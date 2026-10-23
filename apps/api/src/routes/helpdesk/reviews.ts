import { and, desc, eq, type SQL, schema, sql } from "@mailnitio/db";
import { approveReview, overrideReview } from "@mailnitio/helpdesk";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import {
  access,
  actor,
  cursorOf,
  type HelpdeskDeps,
  idParams,
  listQuery,
  page,
  READ_ROLES,
  REVIEW_ROLES,
} from "./common";

const r = schema.reviews;
const e = schema.emailLog;

export const reviewRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/v1/reviews",
      {
        preHandler: access(deps.guard, READ_ROLES),
        schema: {
          querystring: listQuery.extend({
            status: z.enum(["open", "approved", "overridden", "dismissed"]).default("open"),
          }),
        },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const q = request.query;
        const cursor = cursorOf(q.cursor);
        const filters: SQL[] = [eq(r.status, q.status)];
        if (cursor) filters.push(sql`(${r.createdAt}, ${r.id}) < (${cursor.createdAt}, ${cursor.id})`);
        const rows = await deps.appDb.withTenant(workspaceId, (tx) =>
          tx
            .select({
              id: r.id,
              createdAt: r.createdAt,
              reasons: r.reasons,
              status: r.status,
              emailLogId: e.id,
              subject: e.subject,
              sender: e.sender,
              senderName: e.senderName,
              receivedAt: e.receivedAt,
              category: e.category,
              confidence: e.categoryConfidence,
              routedTeam: e.routedTeam,
              teamName: schema.teams.name,
              escalated: e.escalated,
              escalationReason: e.escalationReason,
              ticketId: r.ticketId,
              ticketKey: schema.tickets.key,
            })
            .from(r)
            .innerJoin(e, eq(e.id, r.emailLogId))
            .leftJoin(schema.tickets, eq(schema.tickets.id, r.ticketId))
            .leftJoin(
              schema.teams,
              and(eq(schema.teams.workspaceId, e.workspaceId), eq(schema.teams.key, e.routedTeam)),
            )
            .where(and(...filters))
            .orderBy(desc(r.createdAt), desc(r.id))
            .limit(q.limit + 1),
        );
        return page(rows, q.limit, (row) => row.createdAt);
      },
    );

    app.post(
      "/v1/reviews/:id/approve",
      { preHandler: access(deps.guard, REVIEW_ROLES), schema: { params: idParams } },
      async (request) => {
        const { workspaceId } = ctx(request);
        await deps.appDb.withTenant(workspaceId, (tx) =>
          approveReview(tx, workspaceId, request.params.id, actor(request)),
        );
        return { data: { status: "approved" } };
      },
    );

    app.post(
      "/v1/reviews/:id/override",
      {
        preHandler: access(deps.guard, REVIEW_ROLES),
        schema: {
          params: idParams,
          body: z
            .object({
              category: z.string().min(2).max(40).optional(),
              teamId: z.string().uuid().optional(),
              linkTicketKey: z.string().trim().min(3).max(30).optional(),
              customerId: z.string().uuid().optional(),
              split: z.boolean().optional(),
              note: z.string().trim().max(500).optional(),
            })
            .refine(
              (b) => b.category || b.teamId || b.linkTicketKey || b.customerId || b.split,
              "Choose what to change",
            ),
        },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const result = await deps.appDb.withTenant(workspaceId, (tx) =>
          overrideReview(tx, workspaceId, request.params.id, request.body, actor(request)),
        );
        return { data: result };
      },
    );
  };
