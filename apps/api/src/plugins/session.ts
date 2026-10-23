import type { Auth } from "@mailnitio/auth";
import { and, type DatabaseHandle, eq, schema } from "@mailnitio/db";
import { AppError, isWorkspaceRole, MFA_REQUIRED_ROLES, type WorkspaceRole } from "@mailnitio/shared";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";

export interface WorkspaceContext {
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
  workspaceId: string;
  role: WorkspaceRole;
  /** True when the role requires TOTP and the user has not enabled it yet. */
  mfaRequired: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    workspace?: WorkspaceContext;
  }
}

/**
 * Resolve the signed-in user and their active workspace. Membership is checked through withTenant, so
 * the lookup itself is protected by RLS.
 */
export function createWorkspaceGuard(deps: { auth: Auth; appDb: DatabaseHandle }) {
  async function resolve(request: FastifyRequest): Promise<WorkspaceContext> {
    const result = await deps.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!result) throw new AppError("unauthenticated", "Sign in to continue.");
    const session = result.session as typeof result.session & { activeOrganizationId?: string | null };
    const workspaceId = session.activeOrganizationId;
    if (!workspaceId) throw new AppError("forbidden", "You are not a member of any workspace.");

    const [membership] = await deps.appDb.withTenant(workspaceId, (tx) =>
      tx
        .select({ role: schema.members.role })
        .from(schema.members)
        .where(and(eq(schema.members.workspaceId, workspaceId), eq(schema.members.userId, result.user.id))),
    );
    if (!membership || !isWorkspaceRole(membership.role)) {
      throw new AppError("forbidden", "You are not a member of this workspace.");
    }

    const user = result.user as typeof result.user & { twoFactorEnabled?: boolean | null };
    const twoFactorEnabled = Boolean(user.twoFactorEnabled);
    return {
      user: { id: user.id, name: user.name, email: user.email, twoFactorEnabled },
      workspaceId,
      role: membership.role,
      mfaRequired: MFA_REQUIRED_ROLES.includes(membership.role) && !twoFactorEnabled,
    };
  }

  return {
    /** Signed in with a workspace; MFA may still be pending (used by /v1/me and onboarding of 2FA). */
    async requireSession(request: FastifyRequest) {
      request.workspace = await resolve(request);
    },
    /** Signed in, member of the workspace, and MFA satisfied for owner/admin. */
    async requireWorkspace(request: FastifyRequest) {
      const ctx = await resolve(request);
      if (ctx.mfaRequired) {
        throw new AppError(
          "mfa_required",
          "Set up two-factor authentication to continue. It is required for owners and admins.",
        );
      }
      request.workspace = ctx;
    },
    requireRole(...allowed: WorkspaceRole[]) {
      return async (request: FastifyRequest) => {
        if (!request.workspace || !allowed.includes(request.workspace.role)) {
          throw new AppError("forbidden", "Your role does not allow this action.");
        }
      };
    },
  };
}

export type WorkspaceGuard = ReturnType<typeof createWorkspaceGuard>;

export function ctx(request: FastifyRequest): WorkspaceContext {
  if (!request.workspace) throw new AppError("unauthenticated", "Sign in to continue.");
  return request.workspace;
}
