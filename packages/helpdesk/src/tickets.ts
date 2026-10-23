import { and, eq, inArray, schema, sql, type Tx } from "@mailnitio/db";
import { AppError } from "@mailnitio/shared";
import { nextTicketNumber } from "./keys";
import { notify } from "./notifications";

export const TICKET_STATUSES = ["new", "open", "pending", "on_hold", "resolved", "closed"] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export interface Actor {
  userId: string;
  name: string;
}

export interface TicketPatch {
  status?: TicketStatusValue;
  priority?: (typeof TICKET_PRIORITIES)[number];
  teamId?: string | null;
  assigneeId?: string | null;
  tags?: string[];
}

async function loadTicket(tx: Tx, ticketId: string) {
  const [ticket] = await tx.select().from(schema.tickets).where(eq(schema.tickets.id, ticketId));
  if (!ticket) throw new AppError("not_found", "Ticket not found.");
  return ticket;
}

async function event(
  tx: Tx,
  workspaceId: string,
  ticketId: string,
  type: string,
  actor: Actor | null,
  data: Record<string, unknown>,
) {
  await tx.insert(schema.ticketEvents).values({
    workspaceId,
    ticketId,
    type,
    actorType: actor ? "user" : "system",
    actorId: actor?.userId ?? null,
    data,
  });
}

async function assertMember(tx: Tx, workspaceId: string, userId: string) {
  const [member] = await tx
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(and(eq(schema.members.workspaceId, workspaceId), eq(schema.members.userId, userId)));
  if (!member) throw new AppError("bad_request", "The assignee is not a member of this workspace.");
}

