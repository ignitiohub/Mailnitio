import { type TenantConfig, tenantConfigSchema } from "@mailnitio/config";
import { recordAudit } from "@mailnitio/core";
import { and, eq, schema, sql, type Tx } from "@mailnitio/db";
import { AppError } from "@mailnitio/shared";
import { type Actor, linkTickets, splitTicket } from "./tickets";

export interface OverrideInput {
  category?: string;
  teamId?: string;
  /** Move this email to another ticket, by key (e.g. MN-1042). */
  linkTicketKey?: string;
  customerId?: string;
  /** Move this email out into a new ticket of its own. */
  split?: boolean;
  note?: string;
}

async function loadReview(tx: Tx, reviewId: string) {
  const [review] = await tx.select().from(schema.reviews).where(eq(schema.reviews.id, reviewId));
  if (!review) throw new AppError("not_found", "Review not found.");
  if (review.status !== "open") throw new AppError("conflict", "This review has already been resolved.");
  const [email] = await tx.select().from(schema.emailLog).where(eq(schema.emailLog.id, review.emailLogId));
  if (!email) throw new AppError("not_found", "Email not found.");
  return { review, email };
}

async function activeConfig(tx: Tx, workspaceId: string): Promise<TenantConfig> {
  const [row] = await tx
    .select({ config: schema.configVersions.config })
    .from(schema.configVersions)
    .where(
      and(eq(schema.configVersions.workspaceId, workspaceId), eq(schema.configVersions.status, "active")),
    );
  const parsed = tenantConfigSchema.safeParse(row?.config);
  if (!parsed.success) throw new AppError("conflict", "The workspace has no valid active configuration.");
  return parsed.data;
}

/** Clear the ticket's review flag once no open reviews remain for it. */
async function settleTicketReview(tx: Tx, ticketId: string | null) {
  if (!ticketId) return;
  await tx
    .update(schema.tickets)
    .set({
      needsReview: sql`exists (select 1 from ${schema.reviews} r where r.ticket_id = ${ticketId} and r.status = 'open')`,
    })
    .where(eq(schema.tickets.id, ticketId));
}

export async function approveReview(
  tx: Tx,
  workspaceId: string,
  reviewId: string,
  actor: Actor & { ip?: string | null },
) {
  const { review, email } = await loadReview(tx, reviewId);
  const now = new Date();
  await tx
    .update(schema.reviews)
    .set({ status: "approved", resolvedBy: actor.userId, resolvedAt: now })
    .where(eq(schema.reviews.id, review.id));
  await tx.update(schema.emailLog).set({ needsReview: false }).where(eq(schema.emailLog.id, email.id));
  await settleTicketReview(tx, review.ticketId);
  if (review.ticketId) {
    await tx.insert(schema.ticketEvents).values({
      workspaceId,
      ticketId: review.ticketId,
      type: "review",
      actorType: "user",
      actorId: actor.userId,
      data: { result: "approved" },
    });
  }
  await recordAudit(tx, {
    workspaceId,
    actorUserId: actor.userId,
    action: "review.approved",
    targetType: "email",
    targetId: email.id,
    ipAddress: actor.ip ?? null,
    metadata: { reviewId, ticketKey: email.ticketKey, category: email.category, team: email.routedTeam },
  });
}

/**
 * Override the AI's decision. Each changed field writes an overrides row (training signal), is applied to
 * the ticket and email log, and the whole change is audited.
 */
