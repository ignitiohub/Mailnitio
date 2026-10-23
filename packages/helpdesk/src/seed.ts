import { generateSamples, type IndustryPack, type SampleEmail } from "@mailnitio/config/packs";
import type { Envelope } from "@mailnitio/crypto";
import { and, type DatabaseHandle, eq, inArray, schema, sql, type Tx } from "@mailnitio/db";
import { type ProcessEmailJob, processEmail, StubAgents } from "@mailnitio/middleware";
import { HelpdeskDestination, SimulatedAcknowledger } from "./destination";

/**
 * Builds a demo workspace from an industry pack by running every sample email through the real pipeline
 * (with the D2 stub agents), backdated over 30 days. Idempotent: emails already processed are skipped by
 * their source key, and follow-ups (assignments, replies, notes) are applied only to newly processed emails.
 */

export interface SeedOptions {
  appDb: DatabaseHandle;
  /** Auth-role connection: creates the workspace, demo users and memberships, as sign-up does. */
  authDb: DatabaseHandle;
  envelope: Envelope;
  pack: IndustryPack;
  workspaceName: string;
  /** Existing user to make owner when the workspace is created (and to give some tickets). */
  ownerEmail?: string;
  reset?: boolean;
  sampleCount?: number;
  now?: Date;
  onProgress?: (done: number, total: number) => void;
}

export interface SeedResult {
  workspaceId: string;
  created: boolean;
  processed: number;
  skippedExisting: number;
  tickets: number;
  durationMs: number;
}

