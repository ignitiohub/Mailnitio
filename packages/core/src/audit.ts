import { schema, type Tx } from "@mailnitio/db";

export interface AuditEntry {
  workspaceId: string;
  action: string;
  actorUserId?: string | null;
  actorType?: "user" | "api_key" | "system";
  targetType?: string;
  targetId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/** Append an audit entry. Call inside withTenant so RLS confirms the workspace. */
export async function recordAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.insert(schema.auditLog).values({
    workspaceId: entry.workspaceId,
    action: entry.action,
    actorUserId: entry.actorUserId ?? null,
    actorType: entry.actorType ?? "user",
    targetType: entry.targetType,
    targetId: entry.targetId,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    metadata: entry.metadata ?? {},
  });
}
