import { schema, type Tx } from "@mailnitio/db";

export type NotificationType = "assignment" | "customer_reply" | "mention";

export interface NotificationData {
  ticketId: string;
  ticketKey: string;
  subject: string;
  actorName?: string | null;
  excerpt?: string;
}

/** In-app notification. Never notifies people about their own actions. */
export async function notify(
  tx: Tx,
  input: {
    workspaceId: string;
    userId: string;
    type: NotificationType;
    data: NotificationData;
    actorId?: string | null;
    at?: Date;
  },
): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;
  await tx.insert(schema.notifications).values({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    data: input.data as unknown as Record<string, unknown>,
    createdAt: input.at ?? new Date(),
  });
}
