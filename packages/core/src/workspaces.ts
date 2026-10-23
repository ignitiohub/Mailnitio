import type { Envelope } from "@mailnitio/crypto";
import { eq, schema, type Tx } from "@mailnitio/db";

export type ProductInterest = "helpdesk" | "send" | "both";

/** Create the workspace's data-encryption key if it does not exist yet. Idempotent. */
export async function ensureWorkspaceKey(tx: Tx, envelope: Envelope, workspaceId: string): Promise<void> {
  await tx
    .insert(schema.workspaceKeys)
    .values({ workspaceId, wrappedDek: envelope.createWorkspaceKey(workspaceId) })
    .onConflictDoNothing({ target: schema.workspaceKeys.workspaceId });
}

export async function getWorkspace(tx: Tx, workspaceId: string) {
  const [workspace] = await tx.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
  return workspace ?? null;
}

export async function updateWorkspaceDetails(
  tx: Tx,
  workspaceId: string,
  details: { name?: string; country?: string; industry?: string; timezone?: string },
) {
  const [workspace] = await tx
    .update(schema.workspaces)
    .set(details)
    .where(eq(schema.workspaces.id, workspaceId))
    .returning();
  return workspace ?? null;
}

export async function completeOnboarding(tx: Tx, workspaceId: string, productInterest: ProductInterest) {
  const [workspace] = await tx
    .update(schema.workspaces)
    .set({ productInterest, onboardedAt: new Date() })
    .where(eq(schema.workspaces.id, workspaceId))
    .returning();
  return workspace ?? null;
}
