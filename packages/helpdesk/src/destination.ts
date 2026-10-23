import { and, asc, count, eq, inArray, schema, sql, type Tx } from "@mailnitio/db";
import type {
  Acknowledger,
  CaseRef,
  CreateCaseInput,
  Destination,
  InboundMessage,
} from "@mailnitio/middleware";
import { nextTicketNumber } from "./keys";
import { notify } from "./notifications";

/**
 * Native-mode destination: tickets live in Mailnitio (plan §13.5). Implements the same interface as the
 * CRM destination, so the pipeline does not know which one it writes to.
 */

async function caseRef(tx: Tx, where: ReturnType<typeof eq>): Promise<CaseRef | null> {
  const [row] = await tx
    .select({
      id: schema.tickets.id,
      key: schema.tickets.key,
      status: schema.tickets.status,
      resolvedAt: schema.tickets.resolvedAt,
      closedAt: schema.tickets.closedAt,
      threadId: schema.tickets.threadId,
      teamKey: schema.teams.key,
      teamName: schema.teams.name,
      category: schema.tickets.category,
      subject: schema.tickets.subject,
      summary: schema.tickets.aiSummary,
      mergedIntoId: schema.tickets.mergedIntoId,
    })
    .from(schema.tickets)
    .leftJoin(schema.teams, eq(schema.teams.id, schema.tickets.teamId))
    .where(where);
  return row ?? null;
}

export async function teamByKey(tx: Tx, workspaceId: string, key: string) {
  const [team] = await tx
    .select()
    .from(schema.teams)
    .where(and(eq(schema.teams.workspaceId, workspaceId), eq(schema.teams.key, key)));
  return team ?? null;
}

async function pickRoundRobin(tx: Tx, workspaceId: string, teamId: string): Promise<string | null> {
  // Least-loaded member of the team by open tickets.
  const members = await tx
    .select({ userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.teamId, teamId));
  if (members.length === 0) return null;
  const loads = await tx
    .select({ assigneeId: schema.tickets.assigneeId, n: count() })
    .from(schema.tickets)
    .where(
      and(
        eq(schema.tickets.workspaceId, workspaceId),
        inArray(
          schema.tickets.assigneeId,
          members.map((m) => m.userId),
        ),
        inArray(schema.tickets.status, ["new", "open", "pending", "on_hold"]),
      ),
    )
    .groupBy(schema.tickets.assigneeId);
  const load = new Map(loads.map((l) => [l.assigneeId, l.n]));
  return members.map((m) => m.userId).sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0] ?? null;
}

async function slaFor(tx: Tx, workspaceId: string, priority: string, at: Date) {
  const [policy] = await tx
    .select()
    .from(schema.slaPolicies)
    .where(and(eq(schema.slaPolicies.workspaceId, workspaceId), eq(schema.slaPolicies.priority, priority)));
  if (!policy) return { slaPolicyId: null, firstResponseDue: null, resolutionDue: null };
  return {
    slaPolicyId: policy.id,
    firstResponseDue: new Date(at.getTime() + policy.firstResponseMins * 60_000),
    resolutionDue: new Date(at.getTime() + policy.resolutionMins * 60_000),
  };
}

function inboundMessage(
  workspaceId: string,
  ticketId: string,
  emailLogId: string,
  message: InboundMessage,
  at: Date,
) {
  return {
    workspaceId,
    ticketId,
    emailLogId,
    direction: "inbound",
    authorType: "customer",
    fromAddr: message.from.toLowerCase(),
    fromName: message.fromName ?? null,
    toAddrs: message.to,
    ccAddrs: message.cc,
    subject: message.subject,
    bodyText: message.body,
    sentStatus: "received",
    internetMessageId: message.internetMessageId,
    createdAt: at,
  } satisfies typeof schema.ticketMessages.$inferInsert;
}

export class HelpdeskDestination implements Destination {
  constructor(private readonly workspaceId: string) {}

