import { categorySchema, tenantConfigSchema, thresholdsSchema } from "@mailnitio/config";
import { recordAudit } from "@mailnitio/core";
import { and, asc, desc, eq, inArray, schema, sql, type Tx } from "@mailnitio/db";
import { AppError } from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import {
  ADMIN_ROLES,
  access,
  actor,
  type HelpdeskDeps,
  idParams,
  MANAGE_ROLES,
  READ_ROLES,
  workspaceTimezone,
} from "./common";

async function activeConfigRow(tx: Tx) {
  const [row] = await tx
    .select()
    .from(schema.configVersions)
    .where(eq(schema.configVersions.status, "active"));
  if (!row)
    throw new AppError("not_found", "This workspace has no configuration yet. Load an industry pack first.");
  return row;
}

function teamKey(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "team"
  );
}

export const setupRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    // ---------------------------------------------------------------- mailboxes
    app.get("/v1/mailboxes", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      return deps.appDb.withTenant(workspaceId, async (tx) => {
        const tz = await workspaceTimezone(tx, workspaceId);
        const rows = (
          await tx.execute<Record<string, unknown>>(sql`
            select m.id, m.address, m.display_name "displayName", m.default_category "defaultCategory", m.mode,
                   m.ack_enabled "ackEnabled", m.health, m.last_checked_at "lastCheckedAt",
                   max(e.received_at) "lastReceivedAt",
                   count(e.id) filter (where e.received_at >= (date_trunc('day', now() at time zone ${tz}) at time zone ${tz}))::int "processedToday",
                   count(e.id) filter (where e.received_at >= now() - interval '7 days')::int "processed7d",
                   count(e.id) filter (where e.status = 'failed' and e.received_at >= now() - interval '7 days')::int "failed7d"
            from mailboxes m left join email_log e on e.mailbox_id = m.id
            group by m.id order by m.address`)
        ).rows;
        return { data: rows };
      });
    });

    app.patch(
      "/v1/mailboxes/:id",
      {
        preHandler: access(deps.guard, ADMIN_ROLES),
        schema: {
          params: idParams,
          body: z
            .object({
              mode: z.enum(["live", "shadow", "paused"]).optional(),
              ackEnabled: z.boolean().optional(),
              defaultCategory: z.string().min(2).max(40).optional(),
              displayName: z.string().trim().min(2).max(80).optional(),
            })
            .refine((b) => Object.keys(b).length > 0, "Nothing to update"),
        },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const updated = await deps.appDb.withTenant(workspaceId, async (tx) => {
          const [before] = await tx
            .select()
            .from(schema.mailboxes)
            .where(eq(schema.mailboxes.id, request.params.id));
          if (!before) throw new AppError("not_found", "Mailbox not found.");
          if (request.body.defaultCategory) {
            const config = tenantConfigSchema.parse((await activeConfigRow(tx)).config);
            if (!config.categories.some((c) => c.key === request.body.defaultCategory)) {
              throw new AppError("bad_request", "That category does not exist.");
            }
          }
          const [row] = await tx
            .update(schema.mailboxes)
            .set(request.body)
            .where(eq(schema.mailboxes.id, before.id))
            .returning();
          await recordAudit(tx, {
            workspaceId,
            actorUserId: actor(request).userId,
            action: "mailbox.updated",
            targetType: "mailbox",
            targetId: before.id,
            ipAddress: request.ip,
            metadata: {
              address: before.address,
              changes: Object.fromEntries(
                Object.entries(request.body).map(([k, v]) => [
                  k,
                  { from: (before as Record<string, unknown>)[k], to: v },
                ]),
              ),
            },
          });
          return row;
        });
        return { data: updated };
      },
    );

    app.post(
      "/v1/mailboxes/:id/test",
      { preHandler: access(deps.guard, ADMIN_ROLES), schema: { params: idParams } },
      async (request) => {
        const { workspaceId } = ctx(request);
        return deps.appDb.withTenant(workspaceId, async (tx) => {
          const now = new Date();
          const [row] = await tx
            .update(schema.mailboxes)
            .set({ lastCheckedAt: now, health: "ok" })
            .where(eq(schema.mailboxes.id, request.params.id))
            .returning({ address: schema.mailboxes.address, mode: schema.mailboxes.mode });
          if (!row) throw new AppError("not_found", "Mailbox not found.");
          // D2 has no live connection: the check confirms the mailbox record and pipeline, not Microsoft Graph.
          return {
            data: {
              ok: true,
              checkedAt: now,
              detail: `Pipeline ready for ${row.address}. Live Microsoft 365 connection checks arrive with mailbox connection (D3).`,
            },
          };
        });
      },
    );

    // ---------------------------------------------------------------- teams
    app.get("/v1/teams", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      return deps.appDb.withTenant(workspaceId, async (tx) => {
        const teams = await tx.select().from(schema.teams).orderBy(asc(schema.teams.name));
        const members = await tx
          .select({
            teamId: schema.teamMembers.teamId,
            userId: schema.teamMembers.userId,
            role: schema.teamMembers.role,
            name: schema.users.name,
          })
          .from(schema.teamMembers)
          .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId));
        const counts = (
          await tx.execute<{ team_id: string; open: number }>(
            sql`select team_id, count(*)::int open from tickets where status not in ('resolved','closed') and merged_into_id is null group by team_id`,
          )
        ).rows;
        const [active] = await tx
          .select({ config: schema.configVersions.config })
          .from(schema.configVersions)
          .where(eq(schema.configVersions.status, "active"));
        const config = tenantConfigSchema.safeParse(active?.config);
        return {
          data: teams.map((team) => ({
            ...team,
            members: members.filter((m) => m.teamId === team.id).map(({ teamId: _t, ...m }) => m),
            openTickets: counts.find((c) => c.team_id === team.id)?.open ?? 0,
            categories: config.success
              ? config.data.categories
                  .filter((c) => c.team === team.key)
                  .map((c) => ({ key: c.key, label: c.label }))
              : [],
            isEscalationTeam: config.success && config.data.escalation.team === team.key,
          })),
        };
      });
    });

    const teamBody = z.object({
      name: z.string().trim().min(2, "Enter a team name").max(60),
      emailAlias: z.string().trim().email("Enter a valid email address").max(254).nullable().optional(),
      autoAssign: z.enum(["none", "round_robin"]).optional(),
    });

    app.post(
      "/v1/teams",
      { preHandler: access(deps.guard, ADMIN_ROLES), schema: { body: teamBody } },
      async (request, reply) => {
        const { workspaceId } = ctx(request);
        const team = await deps.appDb.withTenant(workspaceId, async (tx) => {
          const key = teamKey(request.body.name);
          const [existing] = await tx
            .select({ id: schema.teams.id })
            .from(schema.teams)
            .where(eq(schema.teams.key, key));
          if (existing) throw new AppError("conflict", "A team with this name already exists.");
          const [row] = await tx
            .insert(schema.teams)
            .values({ workspaceId, key, ...request.body })
            .returning();
          await recordAudit(tx, {
            workspaceId,
            actorUserId: actor(request).userId,
            action: "team.created",
            targetType: "team",
            targetId: row?.id,
            metadata: { name: request.body.name },
          });
          return row;
        });
        return reply.status(201).send({ data: team });
      },
    );

    app.patch(
      "/v1/teams/:id",
      { preHandler: access(deps.guard, ADMIN_ROLES), schema: { params: idParams, body: teamBody.partial() } },
      async (request) => {
        const { workspaceId } = ctx(request);
        const team = await deps.appDb.withTenant(workspaceId, async (tx) => {
          const [row] = await tx
            .update(schema.teams)
            .set(request.body)
            .where(eq(schema.teams.id, request.params.id))
            .returning();
          if (!row) throw new AppError("not_found", "Team not found.");
          await recordAudit(tx, {
            workspaceId,
            actorUserId: actor(request).userId,
            action: "team.updated",
            targetType: "team",
            targetId: row.id,
            metadata: request.body,
          });
          return row;
        });
        return { data: team };
      },
    );

    app.put(
      "/v1/teams/:id/members",
      {
        preHandler: access(deps.guard, MANAGE_ROLES),
        schema: { params: idParams, body: z.object({ userIds: z.array(z.string().uuid()).max(200) }) },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        await deps.appDb.withTenant(workspaceId, async (tx) => {
          const [team] = await tx
            .select({ id: schema.teams.id, name: schema.teams.name })
            .from(schema.teams)
            .where(eq(schema.teams.id, request.params.id));
          if (!team) throw new AppError("not_found", "Team not found.");
          const ids = [...new Set(request.body.userIds)];
          if (ids.length) {
            const valid = await tx
              .select({ userId: schema.members.userId })
              .from(schema.members)
              .where(inArray(schema.members.userId, ids));
            if (valid.length !== ids.length)
              throw new AppError("bad_request", "Some people are not members of this workspace.");
          }
          await tx.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, team.id));
          if (ids.length)
            await tx
              .insert(schema.teamMembers)
              .values(ids.map((userId) => ({ workspaceId, teamId: team.id, userId })));
          await recordAudit(tx, {
            workspaceId,
            actorUserId: actor(request).userId,
            action: "team.members_updated",
            targetType: "team",
            targetId: team.id,
            metadata: { team: team.name, members: ids.length },
          });
        });
        return { data: { updated: true } };
      },
    );

    // ---------------------------------------------------------------- configuration (versioned)
    app.get("/v1/config", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      return deps.appDb.withTenant(workspaceId, async (tx) => {
        const active = await activeConfigRow(tx);
        const versions = await tx
          .select({
            id: schema.configVersions.id,
            version: schema.configVersions.version,
            status: schema.configVersions.status,
            notes: schema.configVersions.notes,
            createdAt: schema.configVersions.createdAt,
            createdByName: schema.users.name,
          })
          .from(schema.configVersions)
          .leftJoin(schema.users, eq(schema.users.id, schema.configVersions.createdBy))
          .orderBy(desc(schema.configVersions.version))
          .limit(20);
        return {
          data: { version: active.version, config: tenantConfigSchema.parse(active.config), versions },
        };
      });
    });

    app.patch(
      "/v1/config",
      {
        preHandler: access(deps.guard, ADMIN_ROLES),
        schema: {
          body: z
            .object({
              categories: z.array(categorySchema).min(1).max(40).optional(),
              defaultCategory: z.string().min(2).max(40).optional(),
              thresholds: thresholdsSchema.optional(),
              escalation: z
                .object({
                  terms: z.array(z.string().trim().min(2).max(60)).max(60),
                  team: z.string().min(2).max(40),
                })
                .optional(),
              notes: z.string().trim().max(200).optional(),
            })
            .refine(
              (b) => b.categories || b.defaultCategory || b.thresholds || b.escalation,
              "Nothing to update",
            ),
        },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const result = await deps.appDb.withTenant(workspaceId, async (tx) => {
          const active = await activeConfigRow(tx);
          const current = tenantConfigSchema.parse(active.config);
          const { notes, ...changes } = request.body;
          const parsed = tenantConfigSchema.safeParse({ ...current, ...changes });
          if (!parsed.success) {
            throw new AppError(
              "validation_failed",
              "The configuration is not valid.",
              parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
            );
          }
          const teamKeys = new Set(
            (await tx.select({ key: schema.teams.key }).from(schema.teams)).map((t) => t.key),
          );
          const unknown = [...parsed.data.categories.map((c) => c.team), parsed.data.escalation.team].filter(
            (k) => !teamKeys.has(k),
          );
          if (unknown.length)
            throw new AppError("bad_request", `Unknown team: ${[...new Set(unknown)].join(", ")}`);

          await tx
            .update(schema.configVersions)
            .set({ status: "archived" })
            .where(eq(schema.configVersions.id, active.id));
          const [row] = await tx
            .insert(schema.configVersions)
            .values({
              workspaceId,
              version: active.version + 1,
              status: "active",
              config: parsed.data as unknown as Record<string, unknown>,
              notes: notes ?? `Updated ${Object.keys(changes).join(", ")}`,
              createdBy: actor(request).userId,
              activatedAt: new Date(),
            })
            .returning({ version: schema.configVersions.version });
          await recordAudit(tx, {
            workspaceId,
            actorUserId: actor(request).userId,
            action: "config.updated",
            targetType: "config",
            targetId: String(row?.version),
            ipAddress: request.ip,
            metadata: { from: active.version, to: row?.version, sections: Object.keys(changes) },
          });
          return { version: row?.version, config: parsed.data };
        });
        return { data: result };
      },
    );

    // ---------------------------------------------------------------- canned responses
    app.get("/v1/canned-responses", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      const rows = await deps.appDb.withTenant(workspaceId, (tx) =>
        tx
          .select({
            id: schema.cannedResponses.id,
            title: schema.cannedResponses.title,
            body: schema.cannedResponses.body,
            teamId: schema.cannedResponses.teamId,
            teamName: schema.teams.name,
            createdAt: schema.cannedResponses.createdAt,
          })
          .from(schema.cannedResponses)
          .leftJoin(schema.teams, eq(schema.teams.id, schema.cannedResponses.teamId))
          .orderBy(asc(schema.cannedResponses.title)),
      );
      return { data: rows };
    });

    const cannedBody = z.object({
      title: z.string().trim().min(2, "Enter a title").max(80),
      body: z.string().trim().min(2, "Write the response").max(5000),
      teamId: z.string().uuid().nullable().optional(),
    });

    app.post(
      "/v1/canned-responses",
      { preHandler: access(deps.guard, MANAGE_ROLES), schema: { body: cannedBody } },
      async (request, reply) => {
        const { workspaceId } = ctx(request);
        const [row] = await deps.appDb.withTenant(workspaceId, (tx) =>
          tx
            .insert(schema.cannedResponses)
            .values({ workspaceId, ...request.body, createdBy: actor(request).userId })
            .returning(),
        );
        return reply.status(201).send({ data: row });
      },
    );

    app.patch(
      "/v1/canned-responses/:id",
      {
        preHandler: access(deps.guard, MANAGE_ROLES),
        schema: { params: idParams, body: cannedBody.partial() },
      },
      async (request) => {
        const { workspaceId } = ctx(request);
        const [row] = await deps.appDb.withTenant(workspaceId, (tx) =>
          tx
            .update(schema.cannedResponses)
            .set(request.body)
            .where(eq(schema.cannedResponses.id, request.params.id))
            .returning(),
        );
        if (!row) throw new AppError("not_found", "Canned response not found.");
        return { data: row };
      },
    );

    app.delete(
      "/v1/canned-responses/:id",
      { preHandler: access(deps.guard, MANAGE_ROLES), schema: { params: idParams } },
      async (request, reply) => {
        const { workspaceId } = ctx(request);
        const rows = await deps.appDb.withTenant(workspaceId, (tx) =>
          tx
            .delete(schema.cannedResponses)
            .where(and(eq(schema.cannedResponses.id, request.params.id)))
            .returning({ id: schema.cannedResponses.id }),
        );
        if (rows.length === 0) throw new AppError("not_found", "Canned response not found.");
        return reply.status(204).send();
      },
    );
  };
