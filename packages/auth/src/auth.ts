import {
  createSystemMailer,
  invitationTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "@mailnitio/core";
import type { Envelope } from "@mailnitio/crypto";
import { asc, type DatabaseHandle, eq, schema } from "@mailnitio/db";
import type { Logger } from "@mailnitio/observability";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { organization, twoFactor } from "better-auth/plugins";
import { ac, roles } from "./roles";

export interface AuthDeps {
  /** Connection as the mailnitio_auth role (auth tables + workspace membership). */
  database: DatabaseHandle;
  envelope: Envelope;
  logger: Logger;
  baseURL: string;
  /** Public web origin, used in links inside emails. */
  webOrigin: string;
  secret: string;
  trustedOrigins: string[];
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "workspace"}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Sign-up creates the user's first workspace with them as owner, plus the workspace encryption key. */
async function createFirstWorkspace(deps: AuthDeps, user: { id: string; name: string; email: string }) {
  const { db } = deps.database;
  const workspaceName = `${user.name.split(" ")[0] ?? user.name}'s workspace`;
  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(schema.workspaces)
      .values({ name: workspaceName, slug: slugify(workspaceName) })
      .returning({ id: schema.workspaces.id });
    if (!workspace) throw new Error("Workspace was not created");
    await tx.insert(schema.members).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });
    await tx
      .insert(schema.workspaceKeys)
      .values({ workspaceId: workspace.id, wrappedDek: deps.envelope.createWorkspaceKey(workspace.id) });
    await tx.insert(schema.auditLog).values({
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "workspace.created",
      targetType: "workspace",
      targetId: workspace.id,
    });
  });
}

async function firstWorkspaceFor(deps: AuthDeps, userId: string): Promise<string | null> {
  const [membership] = await deps.database.db
    .select({ workspaceId: schema.members.workspaceId })
    .from(schema.members)
    .where(eq(schema.members.userId, userId))
    .orderBy(asc(schema.members.createdAt))
    .limit(1);
  return membership?.workspaceId ?? null;
}

async function audit(
  deps: AuthDeps,
  entry: {
    workspaceId: string | null | undefined;
    userId?: string | null;
    action: string;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (!entry.workspaceId) {
    deps.logger.info({ action: entry.action, userId: entry.userId }, "auth event without workspace");
    return;
  }
  try {
    await deps.database.db.insert(schema.auditLog).values({
      workspaceId: entry.workspaceId,
      actorUserId: entry.userId ?? null,
      action: entry.action,
      ipAddress: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    // Auditing must never block sign-in; failures are logged for follow-up.
    deps.logger.error({ err: error, action: entry.action }, "failed to write audit entry");
  }
}

const AUDITED_PATHS: Record<string, string> = {
  "/sign-out": "auth.sign_out",
  "/two-factor/enable": "auth.mfa_enabled",
  "/two-factor/disable": "auth.mfa_disabled",
  "/two-factor/verify-totp": "auth.mfa_verified",
  "/change-password": "auth.password_changed",
  "/reset-password": "auth.password_reset",
  "/verify-email": "auth.email_verified",
};

export function createAuth(deps: AuthDeps) {
  const mailer = createSystemMailer(deps.logger);

  return betterAuth({
    appName: "Mailnitio",
    baseURL: deps.baseURL,
    basePath: "/api/auth",
    secret: deps.secret,
    trustedOrigins: deps.trustedOrigins,
    database: drizzleAdapter(deps.database.db, {
      provider: "pg",
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
        twoFactors: schema.twoFactors,
        workspaces: schema.workspaces,
        members: schema.members,
        invitations: schema.invitations,
      },
    }),
    advanced: {
      database: { generateId: "uuid" },
      cookiePrefix: "mailnitio",
      useSecureCookies: deps.baseURL.startsWith("https://"),
    },
    user: { modelName: "users" },
    session: { modelName: "sessions", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
    rateLimit: { enabled: true, window: 60, max: 30, storage: "memory" },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...resetPasswordTemplate({ name: user.name, url }) });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...verifyEmailTemplate({ name: user.name, url }) });
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await createFirstWorkspace(deps, user);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const workspaceId = await firstWorkspaceFor(deps, session.userId);
            return { data: { ...session, activeOrganizationId: workspaceId } };
          },
          after: async (session) => {
            const s = session as typeof session & { activeOrganizationId?: string | null };
            await audit(deps, {
              workspaceId: s.activeOrganizationId,
              userId: session.userId,
              action: "auth.sign_in",
              ip: session.ipAddress,
              userAgent: session.userAgent,
            });
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const action = AUDITED_PATHS[ctx.path];
        if (!action) return;
        const session = ctx.context.newSession ?? ctx.context.session;
        if (!session) return;
        const s = session.session as typeof session.session & { activeOrganizationId?: string | null };
        await audit(deps, {
          workspaceId: s.activeOrganizationId ?? (await firstWorkspaceFor(deps, session.user.id)),
          userId: session.user.id,
          action,
          ip: s.ipAddress,
          userAgent: s.userAgent,
        });
      }),
    },
    plugins: [
      twoFactor({
        issuer: "Mailnitio",
        schema: { twoFactor: { modelName: "twoFactors" } },
      }),
      organization({
        ac,
        roles,
        creatorRole: "owner",
        allowUserToCreateOrganization: true,
        invitationExpiresIn: 60 * 60 * 24 * 7,
        schema: {
          session: { fields: { activeOrganizationId: "activeWorkspaceId" } },
          organization: { modelName: "workspaces" },
          member: { modelName: "members", fields: { organizationId: "workspaceId" } },
          invitation: { modelName: "invitations", fields: { organizationId: "workspaceId" } },
        },
        sendInvitationEmail: async (data) => {
          const url = `${deps.webOrigin}/accept-invitation/${data.id}`;
          await mailer.send({
            to: data.email,
            ...invitationTemplate({
              inviterName: data.inviter.user.name,
              workspaceName: data.organization.name,
              role: data.role,
              url,
            }),
          });
        },
        organizationHooks: {
          afterAddMember: async ({ member, user, organization: workspace }) => {
            await audit(deps, {
              workspaceId: workspace.id,
              userId: user.id,
              action: "member.added",
              metadata: { memberId: member.id, role: member.role },
            });
          },
          afterRemoveMember: async ({ member, user, organization: workspace }) => {
            await audit(deps, {
              workspaceId: workspace.id,
              userId: user.id,
              action: "member.removed",
              metadata: { memberId: member.id },
            });
          },
          afterUpdateMemberRole: async ({ member, previousRole, organization: workspace }) => {
            await audit(deps, {
              workspaceId: workspace.id,
              userId: member.userId,
              action: "member.role_changed",
              metadata: { memberId: member.id, from: previousRole, to: member.role },
            });
          },
          afterCreateInvitation: async ({ invitation, inviter, organization: workspace }) => {
            await audit(deps, {
              workspaceId: workspace.id,
              userId: inviter.id,
              action: "member.invited",
              metadata: { invitationId: invitation.id, email: invitation.email, role: invitation.role },
            });
          },
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