  async resolveCustomer(
    tx: Tx,
    input: Parameters<Destination["resolveCustomer"]>[1],
  ): ReturnType<Destination["resolveCustomer"]> {
    const email = input.email.trim().toLowerCase();
    const flags: string[] = [];
    const domain = email.split("@")[1] ?? "";
    if (input.thirdPartyDomains.some((d) => d.toLowerCase() === domain)) flags.push("third_party_sender");

    const [direct] = await tx
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(and(eq(schema.customers.workspaceId, this.workspaceId), eq(schema.customers.email, email)));
    if (direct) return { customerId: direct.id, method: "existing", flags };
    const [alias] = await tx
      .select({ id: schema.customerEmails.customerId })
      .from(schema.customerEmails)
      .where(
        and(eq(schema.customerEmails.workspaceId, this.workspaceId), eq(schema.customerEmails.email, email)),
      );
    if (alias) return { customerId: alias.id, method: "existing", flags };

    // Third-party senders are not turned into customers; an agent confirms who they write for.
    if (flags.includes("third_party_sender")) return { customerId: null, method: "unidentified", flags };

    const [created] = await tx
      .insert(schema.customers)
      .values({
        workspaceId: this.workspaceId,
        email,
        name: input.name,
        createdAt: input.at,
        updatedAt: input.at,
      })
      .onConflictDoUpdate({
        target: [schema.customers.workspaceId, schema.customers.email],
        set: { updatedAt: input.at },
      })
      .returning({ id: schema.customers.id });
    return { customerId: created?.id ?? null, method: "created", flags };
  }

  getCase(tx: Tx, caseId: string) {
    return caseRef(tx, eq(schema.tickets.id, caseId));
  }

  findCaseByKey(tx: Tx, key: string) {
    return caseRef(
      tx,
      and(
        eq(schema.tickets.workspaceId, this.workspaceId),
        eq(schema.tickets.key, key.toUpperCase()),
      ) as ReturnType<typeof eq>,
    );
  }

  async createCase(tx: Tx, input: CreateCaseInput): Promise<CaseRef> {
    const team = await teamByKey(tx, this.workspaceId, input.team);
    const { number, key } = await nextTicketNumber(tx, this.workspaceId);
    const sla = await slaFor(tx, this.workspaceId, input.priority, input.at);
    const assigneeId =
      team?.autoAssign === "round_robin" ? await pickRoundRobin(tx, this.workspaceId, team.id) : null;
    const [ticket] = await tx
      .insert(schema.tickets)
      .values({
        workspaceId: this.workspaceId,
        number,
        key,
        mailboxId: input.mailboxId,
        threadId: input.threadId,
        customerId: input.customerId,
        subject: input.message.subject.replace(/^(?:\s*(?:re|fw|fwd)\s*:\s*)+/i, "") || input.message.subject,
        status: "new",
        priority: input.priority,
        category: input.category,
        teamId: team?.id ?? null,
        assigneeId,
        aiConfidence: input.confidence,
        aiReason: input.reason,
        aiSummary: input.summary,
        needsReview: input.needsReview,
        escalated: input.escalated,
        relatedTicketIds: input.relatedCaseId ? [input.relatedCaseId] : [],
        lastMessageAt: input.at,
        createdAt: input.at,
        updatedAt: input.at,
        ...sla,
      })
      .returning({ id: schema.tickets.id });
    if (!ticket) throw new Error("Ticket was not created");

    await tx
      .insert(schema.ticketMessages)
      .values(inboundMessage(this.workspaceId, ticket.id, input.emailLogId, input.message, input.at));
    await tx.insert(schema.ticketEvents).values({
      workspaceId: this.workspaceId,
      ticketId: ticket.id,
      type: "created",
      actorType: "ai",
      data: {
        category: input.category,
        team: team?.name ?? input.team,
        confidence: input.confidence,
        needsReview: input.needsReview,
        escalated: input.escalated,
      },
      createdAt: input.at,
    });
    await tx
      .update(schema.emailThreads)
      .set({ ticketId: ticket.id })
      .where(eq(schema.emailThreads.id, input.threadId));
    if (assigneeId) {
      await notify(tx, {
        workspaceId: this.workspaceId,
        userId: assigneeId,
        type: "assignment",
        data: { ticketId: ticket.id, ticketKey: key, subject: input.message.subject, actorName: "Mailnitio" },
        at: input.at,
      });
    }
    const ref = await this.getCase(tx, ticket.id);
    if (!ref) throw new Error("Ticket was not created");
    return ref;
  }