const SLA_DEFAULTS = [
  { priority: "urgent", name: "Urgent", firstResponseMins: 60, resolutionMins: 480 },
  { priority: "high", name: "High", firstResponseMins: 240, resolutionMins: 1440 },
  { priority: "medium", name: "Medium", firstResponseMins: 480, resolutionMins: 2880 },
  { priority: "low", name: "Low", firstResponseMins: 1440, resolutionMins: 5760 },
];

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function seedWorkspace(options: SeedOptions): Promise<SeedResult> {
  const started = Date.now();
  const now = options.now ?? new Date();
  const { appDb, authDb, pack } = options;

  // 1. Workspace, owner, demo users and memberships (auth role, like sign-up).
  const { workspaceId, created, ownerId, agentIds } = await authDb.db.transaction(async (tx) => {
    let [workspace] = await tx
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.name, options.workspaceName))
      .limit(1);
    let ownerId: string | null = null;
    if (options.ownerEmail) {
      const [owner] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, options.ownerEmail.toLowerCase()));
      if (!owner)
        throw new Error(`No user with email ${options.ownerEmail}. Sign up first, then run the seed.`);
      ownerId = owner.id;
    }
    let wasCreated = false;
    if (!workspace) {
      if (!ownerId) throw new Error("The workspace does not exist yet: pass --owner <email> to create it.");
      [workspace] = await tx
        .insert(schema.workspaces)
        .values({
          name: options.workspaceName,
          slug: `${slug(options.workspaceName)}-${crypto.randomUUID().slice(0, 6)}`,
          country: "Nigeria",
          industry: pack.config.industry,
          productInterest: "both",
          onboardedAt: now,
        })
        .returning({ id: schema.workspaces.id });
      if (!workspace) throw new Error("Workspace was not created");
      await tx.insert(schema.workspaceKeys).values({
        workspaceId: workspace.id,
        wrappedDek: options.envelope.createWorkspaceKey(workspace.id),
      });
      wasCreated = true;
    }
    if (ownerId) {
      await tx
        .insert(schema.members)
        .values({ workspaceId: workspace.id, userId: ownerId, role: "owner" })
        .onConflictDoNothing();
    }
    // Demo colleagues. They have no password, so they cannot sign in; they appear as assignees and authors.
    const agentIds = new Map<string, string>();
    for (const agent of pack.agents) {
      const [user] = await tx
        .insert(schema.users)
        .values({ name: agent.name, email: agent.email.toLowerCase(), emailVerified: true })
        .onConflictDoUpdate({ target: schema.users.email, set: { name: agent.name } })
        .returning({ id: schema.users.id });
      if (!user) continue;
      agentIds.set(agent.email.toLowerCase(), user.id);
      await tx
        .insert(schema.members)
        .values({ workspaceId: workspace.id, userId: user.id, role: agent.role })
        .onConflictDoNothing();
    }
    return { workspaceId: workspace.id, created: wasCreated, ownerId, agentIds };
  });

  // 2. Reset (optional): clear helpdesk data. Identity, members, the audit log and usage events (append-only
  // billing records) are kept; usage is keyed by source key, so re-seeded emails are not counted twice.
  if (options.reset) {
    await appDb.withTenant(workspaceId, async (tx) => {
      await tx.delete(schema.reviews);
      await tx.delete(schema.emailLog);
      await tx.delete(schema.notifications);
      await tx.delete(schema.tickets);
      await tx.delete(schema.messageIndex);
      await tx.delete(schema.emailThreads);
      await tx.delete(schema.customerEmails);
      await tx.delete(schema.customers);
      await tx.delete(schema.ticketCounters);
      await tx.delete(schema.cannedResponses);
      await tx.delete(schema.kbEntries);
      await tx.delete(schema.insightReports);
      await tx.delete(schema.savedViews);
      await tx.delete(schema.teamMembers);
      await tx.delete(schema.teams);
      await tx.delete(schema.slaPolicies);
      await tx.delete(schema.businessHours);
      await tx.delete(schema.mailboxes);
      await tx.delete(schema.connections);
      await tx.delete(schema.configVersions);
    });
  }

  // 3. Configuration, teams, mailboxes and content (tenant role, RLS).
  const mailboxIds = await appDb.withTenant(workspaceId, async (tx) => {
    const [active] = await tx
      .select({ id: schema.configVersions.id })
      .from(schema.configVersions)
      .where(eq(schema.configVersions.status, "active"));
    if (!active) {
      await tx.insert(schema.configVersions).values({
        workspaceId,
        version: 1,
        status: "active",
        config: pack.config as unknown as Record<string, unknown>,
        notes: `Industry pack: ${pack.name}`,
        createdBy: ownerId,
        activatedAt: now,
      });
    }

    const [hours] = await tx
      .insert(schema.businessHours)
      .values({
        workspaceId,
        name: "Standard hours",
        schedule: {
          mon: [["08:00", "17:00"]],
          tue: [["08:00", "17:00"]],
          wed: [["08:00", "17:00"]],
          thu: [["08:00", "17:00"]],
          fri: [["08:00", "17:00"]],
        },
      })
      .returning({ id: schema.businessHours.id });

    for (const team of pack.teams) {
      await tx
        .insert(schema.teams)
        .values({
          workspaceId,
          key: team.key,
          name: team.name,
          emailAlias: team.emailAlias,
          businessHoursId: hours?.id ?? null,
        })
        .onConflictDoNothing();
    }
    const teamRows = await tx.select({ id: schema.teams.id, key: schema.teams.key }).from(schema.teams);
    const teamId = new Map(teamRows.map((t) => [t.key, t.id]));
    for (const agent of pack.agents) {
      const userId = agentIds.get(agent.email.toLowerCase());
      for (const key of agent.teams) {
        const id = teamId.get(key);
        if (userId && id)
          await tx
            .insert(schema.teamMembers)
            .values({ workspaceId, teamId: id, userId })
            .onConflictDoNothing();
      }
    }
    if (ownerId) {
      const escalations = teamId.get(pack.config.escalation.team);
      if (escalations) {
        await tx
          .insert(schema.teamMembers)
          .values({ workspaceId, teamId: escalations, userId: ownerId, role: "lead" })
          .onConflictDoNothing();
      }
    }

    const [hasSla] = await tx.select({ id: schema.slaPolicies.id }).from(schema.slaPolicies).limit(1);
    if (!hasSla) {
      await tx
        .insert(schema.slaPolicies)
        .values(SLA_DEFAULTS.map((p) => ({ ...p, workspaceId, businessHoursId: hours?.id ?? null })));
    }

    for (const mailbox of pack.mailboxes) {
      await tx
        .insert(schema.mailboxes)
        .values({ workspaceId, ...mailbox, health: "ok", lastCheckedAt: now })
        .onConflictDoNothing();
    }

    const [hasCanned] = await tx
      .select({ id: schema.cannedResponses.id })
      .from(schema.cannedResponses)
      .limit(1);
    if (!hasCanned) {
      await tx.insert(schema.cannedResponses).values(
        pack.cannedResponses.map((c) => ({
          workspaceId,
          title: c.title,
          body: c.body,
          teamId: c.team ? (teamId.get(c.team) ?? null) : null,
        })),
      );
    }
    const [hasKb] = await tx.select({ id: schema.kbEntries.id }).from(schema.kbEntries).limit(1);
    if (!hasKb) {
      await tx.insert(schema.kbEntries).values(
        pack.kb.map((k) => ({
          workspaceId,
          topic: k.topic,
          questionVariants: k.questions,
          answer: k.answer,
        })),
      );
    }
    const [hasReport] = await tx
      .select({ id: schema.insightReports.id })
      .from(schema.insightReports)
      .limit(1);
    if (!hasReport) {
      await tx.insert(schema.insightReports).values({
        workspaceId,
        title: pack.insightReport.title,
        data: pack.insightReport as unknown as Record<string, unknown>,
        createdAt: new Date(now.getTime() - 3 * 86_400_000),
      });
    }

    const rows = await tx
      .select({ id: schema.mailboxes.id, address: schema.mailboxes.address })
      .from(schema.mailboxes);
    return new Map(rows.map((m) => [m.address, m.id]));
  });

  // 4. Emails through the pipeline, oldest first.
  const samples = generateSamples(pack, { count: options.sampleCount ?? 500 });
  const deps = {
    db: appDb,
    agents: new StubAgents(),
    destination: new HelpdeskDestination(workspaceId),
    acknowledger: new SimulatedAcknowledger(),
  };
  const messageId = (s: SampleEmail) => `<${s.id}.${workspaceId.slice(0, 8)}@seed.mailnitio.local>`;
  const byId = new Map(samples.map((s) => [s.id, s]));
  const assignees = [...agentIds.values()];
  let processed = 0;
  let skippedExisting = 0;

  for (const [index, sample] of samples.entries()) {
    const mailboxId = mailboxIds.get(sample.mailbox);
    if (!mailboxId) continue;
    const parent = sample.inReplyTo ? byId.get(sample.inReplyTo) : undefined;
    const receivedAt = new Date(now.getTime() - sample.ageMinutes * 60_000);
    const job: ProcessEmailJob = {
      workspaceId,
      mailboxId,
      source: "seed",
      message: {
        internetMessageId: messageId(sample),
        inReplyTo: parent ? messageId(parent) : null,
        references: parent ? [messageId(parent)] : [],
        from: sample.from,
        fromName: sample.fromName,
        to: [sample.mailbox],
        cc: [],
        subject: sample.subject,
        body: sample.body,
        receivedAt: receivedAt.toISOString(),
        headers: sample.headers ?? {},
      },
      precomputed: {
        classifier: sample.classifier,
        context: sample.context,
        aiFails: sample.aiFails,
        processingFails: sample.processingFails,
      },
    };
    const result = await processEmail(deps, job);
    if (result.alreadyProcessed) skippedExisting++;
    else processed++;

    if (!result.alreadyProcessed && sample.followUp && result.status === "processed") {
      await appDb.withTenant(workspaceId, (tx) =>
        applyFollowUp(tx, {
          workspaceId,
          emailLogId: result.emailLogId,
          sample,
          receivedAt,
          now,
          assigneeId:
            ownerId && index % 6 === 0
              ? ownerId
              : (agentIds.get(sample.followUp?.assignee?.toLowerCase() ?? "") ??
                assignees[index % Math.max(1, assignees.length)] ??
                null),
          agentNames: new Map(pack.agents.map((a) => [agentIds.get(a.email.toLowerCase()) ?? "", a.name])),
        }),
      );
    }
    options.onProgress?.(index + 1, samples.length);
  }

  const [ticketCount] = await appDb.withTenant(workspaceId, (tx) =>
    tx.select({ n: sql<number>`count(*)::int` }).from(schema.tickets),
  );
  return {
    workspaceId,
    created,
    processed,
    skippedExisting,
    tickets: ticketCount?.n ?? 0,
    durationMs: Date.now() - started,
  };
}

