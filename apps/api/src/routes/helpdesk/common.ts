import { type DatabaseHandle, eq, schema, type Tx } from "@mailnitio/db";
import { AppError, decodeCursor, encodeCursor, type WorkspaceRole } from "@mailnitio/shared";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { ctx, type WorkspaceGuard } from "../../plugins/session";
import type { JobQueue } from "../../queue";

/** Role sets from plan §8.3 (Helpdesk adds agent and supervisor). */
export const READ_ROLES: WorkspaceRole[] = ["owner", "admin", "supervisor", "agent", "reviewer", "viewer"];
export const WORK_ROLES: WorkspaceRole[] = ["owner", "admin", "supervisor", "agent", "reviewer"];
export const REVIEW_ROLES: WorkspaceRole[] = ["owner", "admin", "supervisor", "reviewer"];
export const MANAGE_ROLES: WorkspaceRole[] = ["owner", "admin", "supervisor"];
export const ADMIN_ROLES: WorkspaceRole[] = ["owner", "admin"];

export interface HelpdeskDeps {
  appDb: DatabaseHandle;
  guard: WorkspaceGuard;
  queue: JobQueue;
}

/** preHandlers: signed in, MFA satisfied, and one of the roles. */
export function access(guard: WorkspaceGuard, roles: WorkspaceRole[]) {
  return [guard.requireWorkspace, guard.requireRole(...roles)];
}

export function actor(request: FastifyRequest) {
  const c = ctx(request);
  return { userId: c.user.id, name: c.user.name, ip: request.ip };
}

export const idParams = z.object({ id: z.string().uuid() });

export const listQuery = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(200).optional(),
});

/** Decode an opaque keyset cursor or fail with a 400. */
export function cursorOf(value: string | undefined) {
  if (!value) return null;
  const decoded = decodeCursor(value);
  if (!decoded) throw new AppError("bad_request", "Invalid cursor.");
  return decoded;
}

/** Slice a limit+1 result into a page and the next cursor (keyset on a timestamp + id). */
export function page<T extends { id: string }>(rows: T[], limit: number, at: (row: T) => Date) {
  const data = rows.slice(0, limit);
  const last = data.at(-1);
  return { data, nextCursor: rows.length > limit && last ? encodeCursor(at(last), last.id) : null };
}

export async function workspaceTimezone(tx: Tx, workspaceId: string): Promise<string> {
  const [ws] = await tx
    .select({ tz: schema.workspaces.timezone })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  return ws?.tz ?? "Africa/Lagos";
}

/** Escape LIKE wildcards in user search text. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** The status chip shown for an email (fixed vocabulary from the brief). */
export const EMAIL_CHIPS = [
  "Processed",
  "Rerouted",
  "Needs Review",
  "Escalated",
  "Shadow",
  "Skipped",
  "Failed",
] as const;
