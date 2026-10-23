import { desc, eq, type SQL, schema, sql } from "@mailnitio/db";
import { AppError } from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ctx } from "../../plugins/session";
import {
  access,
  cursorOf,
  type HelpdeskDeps,
  idParams,
  likePattern,
  listQuery,
  page,
  READ_ROLES,
} from "./common";

const c = schema.customers;
const lastContact = sql<Date | null>`(select max(t.last_message_at) from tickets t where t.customer_id = ${c.id})`;

export const customerRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/v1/customers",
      { preHandler: access(deps.guard, READ_ROLES), schema: { querystring: listQuery } },
      async (request) => {
        const { workspaceId } = ctx(request);
        const q = request.query;
        const cursor = cursorOf(q.cursor);
        const filters: SQL[] = [];
        if (q.q) {
          const p = likePattern(q.q);
          filters.push(sql`(${c.email} ilike ${p} or ${c.name} ilike ${p} or ${c.company} ilike ${p})`);
        }
        if (cursor) filters.push(sql`(${c.updatedAt}, ${c.id}) < (${cursor.createdAt}, ${cursor.id})`);
        const rows = await deps.appDb.withTenant(workspaceId, (tx) =>
          tx
            .select({
              id: c.id,
              name: c.name,
              email: c.email,
              company: c.company,
              phone: c.phone,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              ticketCount: sql<number>`(select count(*)::int from tickets t where t.customer_id = ${c.id} and t.merged_into_id is null)`,
              openCount: sql<number>`(select count(*)::int from tickets t where t.customer_id = ${c.id} and t.status not in ('resolved','closed') and t.merged_into_id is null)`,
              lastContactAt: lastContact,
            })
            .from(c)
            .where(filters.length ? sql.join(filters, sql` and `) : undefined)
            .orderBy(desc(c.updatedAt), desc(c.id))
            .limit(q.limit + 1),
        );
        return page(rows, q.limit, (row) => row.updatedAt);
      },
    );

    app.get(
      "/v1/customers/:id",
      { preHandler: access(deps.guard, READ_ROLES), schema: { params: idParams } },
      async (request) => {
        const { workspaceId } = ctx(request);
        return deps.appDb.withTenant(workspaceId, async (tx) => {
          const [customer] = await tx.select().from(c).where(eq(c.id, request.params.id));
          if (!customer) throw new AppError("not_found", "Customer not found.");
          const aliases = await tx
            .select({ email: schema.customerEmails.email })
            .from(schema.customerEmails)
            .where(eq(schema.customerEmails.customerId, customer.id));
          const tickets = await tx
            .select({
              id: schema.tickets.id,
              key: schema.tickets.key,
              subject: schema.tickets.subject,
              status: schema.tickets.status,
              priority: schema.tickets.priority,
              category: schema.tickets.category,
              teamName: schema.teams.name,
              createdAt: schema.tickets.createdAt,
              updatedAt: schema.tickets.updatedAt,
            })
            .from(schema.tickets)
            .leftJoin(schema.teams, eq(schema.teams.id, schema.tickets.teamId))
            .where(
              sql`${schema.tickets.customerId} = ${customer.id} and ${schema.tickets.mergedIntoId} is null`,
            )
            .orderBy(desc(schema.tickets.createdAt))
            .limit(100);
          const [stats] = (
            await tx.execute<{ emails: number; first_at: string | null }>(
              sql`select count(*)::int emails, min(received_at) first_at from email_log where customer_id = ${customer.id}`,
            )
          ).rows;
          return {
            data: {
              ...customer,
              aliases: aliases.map((a) => a.email),
              tickets,
              emailCount: stats?.emails ?? 0,
              firstContactAt: stats?.first_at ?? null,
            },
          };
        });
      },
    );
  };
