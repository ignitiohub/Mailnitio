import { schema, sql, type Tx } from "@mailnitio/db";

/** First ticket number in a new workspace, so keys read like MN-1001 rather than MN-1. */
export const FIRST_TICKET_NUMBER = 1001;

/**
 * Next ticket number for a workspace. A single upsert increments the per-workspace counter under a
 * row lock, so concurrent ticket creation never produces duplicate keys.
 */
export async function nextTicketNumber(
  tx: Tx,
  workspaceId: string,
): Promise<{ number: number; key: string }> {
  const [row] = await tx
    .insert(schema.ticketCounters)
    .values({ workspaceId, lastNumber: FIRST_TICKET_NUMBER })
    .onConflictDoUpdate({
      target: schema.ticketCounters.workspaceId,
      set: { lastNumber: sql`${schema.ticketCounters.lastNumber} + 1` },
    })
    .returning({ lastNumber: schema.ticketCounters.lastNumber });
  if (!row) throw new Error("Could not allocate a ticket number");
  return { number: row.lastNumber, key: `MN-${row.lastNumber}` };
}