/** Update status, priority, team, assignee or tags; records an event per change and notifies assignees. */
export async function updateTicket(
  tx: Tx,
  workspaceId: string,
  ticketId: string,
  patch: TicketPatch,
  actor: Actor,
) {
  const ticket = await loadTicket(tx, ticketId);
  if (ticket.mergedIntoId)
    throw new AppError("conflict", "This ticket was merged and can no longer be changed.");
  const set: Partial<typeof schema.tickets.$inferInsert> = {};
  const now = new Date();

  if (patch.status && patch.status !== ticket.status) {
    set.status = patch.status;
    if (patch.status === "resolved") set.resolvedAt = now;
    if (patch.status === "closed") set.closedAt = now;
    if (!["resolved", "closed"].includes(patch.status)) {
      set.resolvedAt = null;
      set.closedAt = null;
    }
    await event(tx, workspaceId, ticketId, "status", actor, { from: ticket.status, to: patch.status });
  }
  if (patch.priority && patch.priority !== ticket.priority) {
    set.priority = patch.priority;
    await event(tx, workspaceId, ticketId, "priority", actor, { from: ticket.priority, to: patch.priority });
  }
  if (patch.teamId !== undefined && patch.teamId !== ticket.teamId) {
    if (patch.teamId) {
      const [team] = await tx
        .select({ id: schema.teams.id, name: schema.teams.name })
        .from(schema.teams)
        .where(eq(schema.teams.id, patch.teamId));
      if (!team) throw new AppError("bad_request", "That team does not exist.");
      await event(tx, workspaceId, ticketId, "team", actor, { to: team.name });
    }
    set.teamId = patch.teamId;
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== ticket.assigneeId) {
    if (patch.assigneeId) await assertMember(tx, workspaceId, patch.assigneeId);
    set.assigneeId = patch.assigneeId;
    await event(tx, workspaceId, ticketId, "assignee", actor, { to: patch.assigneeId });
    if (patch.assigneeId) {
      await notify(tx, {
        workspaceId,
        userId: patch.assigneeId,
        type: "assignment",
        actorId: actor.userId,
        data: { ticketId, ticketKey: ticket.key, subject: ticket.subject, actorName: actor.name },
      });
    }
    if (ticket.status === "new" && !set.status) set.status = "open";
  }
  if (patch.tags) {
    const tags = [...new Set(patch.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    if (tags.join(",") !== ticket.tags.join(",")) {
      set.tags = tags;
      await event(tx, workspaceId, ticketId, "tags", actor, { tags });
    }
  }
  if (Object.keys(set).length === 0) return ticket;
  const [updated] = await tx
    .update(schema.tickets)
    .set(set)
    .where(eq(schema.tickets.id, ticketId))
    .returning();
  return updated ?? ticket;
}

/**
 * Reply or internal note. In D2 replies are stored with sent_status "simulated"; D3 sends them via Graph
 * from the receiving mailbox.
 */
export async function addTicketMessage(
  tx: Tx,
  workspaceId: string,
  ticketId: string,
  input: { type: "reply" | "note"; body: string; mentions?: string[]; status?: TicketStatusValue },
  actor: Actor,
) {
  const ticket = await loadTicket(tx, ticketId);
  if (ticket.mergedIntoId)
    throw new AppError("conflict", "This ticket was merged. Reply on the ticket it was merged into.");
  const now = new Date();

  if (input.type === "note") {
    const mentions = [...new Set(input.mentions ?? [])];
    for (const userId of mentions) await assertMember(tx, workspaceId, userId);
    const [message] = await tx
      .insert(schema.ticketMessages)
      .values({
        workspaceId,
        ticketId,
        direction: "note",
        authorType: "agent",
        authorId: actor.userId,
        fromName: actor.name,
        bodyText: input.body,
        sentStatus: "received",
        mentions,
      })
      .returning();
    for (const userId of mentions) {
      await notify(tx, {
        workspaceId,
        userId,
        type: "mention",
        actorId: actor.userId,
        data: {
          ticketId,
          ticketKey: ticket.key,
          subject: ticket.subject,
          actorName: actor.name,
          excerpt: input.body.slice(0, 140),
        },
      });
    }
    await tx.update(schema.tickets).set({ updatedAt: now }).where(eq(schema.tickets.id, ticketId));
    return message;
  }

  const [customer] = ticket.customerId
    ? await tx
        .select({ email: schema.customers.email })
        .from(schema.customers)
        .where(eq(schema.customers.id, ticket.customerId))
    : [];
  const [mailbox] = ticket.mailboxId
    ? await tx
        .select({ address: schema.mailboxes.address })
        .from(schema.mailboxes)
        .where(eq(schema.mailboxes.id, ticket.mailboxId))
    : [];
  const subject = ticket.subject.includes(ticket.key)
    ? `RE: ${ticket.subject}`
    : `RE: ${ticket.subject} [${ticket.key}]`;
  const [message] = await tx
    .insert(schema.ticketMessages)
    .values({
      workspaceId,
      ticketId,
      direction: "outbound",
      authorType: "agent",
      authorId: actor.userId,
      fromAddr: mailbox?.address ?? null,
      fromName: actor.name,
      toAddrs: customer ? [customer.email] : [],
      subject,
      bodyText: input.body,
      sentStatus: "simulated",
      internetMessageId: `<reply.${crypto.randomUUID()}@mailnitio.local>`,
    })
    .returning();
  if (message?.internetMessageId) {
    await tx
      .insert(schema.messageIndex)
      .values({
        workspaceId,
        internetMessageId: message.internetMessageId,
        threadId: ticket.threadId,
        ticketId,
      })
      .onConflictDoNothing();
  }
  const status = input.status ?? "pending";
  await tx
    .update(schema.tickets)
    .set({
      status,
      firstRespondedAt: ticket.firstRespondedAt ?? now,
      resolvedAt: status === "resolved" ? now : ticket.resolvedAt,
      lastMessageAt: now,
      assigneeId: ticket.assigneeId ?? actor.userId,
    })
    .where(eq(schema.tickets.id, ticketId));
  if (status !== ticket.status)
    await event(tx, workspaceId, ticketId, "status", actor, { from: ticket.status, to: status });
  return message;
}

/** Merge `sourceId` into `targetId`: messages move, the source is closed and points at the target. */
export async function mergeTickets(
  tx: Tx,
  workspaceId: string,
  sourceId: string,
  targetId: string,
  actor: Actor,
) {
  if (sourceId === targetId) throw new AppError("bad_request", "A ticket cannot be merged into itself.");
  const source = await loadTicket(tx, sourceId);
  const target = await loadTicket(tx, targetId);
  if (target.mergedIntoId)
    throw new AppError("conflict", `${target.key} was itself merged; merge into the surviving ticket.`);
  await tx
    .update(schema.ticketMessages)
    .set({ ticketId: targetId })
    .where(eq(schema.ticketMessages.ticketId, sourceId));
  await tx
    .update(schema.emailLog)
    .set({ ticketId: targetId, ticketKey: target.key })
    .where(eq(schema.emailLog.ticketId, sourceId));
  await tx
    .update(schema.messageIndex)
    .set({ ticketId: targetId })
    .where(eq(schema.messageIndex.ticketId, sourceId));
  const now = new Date();
  await tx
    .update(schema.tickets)
    .set({ status: "closed", closedAt: now, mergedIntoId: targetId })
    .where(eq(schema.tickets.id, sourceId));
  await tx.update(schema.tickets).set({ lastMessageAt: now }).where(eq(schema.tickets.id, targetId));
  await event(tx, workspaceId, sourceId, "merged", actor, { into: target.key });
  await event(tx, workspaceId, targetId, "merged", actor, { from: source.key });
  return target;
}

/** Split selected inbound messages into a new ticket linked to the original. */
export async function splitTicket(
  tx: Tx,
  workspaceId: string,
  ticketId: string,
  messageIds: string[],
  actor: Actor,
) {
  const ticket = await loadTicket(tx, ticketId);
  if (messageIds.length === 0) throw new AppError("bad_request", "Choose at least one message to split.");
  const messages = await tx
    .select()
    .from(schema.ticketMessages)
    .where(and(eq(schema.ticketMessages.ticketId, ticketId), inArray(schema.ticketMessages.id, messageIds)));
  if (messages.length !== messageIds.length)
    throw new AppError("bad_request", "Some messages do not belong to this ticket.");
  const [remaining] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.ticketMessages)
    .where(and(eq(schema.ticketMessages.ticketId, ticketId), eq(schema.ticketMessages.direction, "inbound")));
  const movingInbound = messages.filter((m) => m.direction === "inbound").length;
  if ((remaining?.n ?? 0) - movingInbound < 1)
    throw new AppError("bad_request", "The original ticket must keep at least one customer message.");

  const first = messages.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  const { number, key } = await nextTicketNumber(tx, workspaceId);
  const [created] = await tx
    .insert(schema.tickets)
    .values({
      workspaceId,
      number,
      key,
      mailboxId: ticket.mailboxId,
      customerId: ticket.customerId,
      subject: first?.subject?.replace(/^(?:\s*(?:re|fw|fwd)\s*:\s*)+/i, "") || ticket.subject,
      status: "open",
      priority: ticket.priority,
      category: ticket.category,
      teamId: ticket.teamId,
      relatedTicketIds: [ticketId],
      lastMessageAt: first?.createdAt ?? new Date(),
    })
    .returning();
  if (!created) throw new Error("Split ticket was not created");
  await tx
    .update(schema.ticketMessages)
    .set({ ticketId: created.id })
    .where(inArray(schema.ticketMessages.id, messageIds));
  const emailIds = messages.map((m) => m.emailLogId).filter((id): id is string => Boolean(id));
  if (emailIds.length > 0) {
    await tx
      .update(schema.emailLog)
      .set({ ticketId: created.id, ticketKey: key })
      .where(inArray(schema.emailLog.id, emailIds));
  }
  await tx
    .update(schema.tickets)
    .set({
      relatedTicketIds: sql`(select array(select distinct unnest(${schema.tickets.relatedTicketIds} || array[${created.id}::uuid])))`,
    })
    .where(eq(schema.tickets.id, ticketId));
  await event(tx, workspaceId, ticketId, "split", actor, { into: key, messages: messageIds.length });
  await event(tx, workspaceId, created.id, "created", actor, { splitFrom: ticket.key });
  return created;
}

export async function linkTickets(
  tx: Tx,
  workspaceId: string,
  ticketId: string,
  otherId: string,
  actor: Actor,
) {
  if (ticketId === otherId) throw new AppError("bad_request", "A ticket cannot be linked to itself.");
  const a = await loadTicket(tx, ticketId);
  const b = await loadTicket(tx, otherId);
  for (const [x, y] of [
    [a.id, b.id],
    [b.id, a.id],
  ] as const) {
    await tx
      .update(schema.tickets)
      .set({
        relatedTicketIds: sql`(select array(select distinct unnest(${schema.tickets.relatedTicketIds} || array[${y}::uuid])))`,
      })
      .where(eq(schema.tickets.id, x));
  }
  await event(tx, workspaceId, a.id, "linked", actor, { with: b.key });
  await event(tx, workspaceId, b.id, "linked", actor, { with: a.key });
}
