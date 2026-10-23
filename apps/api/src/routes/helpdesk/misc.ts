import { and, desc, eq, inArray, isNull, schema, sql } from "@mailnitio/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import { access, type HelpdeskDeps, likePattern, READ_ROLES, workspaceTimezone } from "./common";

/** Usage, notifications, global search and the insight report. */
export const miscRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/v1/usage",
      {
        preHandler: access(deps.guard, READ_ROLES),
        schema: { querystring: z.object({ days: z.coerce.number().int().min(7).max(90).default(30) }) },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        return deps.appDb.withTenant(workspaceId, async (tx) => {
          const tz = await workspaceTimezone(tx, workspaceId);
          const start = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`;
          const days = (
            await tx.execute<{
              day: string;
              emails: number;
              tickets: number;
              acks: number;
              cost: number;
              tokens: number;
            }>(sql`
              select to_char(d at time zone ${tz}, 'YYYY-MM-DD') as day,
                (select count(*)::int from email_log e where e.received_at >= d and e.received_at < d + interval '1 day' and e.status in ('processed','shadow')) emails,
                (select count(*)::int from tickets t where t.created_at >= d and t.created_at < d + interval '1 day') tickets,
                (select count(*)::int from ticket_messages m where m.author_type = 'system' and m.direction = 'outbound' and m.created_at >= d and m.created_at < d + interval '1 day') acks,
                (select coalesce(sum(cost_usd), 0)::float from agent_runs r where r.created_at >= d and r.created_at < d + interval '1 day') cost,
                (select coalesce(sum(input_tokens + output_tokens), 0)::int from agent_runs r where r.created_at >= d and r.created_at < d + interval '1 day') tokens
              from generate_series(${start} - make_interval(days => ${request.query.days - 1}), ${start}, interval '1 day') d
              order by d`)
          ).rows;
          const [month] = (
            await tx.execute<{ emails: number; cost: number; tokens: number; runs: number }>(sql`
              select
                (select count(*)::int from email_log where status in ('processed','shadow') and received_at >= date_trunc('month', now() at time zone ${tz}) at time zone ${tz}) emails,
                (select coalesce(sum(cost_usd), 0)::float from agent_runs where created_at >= date_trunc('month', now() at time zone ${tz}) at time zone ${tz}) cost,
                (select coalesce(sum(input_tokens + output_tokens), 0)::int from agent_runs where created_at >= date_trunc('month', now() at time zone ${tz}) at time zone ${tz}) tokens,
                (select count(*)::int from agent_runs where created_at >= date_trunc('month', now() at time zone ${tz}) at time zone ${tz}) runs`)
          ).rows;
          const byModel = (
            await tx.execute<{ model: string; provider: string; runs: number; cost: number }>(sql`
              select model, provider, count(*)::int runs, coalesce(sum(cost_usd), 0)::float cost
              from agent_runs where created_at >= ${start} - make_interval(days => ${request.query.days - 1})
              group by model, provider order by cost desc`)
          ).rows;
          return { data: { timezone: tz, days, monthToDate: month, byModel } };
        });
      },
    );

    app.get("/v1/notifications", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const c = ctx(request);
      return deps.appDb.withTenant(c.workspaceId, async (tx) => {
        const rows = await tx
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, c.user.id))
          .orderBy(desc(schema.notifications.createdAt))
          .limit(30);
        const [unread] = (
          await tx.execute<{ n: number }>(
            sql`select count(*)::int n from notifications where user_id = ${c.user.id} and read_at is null`,
          )
        ).rows;
        return { data: rows, unread: unread?.n ?? 0 };
      });
    });

    app.post(
      "/v1/notifications/read",
      {
        preHandler: access(deps.guard, READ_ROLES),
        schema: { body: z.object({ ids: z.array(z.string().uuid()).max(100).optional() }) },
      },
      async (request) => {
        const c = ctx(request);
        await deps.appDb.withTenant(c.workspaceId, (tx) =>
          tx
            .update(schema.notifications)
            .set({ readAt: new Date() })
            .where(
              and(
                eq(schema.notifications.userId, c.user.id),
                isNull(schema.notifications.readAt),
                request.body.ids?.length ? inArray(schema.notifications.id, request.body.ids) : undefined,
              ),
            ),
        );
        return { data: { ok: true } };
      },
    );

    app.get(
      "/v1/search",
      {
        preHandler: access(deps.guard, READ_ROLES),
        schema: { querystring: z.object({ q: z.string().trim().min(2).max(120) }) },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const p = likePattern(request.query.q);
        return deps.appDb.withTenant(workspaceId, async (tx) => {
          const tickets = await tx
            .select({
              id: schema.tickets.id,
              key: schema.tickets.key,
              subject: schema.tickets.subject,
              status: schema.tickets.status,
            })
            .from(schema.tickets)
            .where(
              sql`${schema.tickets.mergedIntoId} is null and (${schema.tickets.key} ilike ${p} or ${schema.tickets.subject} ilike ${p})`,
            )
            .orderBy(desc(schema.tickets.updatedAt))
            .limit(6);
          const emails = await tx
            .select({
              id: schema.emailLog.id,
              subject: schema.emailLog.subject,
              sender: schema.emailLog.sender,
              receivedAt: schema.emailLog.receivedAt,
            })
            .from(schema.emailLog)
            .where(
              sql`${schema.emailLog.sender} ilike ${p} or ${schema.emailLog.senderName} ilike ${p} or ${schema.emailLog.subject} ilike ${p}`,
            )
            .orderBy(desc(schema.emailLog.receivedAt))
            .limit(6);
          const customers = await tx
            .select({ id: schema.customers.id, name: schema.customers.name, email: schema.customers.email })
            .from(schema.customers)
            .where(sql`${schema.customers.email} ilike ${p} or ${schema.customers.name} ilike ${p}`)
            .limit(6);
          return { data: { tickets, emails, customers } };
        });
      },
    );

    app.get("/v1/insights", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      const [report] = await deps.appDb.withTenant(workspaceId, (tx) =>
        tx.select().from(schema.insightReports).orderBy(desc(schema.insightReports.createdAt)).limit(1),
      );
      return { data: report ?? null };
    });
  };
