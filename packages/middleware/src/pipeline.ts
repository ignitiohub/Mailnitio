import { type TenantConfig, tenantConfigSchema } from "@mailnitio/config";
import { recordUsage } from "@mailnitio/core";
import { and, type DatabaseHandle, desc, eq, gte, schema, sql, type Tx } from "@mailnitio/db";
import type {
  Acknowledger,
  AgentResult,
  Agents,
  CaseRef,
  ClassifierDecision,
  ContextDecision,
  Destination,
  ProcessEmailJob,
} from "./contracts";
import { ProcessingError } from "./contracts";
import { normalizeSubject, sourceKey } from "./normalize";
import { maskPii } from "./pii";
import { prefilter, SKIP_REASON_LABELS } from "./prefilter";
import { findEscalationTerms, type RouteDecision, raisePriority, route } from "./router";
import { resolveThread } from "./thread";

type TimelineStep = (typeof schema.emailLog.$inferSelect)["timeline"][number];

export interface PipelineDeps {
  db: DatabaseHandle;
  agents: Agents;
  destination: Destination;
  acknowledger: Acknowledger;
}

export interface ProcessResult {
  emailLogId: string;
  status: "processed" | "skipped" | "shadow" | "failed";
  action: string | null;
  ticketKey: string | null;
  alreadyProcessed: boolean;
}

const DONE_STATUSES = new Set(["processed", "skipped", "shadow"]);

/** Render an acknowledgement template: plain {{variable}} substitution, no code execution. */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => values[k] ?? "");
}

async function loadContext(tx: Tx, job: ProcessEmailJob) {
  const [mailbox] = await tx.select().from(schema.mailboxes).where(eq(schema.mailboxes.id, job.mailboxId));
  if (!mailbox) throw new ProcessingError("config", "Mailbox not found for this workspace");
  const [active] = await tx
    .select()
    .from(schema.configVersions)
    .where(
      and(eq(schema.configVersions.workspaceId, job.workspaceId), eq(schema.configVersions.status, "active")),
    );
  if (!active) throw new ProcessingError("config", "No active configuration for this workspace");
  const parsed = tenantConfigSchema.safeParse(active.config);
  if (!parsed.success) throw new ProcessingError("config", "The active configuration is invalid");
  return { mailbox, config: parsed.data, configVersion: active.version };
}

async function recordAgentRun<T>(
  tx: Tx,
  workspaceId: string,
  emailLogId: string,
  agentType: string,
  result: AgentResult<T>,
  at: Date,
) {
  await tx.insert(schema.agentRuns).values({
    workspaceId,
    emailLogId,
    agentType,
    model: result.meta.model,
    provider: result.meta.provider,
    promptVersion: result.meta.promptVersion,
    output: (result.output as Record<string, unknown> | null) ?? null,
    ok: result.ok,
    error: result.error ?? null,
    latencyMs: result.meta.latencyMs,
    inputTokens: result.meta.inputTokens,
    outputTokens: result.meta.outputTokens,
    costUsd: result.meta.costUsd,
    createdAt: at,
  });
}

/**
 * Process one inbound email end to end (middleware spec §7.3). Idempotent: the source key makes a
 * retried or replayed email a no-op once processed, and every write step sets its flag.
 */