export async function overrideReview(
  tx: Tx,
  workspaceId: string,
  reviewId: string,
  input: OverrideInput,
  actor: Actor & { ip?: string | null },
) {
  const { review, email } = await loadReview(tx, reviewId);
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  let ticketId = review.ticketId ?? email.ticketId;
  const ticketSet: Partial<typeof schema.tickets.$inferInsert> = {};
  const emailSet: Partial<typeof schema.emailLog.$inferInsert> = {};

  if (input.category && input.category !== email.category) {
    const config = await activeConfig(tx, workspaceId);
    const category = config.categories.find((c) => c.key === input.category);
    if (!category) throw new AppError("bad_request", "That category does not exist.");
    changes.push({ field: "category", oldValue: email.category, newValue: category.key });
    ticketSet.category = category.key;
    emailSet.category = category.key;
    // Changing the category moves the ticket to that category's team unless a team was chosen explicitly.
    if (!input.teamId) {
      const [team] = await tx
        .select({ id: schema.teams.id })
        .from(schema.teams)
        .where(and(eq(schema.teams.workspaceId, workspaceId), eq(schema.teams.key, category.team)));
      if (team) input = { ...input, teamId: team.id };
    }
  }

  if (input.teamId) {
    const [team] = await tx.select().from(schema.teams).where(eq(schema.teams.id, input.teamId));
    if (!team) throw new AppError("bad_request", "That team does not exist.");
    if (team.key !== email.routedTeam) {
      changes.push({ field: "team", oldValue: email.routedTeam, newValue: team.key });
      ticketSet.teamId = team.id;
      emailSet.routedTeam = team.key;
      emailSet.rerouted = team.key !== email.originalTeam;
    }
  }

  if (input.customerId && input.customerId !== email.customerId) {
    const [customer] = await tx
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.id, input.customerId));
    if (!customer) throw new AppError("bad_request", "That customer does not exist.");
    changes.push({ field: "customer", oldValue: email.customerId, newValue: customer.id });
    ticketSet.customerId = customer.id;
    emailSet.customerId = customer.id;
  }

  if (ticketId && Object.keys(ticketSet).length > 0) {
    await tx.update(schema.tickets).set(ticketSet).where(eq(schema.tickets.id, ticketId));
  }

  if (input.linkTicketKey) {
    const [target] = await tx
      .select()
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.workspaceId, workspaceId),
          eq(schema.tickets.key, input.linkTicketKey.trim().toUpperCase()),
        ),
      );
    if (!target) throw new AppError("bad_request", `Ticket ${input.linkTicketKey} was not found.`);
    if (target.id !== ticketId) {
      changes.push({ field: "ticket_link", oldValue: email.ticketKey, newValue: target.key });
      await tx
        .update(schema.ticketMessages)
        .set({ ticketId: target.id })
        .where(eq(schema.ticketMessages.emailLogId, email.id));
      if (ticketId) await linkTickets(tx, workspaceId, target.id, ticketId, actor);
      emailSet.ticketId = target.id;
      emailSet.ticketKey = target.key;
      ticketId = target.id;
    }
  }

  if (input.split && ticketId) {
    const messages = await tx
      .select({ id: schema.ticketMessages.id })
      .from(schema.ticketMessages)
      .where(
        and(eq(schema.ticketMessages.ticketId, ticketId), eq(schema.ticketMessages.emailLogId, email.id)),
      );
    if (messages.length > 0) {
      const created = await splitTicket(
        tx,
        workspaceId,
        ticketId,
        messages.map((m) => m.id),
        actor,
      );
      changes.push({ field: "split", oldValue: email.ticketKey, newValue: created.key });
      emailSet.ticketId = created.id;
      emailSet.ticketKey = created.key;
      ticketId = created.id;
    }
  }

  if (changes.length === 0)
    throw new AppError("bad_request", "Nothing to change. Approve the review instead.");

  for (const change of changes) {
    await tx.insert(schema.overrides).values({
      workspaceId,
      emailLogId: email.id,
      reviewId: review.id,
      ticketId,
      userId: actor.userId,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      note: input.note ?? null,
    });
  }
  const now = new Date();
  await tx
    .update(schema.emailLog)
    .set({ ...emailSet, needsReview: false })
    .where(eq(schema.emailLog.id, email.id));
  await tx
    .update(schema.reviews)
    .set({ status: "overridden", resolvedBy: actor.userId, resolvedAt: now, ticketId })
    .where(eq(schema.reviews.id, review.id));
  await settleTicketReview(tx, ticketId);
  if (review.ticketId && review.ticketId !== ticketId) await settleTicketReview(tx, review.ticketId);
  if (ticketId) {
    await tx.insert(schema.ticketEvents).values({
      workspaceId,
      ticketId,
      type: "review",
      actorType: "user",
      actorId: actor.userId,
      data: { result: "overridden", changes },
    });
  }
  await recordAudit(tx, {
    workspaceId,
    actorUserId: actor.userId,
    action: "review.overridden",
    targetType: "email",
    targetId: email.id,
    ipAddress: actor.ip ?? null,
    metadata: { reviewId, changes, note: input.note ?? null },
  });
  return { changes, ticketId };
}