async function applyFollowUp(
  tx: Tx,
  input: {
    workspaceId: string;
    emailLogId: string;
    sample: SampleEmail;
    receivedAt: Date;
    now: Date;
    assigneeId: string | null;
    agentNames: Map<string, string>;
  },
) {
  const followUp = input.sample.followUp;
  if (!followUp) return;
  const [email] = await tx
    .select({ ticketId: schema.emailLog.ticketId })
    .from(schema.emailLog)
    .where(eq(schema.emailLog.id, input.emailLogId));
  if (!email?.ticketId) return;
  const ticketId = email.ticketId;
  const at = (minutes: number) =>
    new Date(Math.min(input.now.getTime() - 60_000, input.receivedAt.getTime() + minutes * 60_000));
  const assigneeId = input.assigneeId;
  const set: Partial<typeof schema.tickets.$inferInsert> = {};

  if (assigneeId) {
    set.assigneeId = assigneeId;
    set.status = "open";
    await tx.insert(schema.ticketEvents).values({
      workspaceId: input.workspaceId,
      ticketId,
      type: "assignee",
      actorType: "system",
      data: { to: assigneeId },
      createdAt: at(5),
    });
  }
  if (followUp.note && assigneeId) {
    await tx.insert(schema.ticketMessages).values({
      workspaceId: input.workspaceId,
      ticketId,
      direction: "note",
      authorType: "agent",
      authorId: assigneeId,
      fromName: input.agentNames.get(assigneeId) ?? null,
      bodyText: followUp.note.body,
      createdAt: at(followUp.note.afterMinutes),
    });
  }
  if (followUp.reply && assigneeId) {
    const repliedAt = at(followUp.reply.afterMinutes);
    const [ticket] = await tx
      .select({ subject: schema.tickets.subject, key: schema.tickets.key })
      .from(schema.tickets)
      .where(eq(schema.tickets.id, ticketId));
    await tx.insert(schema.ticketMessages).values({
      workspaceId: input.workspaceId,
      ticketId,
      direction: "outbound",
      authorType: "agent",
      authorId: assigneeId,
      fromAddr: input.sample.mailbox,
      fromName: input.agentNames.get(assigneeId) ?? null,
      toAddrs: [input.sample.from],
      subject: `RE: ${ticket?.subject ?? input.sample.subject} [${ticket?.key ?? ""}]`,
      bodyText: followUp.reply.body,
      sentStatus: "simulated",
      createdAt: repliedAt,
    });
    set.firstRespondedAt = repliedAt;
    set.lastMessageAt = repliedAt;
  }
  if (followUp.status) {
    set.status = followUp.status;
    const statusAt = at((followUp.reply?.afterMinutes ?? 30) + 5);
    if (followUp.status === "resolved") set.resolvedAt = statusAt;
    if (followUp.status === "closed") set.closedAt = statusAt;
    await tx.insert(schema.ticketEvents).values({
      workspaceId: input.workspaceId,
      ticketId,
      type: "status",
      actorType: "user",
      actorId: assigneeId,
      data: { to: followUp.status },
      createdAt: statusAt,
    });
  }
  if (Object.keys(set).length > 0) {
    // Only adjust tickets the pipeline left in their initial state (a later email may have reopened them).
    await tx
      .update(schema.tickets)
      .set(set)
      .where(and(eq(schema.tickets.id, ticketId), inArray(schema.tickets.status, ["new", "open"])));
  }
}
