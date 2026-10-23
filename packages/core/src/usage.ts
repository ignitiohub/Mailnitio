import { schema, type Tx } from "@mailnitio/db";

/**
 * Record a usage event. With a sourceKey the call is idempotent: a retried step never double-counts.
 * Returns true when a new event was written.
 */
export async function recordUsage(
  tx: Tx,
  event: {
    workspaceId: string;
    metric: string;
    quantity?: number;
    sourceKey?: string;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
  },
): Promise<boolean> {
  const inserted = await tx
    .insert(schema.usageEvents)
    .values({
      workspaceId: event.workspaceId,
      metric: event.metric,
      quantity: event.quantity ?? 1,
      sourceKey: event.sourceKey,
      metadata: event.metadata ?? {},
      occurredAt: event.occurredAt ?? new Date(),
    })
    .onConflictDoNothing({ target: schema.usageEvents.sourceKey })
    .returning({ id: schema.usageEvents.id });
  return inserted.length > 0;
}
