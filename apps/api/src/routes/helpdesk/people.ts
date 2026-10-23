import { recordAudit } from "@mailnitio/core";
import { and, eq, schema, sql } from "@mailnitio/db";
import { AppError, WORKSPACE_ROLES } from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx } from "../../plugins/session";
import { ADMIN_ROLES, access, actor, type HelpdeskDeps, idParams, READ_ROLES } from "./common";

/** Users & Audit: pending invitations, role changes and removal (owners/admins). */
export const peopleRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get("/v1/workspace/invitations", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      const rows = await deps.appDb.withTenant(workspaceId, (tx) =>
        tx
          .select({
            id: schema.invitations.id,
            email: schema.invitations.email,
            role: schema.invitations.role,
            status: schema.invitations.status,
            expiresAt: schema.invitations.expiresAt,
            createdAt: schema.invitations.createdAt,
            inviterName: schema.users.name,
          })
          .from(schema.invitations)
          .leftJoin(schema.users, eq(schema.users.id, schema.invitations.inviterId))
          .where(sql`${schema.invitations.status} = 'pending' and ${schema.invitations.expiresAt} > now()`),
      );
      return { data: rows };
    });

    app.patch(
      "/v1/workspace/members/:id",
      {
        preHandler: access(deps.guard, ADMIN_ROLES),
        schema: { params: idParams, body: z.object({ role: z.enum(WORKSPACE_ROLES) }) },
      },
      async (request) => {
        const c = ctx(request);
        const updated = await deps.appDb.withTenant(c.workspaceId, async (tx) => {
          const [member] = await tx
            .select()
            .from(schema.members)
            .where(eq(schema.members.id, request.params.id));
          if (!member) throw new AppError("not_found", "Member not found.");
          if (member.userId === c.user.id)
            throw new AppError("forbidden", "You cannot change your own role.");
          if ((request.body.role === "owner" || member.role === "owner") && c.role !== "owner") {
            throw new AppError("forbidden", "Only an owner can grant or change the owner role.");
          }
          if (member.role === "owner" && request.body.role !== "owner") {
            const [owners] = (
              await tx.execute<{ n: number }>(sql`select count(*)::int n from members where role = 'owner'`)
            ).rows;
            if ((owners?.n ?? 0) <= 1)
              throw new AppError("conflict", "A workspace must keep at least one owner.");
          }
          const [row] = await tx
            .update(schema.members)
            .set({ role: request.body.role })
            .where(eq(schema.members.id, member.id))
            .returning();
          await recordAudit(tx, {
            workspaceId: c.workspaceId,
            actorUserId: actor(request).userId,
            action: "member.role_changed",
            targetType: "member",
            targetId: member.id,
            ipAddress: request.ip,
            metadata: { userId: member.userId, from: member.role, to: request.body.role },
          });
          return row;
        });
        return { data: updated };
      },
    );

    app.delete(
      "/v1/workspace/members/:id",
      { preHandler: access(deps.guard, ADMIN_ROLES), schema: { params: idParams } },
      async (request, reply) => {
        const c = ctx(request);
        await deps.appDb.withTenant(c.workspaceId, async (tx) => {
          const [member] = await tx
            .select()
            .from(schema.members)
            .where(eq(schema.members.id, request.params.id));
          if (!member) throw new AppError("not_found", "Member not found.");
          if (member.userId === c.user.id) throw new AppError("forbidden", "You cannot remove yourself.");
          if (member.role === "owner" && c.role !== "owner")
            throw new AppError("forbidden", "Only an owner can remove an owner.");
          await tx.delete(schema.teamMembers).where(eq(schema.teamMembers.userId, member.userId));
          await tx
            .update(schema.tickets)
            .set({ assigneeId: null })
            .where(
              and(
                eq(schema.tickets.assigneeId, member.userId),
                sql`${schema.tickets.status} not in ('resolved','closed')`,
              ),
            );
          await tx.delete(schema.members).where(eq(schema.members.id, member.id));
          await recordAudit(tx, {
            workspaceId: c.workspaceId,
            actorUserId: actor(request).userId,
            action: "member.removed",
            targetType: "member",
            targetId: member.id,
            ipAddress: request.ip,
            metadata: { userId: member.userId, role: member.role },
          });
        });
        return reply.status(204).send();
      },
    );
  };
