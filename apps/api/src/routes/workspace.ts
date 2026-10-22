import { completeOnboarding, getWorkspace, recordAudit, updateWorkspaceDetails } from "@mailnitio/core";
import { and, type DatabaseHandle, desc, eq, lt, or, schema } from "@mailnitio/db";
import {
  AppError,
  cursorQuerySchema,
  decodeCursor,
  encodeCursor,
  isWorkspaceRole,
  MFA_REQUIRED_ROLES,
  pageSchema,
  WORKSPACE_ROLES,
} from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ctx, type WorkspaceGuard } from "../plugins/session";

const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  country: z.string().nullable(),
  industry: z.string().nullable(),
  timezone: z.string(),
  productInterest: z.enum(["helpdesk", "send", "both"]).nullable(),
  onboardedAt: z.string().nullable(),
  createdAt: z.string(),
});

type WorkspaceRow = NonNullable<Awaited<ReturnType<typeof getWorkspace>>>;

function toWorkspaceDto(row: WorkspaceRow): z.infer<typeof workspaceSchema> {
  const interest = row.productInterest;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    industry: row.industry,
    timezone: row.timezone,
    productInterest: interest === "helpdesk" || interest === "send" || interest === "both" ? interest : null,
    onboardedAt: row.onboardedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const memberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(WORKSPACE_ROLES),
  twoFactorEnabled: z.boolean(),
  joinedAt: z.string(),
});

const auditEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const workspaceRoutes =
  (deps: { appDb: DatabaseHandle; guard: WorkspaceGuard }): FastifyPluginAsyncZod =>
  async (app) => {
    const { guard } = deps;

    /** Who am I, in which workspace, and is MFA still required. Allowed before MFA so the app can redirect. */
    app.get(
      "/v1/me",
      {
        preHandler: guard.requireSession,
        schema: {
          response: {
            200: z.object({
              data: z.object({
                user: z.object({
                  id: z.string(),
                  name: z.string(),
                  email: z.string(),
                  twoFactorEnabled: z.boolean(),
                }),
                role: z.enum(WORKSPACE_ROLES),
                mfaRequired: z.boolean(),
                mfaRequiredForRole: z.boolean(),
                workspace: workspaceSchema,
              }),
            }),
          },
        },
      },
      async (request) => {
        const c = ctx(request);
        const workspace = await deps.appDb.withTenant(c.workspaceId, (tx) => getWorkspace(tx, c.workspaceId));
        if (!workspace) throw new AppError("not_found", "Workspace not found.");
        return {
          data: {
            user: c.user,
            role: c.role,
            mfaRequired: c.mfaRequired,
            mfaRequiredForRole: MFA_REQUIRED_ROLES.includes(c.role),
            workspace: toWorkspaceDto(workspace),
          },
        };
      },
    );

    app.patch(
      "/v1/workspace",
      {
        preHandler: [guard.requireWorkspace, guard.requireRole("owner", "admin")],
        schema: {
          body: z.object({
            name: z.string().trim().min(2, "Enter a workspace name").max(80).optional(),
            country: z.string().trim().min(2).max(60).optional(),
            industry: z.string().trim().min(2).max(60).optional(),
            timezone: z
              .string()
              .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Choose a valid timezone")
              .optional(),
          }),
          response: { 200: z.object({ data: workspaceSchema }) },
        },
      },
      async (request) => {
        const c = ctx(request);
        const workspace = await deps.appDb.withTenant(c.workspaceId, async (tx) => {
          const updated = await updateWorkspaceDetails(tx, c.workspaceId, request.body);
          await recordAudit(tx, {
            workspaceId: c.workspaceId,
            actorUserId: c.user.id,
            action: "workspace.updated",
            targetType: "workspace",
            targetId: c.workspaceId,
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"] ?? null,
            metadata: { fields: Object.keys(request.body) },
          });
          return updated;
        });
        if (!workspace) throw new AppError("not_found", "Workspace not found.");
        return { data: toWorkspaceDto(workspace) };
      },
    );

    app.post(
      "/v1/workspace/onboarding",
      {
        preHandler: [guard.requireWorkspace, guard.requireRole("owner", "admin")],
        schema: {
          body: z.object({ productInterest: z.enum(["helpdesk", "send", "both"]) }),
          response: { 200: z.object({ data: workspaceSchema }) },
        },
      },
      async (request) => {
        const c = ctx(request);
        const workspace = await deps.appDb.withTenant(c.workspaceId, async (tx) => {
          const updated = await completeOnboarding(tx, c.workspaceId, request.body.productInterest);
          await recordAudit(tx, {
            workspaceId: c.workspaceId,
            actorUserId: c.user.id,
            action: "workspace.onboarded",
            targetType: "workspace",
            targetId: c.workspaceId,
            metadata: { productInterest: request.body.productInterest },
          });
          return updated;
        });
        if (!workspace) throw new AppError("not_found", "Workspace not found.");
        return { data: toWorkspaceDto(workspace) };
      },
    );

    app.get(
      "/v1/workspace/members",
      {
        preHandler: guard.requireWorkspace,
        schema: { querystring: cursorQuerySchema, response: { 200: pageSchema(memberSchema) } },
      },
      async (request) => {
        const c = ctx(request);
        const cursor = request.query.cursor ? decodeCursor(request.query.cursor) : null;
        if (request.query.cursor && !cursor) throw new AppError("bad_request", "Invalid cursor.");
        const limit = request.query.limit;
        const rows = await deps.appDb.withTenant(c.workspaceId, (tx) =>
          tx
            .select({
              id: schema.members.id,
              userId: schema.members.userId,
              role: schema.members.role,
              createdAt: schema.members.createdAt,
              name: schema.users.name,
              email: schema.users.email,
              twoFactorEnabled: schema.users.twoFactorEnabled,
            })
            .from(schema.members)
            .innerJoin(schema.users, eq(schema.users.id, schema.members.userId))
            .where(
              cursor
                ? or(
                    lt(schema.members.createdAt, cursor.createdAt),
                    and(eq(schema.members.createdAt, cursor.createdAt), lt(schema.members.id, cursor.id)),
                  )
                : undefined,
            )
            .orderBy(desc(schema.members.createdAt), desc(schema.members.id))
            .limit(limit + 1),
        );
        const page = rows.slice(0, limit);
        const last = page.at(-1);
        return {
          data: page.map((row) => ({
            id: row.id,
            userId: row.userId,
            name: row.name,
            email: row.email,
            role: isWorkspaceRole(row.role) ? row.role : "viewer",
            twoFactorEnabled: row.twoFactorEnabled,
            joinedAt: row.createdAt.toISOString(),
          })),
          nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
        };
      },
    );

    app.get(
      "/v1/workspace/audit-log",
      {
        preHandler: [guard.requireWorkspace, guard.requireRole("owner", "admin", "supervisor")],
        schema: { querystring: cursorQuerySchema, response: { 200: pageSchema(auditEntrySchema) } },
      },
      async (request) => {
        const c = ctx(request);
        const cursor = request.query.cursor ? decodeCursor(request.query.cursor) : null;
        if (request.query.cursor && !cursor) throw new AppError("bad_request", "Invalid cursor.");
        const limit = request.query.limit;
        const rows = await deps.appDb.withTenant(c.workspaceId, (tx) =>
          tx
            .select({
              id: schema.auditLog.id,
              action: schema.auditLog.action,
              targetType: schema.auditLog.targetType,
              targetId: schema.auditLog.targetId,
              ipAddress: schema.auditLog.ipAddress,
              metadata: schema.auditLog.metadata,
              createdAt: schema.auditLog.createdAt,
              actorName: schema.users.name,
              actorEmail: schema.users.email,
            })
            .from(schema.auditLog)
            .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorUserId))
            .where(
              cursor
                ? or(
                    lt(schema.auditLog.createdAt, cursor.createdAt),
                    and(eq(schema.auditLog.createdAt, cursor.createdAt), lt(schema.auditLog.id, cursor.id)),
                  )
                : undefined,
            )
            .orderBy(desc(schema.auditLog.createdAt), desc(schema.auditLog.id))
            .limit(limit + 1),
        );
        const page = rows.slice(0, limit);
        const last = page.at(-1);
        return {
          data: page.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
          nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
        };
      },
    );
  };