  async appendMessage(
    tx: Tx,
    input: { caseId: string; emailLogId: string; message: InboundMessage; at: Date },
  ) {
    await tx
      .insert(schema.ticketMessages)
      .values(inboundMessage(this.workspaceId, input.caseId, input.emailLogId, input.message, input.at));
    const [ticket] = await tx
      .update(schema.tickets)
      .set({
        lastMessageAt: input.at,
        // A customer reply to a ticket waiting on them puts it back in the queue.
        status: sql`case when ${schema.tickets.status} = 'pending' then 'open' else ${schema.tickets.status} end`,
        updatedAt: input.at,
      })
      .where(eq(schema.tickets.id, input.caseId))
      .returning({
        key: schema.tickets.key,
        subject: schema.tickets.subject,
        assigneeId: schema.tickets.assigneeId,
      });
    if (ticket?.assigneeId) {
      await notify(tx, {
        workspaceId: this.workspaceId,
        userId: ticket.assigneeId,
        type: "customer_reply",
        data: {
          ticketId: input.caseId,
          ticketKey: ticket.key,
          subject: ticket.subject,
          actorName: input.message.fromName ?? input.message.from,
          excerpt: input.message.body.slice(0, 140),
        },
        at: input.at,
      });
    }
  }

  async reopen(tx: Tx, input: { caseId: string; at: Date }) {
    await tx
      .update(schema.tickets)
      .set({
        status: "open",
        resolvedAt: null,
        closedAt: null,
        reopenedCount: sql`${schema.tickets.reopenedCount} + 1`,
        updatedAt: input.at,
      })
      .where(eq(schema.tickets.id, input.caseId));
    await tx.insert(schema.ticketEvents).values({
      workspaceId: this.workspaceId,
      ticketId: input.caseId,
      type: "reopened",
      actorType: "ai",
      data: { reason: "Customer replied within the reopen window" },
      createdAt: input.at,
    });
  }

  async linkRelated(tx: Tx, input: { caseId: string; relatedCaseId: string; at: Date }) {
    for (const [a, b] of [
      [input.caseId, input.relatedCaseId],
      [input.relatedCaseId, input.caseId],
    ] as const) {
      await tx
        .update(schema.tickets)
        .set({
          relatedTicketIds: sql`(select array(select distinct unnest(${schema.tickets.relatedTicketIds} || array[${b}::uuid])))`,
        })
        .where(eq(schema.tickets.id, a));
    }
    await tx.insert(schema.ticketEvents).values({
      workspaceId: this.workspaceId,
      ticketId: input.caseId,
      type: "linked",
      actorType: "ai",
      data: { relatedTicketId: input.relatedCaseId },
      createdAt: input.at,
    });
  }

  async route(tx: Tx, input: Parameters<Destination["route"]>[1]) {
    const team = await teamByKey(tx, this.workspaceId, input.team);
    await tx
      .update(schema.tickets)
      .set({
        teamId: team?.id ?? sql`${schema.tickets.teamId}`,
        priority: input.priority,
        escalated: sql`${schema.tickets.escalated} or ${input.escalated}`,
        needsReview: sql`${schema.tickets.needsReview} or ${input.needsReview}`,
        status: sql`case when ${schema.tickets.status} in ('resolved','closed') then ${schema.tickets.status} else 'open' end`,
        updatedAt: input.at,
      })
      .where(eq(schema.tickets.id, input.caseId));
    await tx.insert(schema.ticketEvents).values({
      workspaceId: this.workspaceId,
      ticketId: input.caseId,
      type: "ai",
      actorType: "ai",
      data: { team: team?.name ?? input.team, priority: input.priority, reason: input.reason },
      createdAt: input.at,
    });
  }
}

/** D2 acknowledgements: recorded on the ticket as outbound messages with sent_status "simulated". */
export class SimulatedAcknowledger implements Acknowledger {
  async send(tx: Tx, input: Parameters<Acknowledger["send"]>[1]) {
    const internetMessageId = `<ack.${input.emailLogId}@mailnitio.local>`;
    await tx.insert(schema.ticketMessages).values({
      workspaceId: input.workspaceId,
      ticketId: input.caseId,
      emailLogId: input.emailLogId,
      direction: "outbound",
      authorType: "system",
      fromAddr: input.mailboxAddress,
      fromName: "Acknowledgement",
      toAddrs: [input.to],
      subject: input.subject,
      bodyText: input.body,
      sentStatus: "simulated",
      internetMessageId,
      createdAt: input.at,
    });
    return { internetMessageId };
  }
}

export async function firstTeamMember(tx: Tx, teamId: string): Promise<string | null> {
  const [member] = await tx
    .select({ userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.teamId, teamId))
    .orderBy(asc(schema.teamMembers.createdAt))
    .limit(1);
  return member?.userId ?? null;
}