export async function processEmail(deps: PipelineDeps, job: ProcessEmailJob): Promise<ProcessResult> {
  const { db } = deps;
  const ws = job.workspaceId;
  const msg = job.message;
  const receivedAt = new Date(msg.receivedAt);
  const key = sourceKey(ws, msg.internetMessageId);
  // Seeded and simulated emails carry their own timestamps; live email uses the clock.
  const clock = (offsetSeconds: number) => new Date(receivedAt.getTime() + offsetSeconds * 1000);

  // Step 4 (write-ahead) runs in its own transaction so the email is logged even if processing fails.
  const head = await db.withTenant(ws, async (tx) => {
    const context = await loadContext(tx, job);
    const [existing] = await tx
      .select({
        id: schema.emailLog.id,
        status: schema.emailLog.status,
        action: schema.emailLog.action,
        ticketKey: schema.emailLog.ticketKey,
        errorClass: schema.emailLog.errorClass,
      })
      .from(schema.emailLog)
      .where(and(eq(schema.emailLog.workspaceId, ws), eq(schema.emailLog.sourceKey, key)));
    if (existing && DONE_STATUSES.has(existing.status)) return { kind: "done", done: existing } as const;
    // Permanent and config failures run again only on an explicit replay; transient ones retry.
    if (existing?.status === "failed" && existing.errorClass !== "transient" && job.source !== "replay") {
      return { kind: "done", done: existing } as const;
    }
    let emailLogId = existing?.id;
    if (existing) {
      await tx
        .update(schema.emailLog)
        .set({ status: "processing", attempts: sql`${schema.emailLog.attempts} + 1` })
        .where(eq(schema.emailLog.id, existing.id));
    } else {
      const [row] = await tx
        .insert(schema.emailLog)
        .values({
          workspaceId: ws,
          mailboxId: job.mailboxId,
          internetMessageId: msg.internetMessageId,
          sourceKey: key,
          source: job.source,
          conversationId: msg.conversationId ?? null,
          sender: msg.from.toLowerCase(),
          senderName: msg.fromName ?? null,
          toAddrs: msg.to,
          ccAddrs: msg.cc,
          subject: msg.subject,
          normalizedSubject: normalizeSubject(msg.subject, context.config.threading.ticketPattern),
          receivedAt,
          hasAttachments: msg.hasAttachments ?? false,
          status: "processing",
          attempts: 1,
          configVersion: context.configVersion,
        })
        .returning({ id: schema.emailLog.id });
      emailLogId = row?.id;
    }
    if (!emailLogId) throw new ProcessingError("transient", "Could not write the email log");
    return { kind: "new", emailLogId, ...context } as const;
  });

  if (head.kind === "done") {
    return {
      emailLogId: head.done.id,
      status: head.done.status as ProcessResult["status"],
      action: head.done.action,
      ticketKey: head.done.ticketKey,
      alreadyProcessed: true,
    };
  }

  const { emailLogId, mailbox, config } = head;
  const timeline: TimelineStep[] = [
    {
      step: "received",
      label: "Received",
      at: receivedAt.toISOString(),
      detail: `${mailbox.address} via ${job.source}`,
      state: "done",
    },
  ];
  const step = (s: Omit<TimelineStep, "at">, offsetSeconds: number) =>
    timeline.push({ ...s, at: clock(offsetSeconds).toISOString() });

  try {
    return await db.withTenant(ws, (tx) => run(tx));
  } catch (error) {
    const pe =
      error instanceof ProcessingError
        ? error
        : new ProcessingError("transient", "Unexpected processing error");
    step({ step: "failed", label: "Processing failed", detail: pe.message, state: "failed" }, 2);
    await db.withTenant(ws, (tx) =>
      tx
        .update(schema.emailLog)
        .set({
          status: "failed",
          lastError: pe.message,
          errorClass: pe.errorClass,
          timeline,
          processedAt: clock(2),
        })
        .where(eq(schema.emailLog.id, emailLogId)),
    );
    // Transient errors are rethrown so the queue retries; permanent and config errors stop here.
    if (pe.errorClass === "transient") throw error;
    return { emailLogId, status: "failed", action: null, ticketKey: null, alreadyProcessed: false };
  }

  async function run(tx: Tx): Promise<ProcessResult> {
    // Serialise processing of one conversation; other conversations run in parallel (spec §7.3 step 2).
    const lockKey = `${ws}:${msg.conversationId ?? msg.inReplyTo ?? msg.internetMessageId}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    if (job.precomputed?.processingFails) {
      throw new ProcessingError("permanent", "The message body could not be parsed (malformed MIME)");
    }

    const finish = async (
      values: Partial<typeof schema.emailLog.$inferInsert>,
      result: Omit<ProcessResult, "emailLogId" | "alreadyProcessed">,
    ) => {
      await tx
        .update(schema.emailLog)
        .set({ ...values, status: result.status, timeline, processedAt: clock(4) })
        .where(eq(schema.emailLog.id, emailLogId));
      if (result.status !== "skipped") {
        await recordUsage(tx, {
          workspaceId: ws,
          metric: "helpdesk.email_processed",
          // Keyed by the email's source key so a reprocessed or re-seeded email never counts twice.
          sourceKey: `email:${key}`,
          occurredAt: receivedAt,
        });
      }
      return { emailLogId, alreadyProcessed: false, ...result };
    };

    // 5. Pre-filter.
    const own = await tx.select({ address: schema.mailboxes.address }).from(schema.mailboxes);
    const skipReason = prefilter(
      { from: msg.from, subject: msg.subject, headers: msg.headers },
      { ownAddresses: own.map((m) => m.address) },
    );
    if (skipReason) {
      step(
        {
          step: "filtered",
          label: "Filtered",
          detail: `Skipped: ${SKIP_REASON_LABELS[skipReason]}`,
          state: "skipped",
        },
        0.2,
      );
      return finish(
        { skipReason, action: "skipped" },
        { status: "skipped", action: "skipped", ticketKey: null },
      );
    }
    if (mailbox.mode === "paused") {
      step(
        { step: "filtered", label: "Filtered", detail: "Skipped: mailbox is paused", state: "skipped" },
        0.2,
      );
      return finish(
        { skipReason: "mailbox_paused", action: "skipped" },
        { status: "skipped", action: "skipped", ticketKey: null },
      );
    }
    step({ step: "filtered", label: "Filtered", detail: "Passed the pre-filter", state: "done" }, 0.2);

    // 6. Thread resolution.
    const match = await resolveThread(
      {
        subject: msg.subject,
        body: msg.body,
        from: msg.from,
        inReplyTo: msg.inReplyTo,
        references: msg.references,
        conversationId: msg.conversationId,
      },
      {
        ticketByKey: async (k) => {
          const c = await deps.destination.findCaseByKey(tx, k);
          return c ? { ticketId: c.id, threadId: c.threadId } : null;
        },
        messageIndex: async (id) => {
          const [hit] = await tx
            .select({ ticketId: schema.messageIndex.ticketId, threadId: schema.messageIndex.threadId })
            .from(schema.messageIndex)
            .where(
              and(eq(schema.messageIndex.workspaceId, ws), eq(schema.messageIndex.internetMessageId, id)),
            );
          return hit ?? null;
        },
        threadByConversation: async (conversationId) => {
          const [t] = await tx
            .select({ threadId: schema.emailThreads.id, ticketId: schema.emailThreads.ticketId })
            .from(schema.emailThreads)
            .where(
              and(
                eq(schema.emailThreads.workspaceId, ws),
                eq(schema.emailThreads.conversationId, conversationId),
              ),
            );
          return t ?? null;
        },
        recentTicketBySenderSubject: async (sender, normalized, sinceDays) => {
          const since = new Date(receivedAt.getTime() - sinceDays * 86_400_000);
          const [hit] = await tx
            .select({ ticketId: schema.emailLog.ticketId, threadId: schema.emailLog.threadId })
            .from(schema.emailLog)
            .where(
              and(
                eq(schema.emailLog.sender, sender.toLowerCase()),
                eq(schema.emailLog.normalizedSubject, normalized),
                gte(schema.emailLog.receivedAt, since),
                sql`${schema.emailLog.ticketId} is not null`,
              ),
            )
            .orderBy(desc(schema.emailLog.receivedAt))
            .limit(1);
          return hit?.ticketId ? { ticketId: hit.ticketId, threadId: hit.threadId } : null;
        },
      },
      { ticketPattern: config.threading.ticketPattern },
    );

    let existingCase: CaseRef | null = match.ticketId
      ? await deps.destination.getCase(tx, match.ticketId)
      : null;
    // Follow merges so replies land on the surviving ticket.
    for (let hops = 0; existingCase?.mergedIntoId && hops < 5; hops++) {
      existingCase = await deps.destination.getCase(tx, existingCase.mergedIntoId);
    }
    step(
      {
        step: "thread",
        label: "Thread matched",
        detail: existingCase ? `${existingCase.key} by ${match.method}` : "New conversation",
        state: "done",
      },
      0.4,
    );

    // 8. Customer resolution.
    const customer = await deps.destination.resolveCustomer(tx, {
      workspaceId: ws,
      email: msg.from,
      name: msg.fromName ?? null,
      body: msg.body,
      thirdPartyDomains: config.thirdPartyDomains,
      at: receivedAt,
    });
    step(
      {
        step: "customer",
        label: "Customer found",
        detail:
          customer.method === "existing"
            ? "Existing customer"
            : customer.method === "created"
              ? "New customer created"
              : "Sender not identified",
        state: "done",
      },
      0.6,
    );

    const masked = maskPii(msg.body, {
      senderEmail: msg.from,
      customPatterns: config.pii.customPatterns,
    }).text;
    const escalationText = `${msg.subject}\n${msg.body}`;
    const escalationTerms = findEscalationTerms(escalationText, config.escalation.terms);

    // 7. Context Agent: decides how an email on an existing thread relates to its ticket.
    let context: ContextDecision | null = null;
    let contextFailed = false;
    if (existingCase) {
      const [thread] = existingCase.threadId
        ? await tx
            .select({ summary: schema.emailThreads.rollingSummary })
            .from(schema.emailThreads)
            .where(eq(schema.emailThreads.id, existingCase.threadId))
        : [];
      const result = await deps.agents.context({
        config,
        subject: msg.subject,
        maskedBody: masked,
        rollingSummary: thread?.summary ?? existingCase.summary,
        candidate: {
          key: existingCase.key,
          subject: existingCase.subject,
          category: existingCase.category,
          status: existingCase.status,
          summary: existingCase.summary,
        },
        job,
      });
      await recordAgentRun(tx, ws, emailLogId, "context", result, clock(1));
      context = result.ok ? result.output : null;
      contextFailed = !result.ok;
    }

    // Decide what happens to the ticket (spec §8.3 decision handling + §8.4 case state rules).
    const closed = existingCase ? ["resolved", "closed"].includes(existingCase.status) : false;
    const closedAt = existingCase?.resolvedAt ?? existingCase?.closedAt ?? null;
    const withinReopen = closedAt
      ? receivedAt.getTime() - closedAt.getTime() <= config.threading.reopenDays * 86_400_000
      : false;
    let appendTo: CaseRef | null = null;
    let reopen = false;
    let createNew = !existingCase;
    let linkTo: CaseRef | null = null;
    let threadReview = false;
    let threadEscalation = false;

    if (existingCase) {
      if (!context || contextFailed || context.confidence < config.thresholds.context) {
        appendTo = existingCase;
        threadReview = true;
      } else {
        switch (context.decision) {
          case "same_case":
          case "related_case":
          case "duplicate":
            appendTo = existingCase;
            if (context.replyType === "escalation") threadEscalation = true;
            if (closed && context.replyType !== "closure" && context.decision !== "duplicate") {
              if (withinReopen) reopen = true;
              else {
                appendTo = null;
                createNew = true;
                linkTo = existingCase;
              }
            }
            break;
          case "new_issue":
            createNew = true;
            linkTo = existingCase;
            break;
          case "mixed":
            appendTo = existingCase;
            createNew = true;
            linkTo = existingCase;
            break;
          case "new_case":
            createNew = true;
            break;
        }
      }
    }

    // 9. Classifier (new tickets only).
    let classification: ClassifierDecision | null = null;
    let classifierFailed = false;
    if (createNew) {
      const result = await deps.agents.classify({
        config,
        mailbox: { address: mailbox.address, defaultCategory: mailbox.defaultCategory },
        subject: msg.subject,
        maskedBody: masked,
        fromDomain: msg.from.split("@")[1] ?? "",
        job,
      });
      await recordAgentRun(tx, ws, emailLogId, "classifier", result, clock(1.5));
      classification = result.ok ? result.output : null;
      classifierFailed = !result.ok;
    }

    // 10–11. Escalation + routing (code decides).
    let decision: RouteDecision | null = null;
    if (createNew) {
      decision = route({
        config,
        mailboxDefaultCategory: mailbox.defaultCategory,
        classification: classification
          ? {
              category: classification.category,
              confidence: classification.confidence,
              priority: classification.priority,
              escalation: classification.escalation,
            }
          : null,
        escalationTerms,
        customerFlags: customer.flags,
      });
    }
    const confidence = classification?.confidence ?? null;
    const needsReview =
      Boolean(decision?.needsReview) || threadReview || threadEscalation || escalationTerms.length > 0;
    const reviewReasons = [
      ...(decision?.reviewReasons ?? []),
      ...(threadReview ? ["thread_uncertain"] : []),
      ...(threadEscalation && !decision?.escalated ? ["escalation"] : []),
      ...(!decision && escalationTerms.length > 0 ? ["escalation"] : []),
    ];
    const escalated =
      Boolean(decision?.escalated) || threadEscalation || (!decision && escalationTerms.length > 0);

    if (createNew && decision) {
      step(
        {
          step: "classified",
          label: "Classified",
          detail: classification
            ? `${config.categories.find((c) => c.key === classification?.category)?.label ?? classification.category} · ${Math.round(classification.confidence * 100)}%`
            : classifierFailed
              ? "AI failed: used the mailbox default"
              : "Not classified",
          state: classifierFailed ? "failed" : "done",
        },
        1.8,
      );
      const teamLabel = (k: string) => k.replaceAll("_", " ");
      step(
        {
          step: "routed",
          label: "Routed",
          detail: decision.skip
            ? "Spam: no ticket"
            : `${teamLabel(decision.team)}${decision.rerouted ? ` (rerouted from ${teamLabel(decision.originalTeam)})` : ""}${decision.needsReview ? " · Needs review" : ""}`,
          state: "done",
        },
        2,
      );
    } else if (context) {
      step(
        {
          step: "classified",
          label: "Thread decision",
          detail: `${context.replyType.replace("_", " ")} · ${Math.round(context.confidence * 100)}%`,
          state: "done",
        },
        1.8,
      );
    }

    const logDecision = {
      threadId: existingCase?.threadId ?? null,
      matchMethod: match.method,
      replyType: context?.replyType ?? null,
      customerMatchMethod: customer.method,
      customerFlags: customer.flags,
      customerId: customer.customerId,
      category: decision?.category ?? existingCase?.category ?? null,
      categoryConfidence: confidence,
      priority: decision?.priority ?? null,
      summary: classification?.summary ?? context?.updatedSummary ?? null,
      aiReason: classification?.reason ?? context?.reason ?? null,
      escalated,
      escalationReason:
        decision?.escalationReason ??
        (escalationTerms.length > 0 ? `Mentions ${escalationTerms.join(", ")}` : null),
      originalTeam: decision?.originalTeam ?? null,
      routedTeam: decision?.team ?? existingCase?.teamKey ?? null,
      rerouted: decision?.rerouted ?? false,
      needsReview,
      reviewReasons,
    };

    // Spam: skip without a ticket.
    if (decision?.skip && !appendTo) {
      return finish(
        { ...logDecision, action: "skipped", skipReason: "spam", needsReview: false },
        { status: "skipped", action: "skipped", ticketKey: null },
      );
    }

    // 12. Shadow gate: record the decision, create nothing.
    if (mailbox.mode === "shadow") {
      step(
        {
          step: "shadow",
          label: "Shadow mode",
          detail: "Decision recorded; no ticket created or reply sent",
          state: "skipped",
        },
        2.2,
      );
      return finish({ ...logDecision, action: null }, { status: "shadow", action: null, ticketKey: null });
    }

    // Thread record (one per conversation).
    const conversationId = msg.conversationId ?? `conv:${msg.internetMessageId}`;
    let threadId = existingCase?.threadId ?? null;
    if (!threadId) {
      const [thread] = await tx
        .insert(schema.emailThreads)
        .values({
          workspaceId: ws,
          conversationId,
          rootInternetMessageId: msg.internetMessageId,
          customerId: customer.customerId,
          normalizedSubject: normalizeSubject(msg.subject, config.threading.ticketPattern),
          category: decision?.category ?? null,
          lastMessageAt: receivedAt,
          createdAt: receivedAt,
        })
        .onConflictDoUpdate({
          target: [schema.emailThreads.workspaceId, schema.emailThreads.conversationId],
          set: { lastMessageAt: receivedAt },
        })
        .returning({ id: schema.emailThreads.id });
      threadId = thread?.id ?? null;
    }
    if (!threadId) throw new ProcessingError("transient", "Could not record the thread");

    // 13. Destination writes, each with its step flag.
    const flags = {
      stepTicket: false,
      stepAppended: false,
      stepReopened: false,
      stepLinked: false,
      stepAck: false,
    };
    let action: string | null = null;
    let primary: CaseRef | null = null;
    let created: CaseRef | null = null;

    if (appendTo) {
      await deps.destination.appendMessage(tx, {
        caseId: appendTo.id,
        emailLogId,
        message: msg,
        at: clock(3),
      });
      flags.stepAppended = true;
      action = "appended";
      primary = appendTo;
      if (reopen) {
        await deps.destination.reopen(tx, { caseId: appendTo.id, at: clock(3) });
        flags.stepReopened = true;
        action = "reopened";
      }
      if (threadEscalation) {
        await deps.destination.route(tx, {
          caseId: appendTo.id,
          team: config.escalation.team,
          priority: "urgent",
          escalated: true,
          needsReview: true,
          reason: "Customer escalated on an existing ticket",
          at: clock(3),
        });
      } else if (threadReview) {
        await deps.destination.route(tx, {
          caseId: appendTo.id,
          team: appendTo.teamKey ?? config.escalation.team,
          priority: raisePriority("medium", 0),
          escalated: false,
          needsReview: true,
          reason: "Thread decision needs review",
          at: clock(3),
        });
      }
    }

    if (createNew && decision) {
      created = await deps.destination.createCase(tx, {
        workspaceId: ws,
        mailboxId: mailbox.id,
        emailLogId,
        threadId: linkTo ? await newThreadFor(tx, threadId, linkTo) : threadId,
        customerId: customer.customerId,
        message: msg,
        category: decision.category,
        team: decision.team,
        priority: decision.priority,
        confidence,
        reason:
          classification?.reason ?? (classifierFailed ? "AI failed; routed to the mailbox default" : null),
        summary:
          (context?.decision === "mixed" ? context.newIssueSummary : null) ?? classification?.summary ?? null,
        needsReview: decision.needsReview,
        escalated: decision.escalated,
        relatedCaseId: linkTo?.id ?? null,
        at: clock(3),
      });
      flags.stepTicket = true;
      // A mixed reply is appended to the old ticket and opens a new linked one; the new ticket is primary.
      action = linkTo ? "new_linked_ticket" : "created_ticket";
      if (linkTo) {
        await deps.destination.linkRelated(tx, {
          caseId: created.id,
          relatedCaseId: linkTo.id,
          at: clock(3),
        });
        flags.stepLinked = true;
      }
      primary = created;
    }

    const ticketDetail = created
      ? `${created.key} created${linkTo ? `, linked to ${linkTo.key}` : ""}${appendTo ? `; message added to ${appendTo.key}` : ""}`
      : appendTo
        ? `Added to ${appendTo.key}${reopen ? " (reopened)" : ""}`
        : "No ticket";
    step({ step: "ticket", label: "Ticket", detail: ticketDetail, state: "done" }, 3);

    // 14. Acknowledgement: new tickets only, never for closures, spam, internal senders or shadow mode.
    const ackAllowed = created && config.ack.enabled && mailbox.ackEnabled && !decision?.skip;
    if (created && ackAllowed) {
      const template = config.ack.templates[created.category ?? ""] ?? config.ack.templates.default;
      const values = {
        customer_first_name: (msg.fromName ?? "").split(" ")[0] || "there",
        ticket_number: created.key,
        team_name: created.teamName ?? "",
        business_hours: config.ack.businessHours,
        signature: config.ack.signature,
        subject: msg.subject.replace(/^(re|fw|fwd):\s*/i, ""),
      };
      const sent = await deps.acknowledger.send(tx, {
        workspaceId: ws,
        caseId: created.id,
        emailLogId,
        mailboxAddress: mailbox.address,
        to: msg.from,
        subject: renderTemplate(template.subject, values),
        body: renderTemplate(template.body, values),
        at: clock(4),
      });
      flags.stepAck = true;
      await tx
        .insert(schema.messageIndex)
        .values({
          workspaceId: ws,
          internetMessageId: sent.internetMessageId,
          threadId: created.threadId ?? threadId,
          ticketId: created.id,
        })
        .onConflictDoNothing();
      step(
        {
          step: "acknowledged",
          label: "Acknowledged",
          detail: `Sent from ${mailbox.address}`,
          state: "done",
        },
        4,
      );
    } else {
      step(
        {
          step: "acknowledged",
          label: "Acknowledged",
          detail: created
            ? "Acknowledgement turned off for this mailbox"
            : "Not needed for a reply on an existing ticket",
          state: "skipped",
        },
        4,
      );
    }

    // 15. Finalize: message index, thread, review.
    await tx
      .insert(schema.messageIndex)
      .values({
        workspaceId: ws,
        internetMessageId: msg.internetMessageId,
        threadId: primary?.threadId ?? threadId,
        ticketId: primary?.id ?? null,
      })
      .onConflictDoNothing();
    await tx
      .update(schema.emailThreads)
      .set({
        ticketId: sql`coalesce(${schema.emailThreads.ticketId}, ${primary?.id ?? null}::uuid)`,
        messageCount: sql`${schema.emailThreads.messageCount} + 1`,
        rollingSummary:
          context?.updatedSummary ?? classification?.summary ?? sql`${schema.emailThreads.rollingSummary}`,
        lastMessageAt: receivedAt,
      })
      .where(eq(schema.emailThreads.id, threadId));

    if (needsReview) {
      await tx
        .insert(schema.reviews)
        .values({
          workspaceId: ws,
          emailLogId,
          ticketId: created?.id ?? primary?.id ?? null,
          reasons: reviewReasons,
          createdAt: clock(4),
        })
        .onConflictDoNothing();
    }

    return finish(
      {
        ...logDecision,
        threadId,
        action,
        ticketId: primary?.id ?? null,
        ticketKey: primary?.key ?? null,
        relatedTicketId: linkTo?.id ?? null,
        ackSent: flags.stepAck,
        ...flags,
      },
      { status: "processed", action, ticketKey: created?.key ?? primary?.key ?? null },
    );
  }

  /** A new linked ticket gets its own thread record so its summary starts fresh (spec §8.5). */
  async function newThreadFor(tx: Tx, _parentThreadId: string, linked: CaseRef): Promise<string> {
    const [thread] = await tx
      .insert(schema.emailThreads)
      .values({
        workspaceId: ws,
        conversationId: `conv:${msg.internetMessageId}:new-issue`,
        rootInternetMessageId: msg.internetMessageId,
        relatedTicketIds: [linked.id],
        normalizedSubject: normalizeSubject(msg.subject, config.threading.ticketPattern),
        lastMessageAt: receivedAt,
      })
      .onConflictDoUpdate({
        target: [schema.emailThreads.workspaceId, schema.emailThreads.conversationId],
        set: { lastMessageAt: receivedAt },
      })
      .returning({ id: schema.emailThreads.id });
    if (!thread) throw new ProcessingError("transient", "Could not record the thread");
    return thread.id;
  }
}

export type { TenantConfig };
