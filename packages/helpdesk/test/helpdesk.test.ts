import { industryPacks } from "@mailnitio/config/packs";
import { createEnvelope, generateKek } from "@mailnitio/crypto";
import { createDatabase, type DatabaseHandle, eq, schema, sql } from "@mailnitio/db";
import { processEmail, StubAgents } from "@mailnitio/middleware";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import {
  HelpdeskDestination,
  nextTicketNumber,
  overrideReview,
  SimulatedAcknowledger,
  seedWorkspace,
} from "../src";

const urls = inject("db");
let app: DatabaseHandle;
let auth: DatabaseHandle;
let owner: pg.Client;
const envelope = createEnvelope(generateKek());

let wsA = "";
let wsB = "";
let ownerA = "";
const SAMPLES = 160;

async function createUser(email: string, name: string) {
  const [user] = await auth.db
    .insert(schema.users)
    .values({ email, name, emailVerified: true, twoFactorEnabled: true })
    .returning();
  if (!user) throw new Error("user not created");
  return user.id;
}

beforeAll(async () => {
  app = createDatabase(urls.appUrl, { max: 4 });
  auth = createDatabase(urls.authUrl, { max: 2 });
  owner = new pg.Client({ connectionString: urls.ownerUrl });
  await owner.connect();

  ownerA = await createUser("adaeze@acme-asset.example", "Adaeze Okafor");
  await createUser("halima@acme-power.example", "Halima Bello");

  const a = await seedWorkspace({
    appDb: app,
    authDb: auth,
    envelope,
    pack: industryPacks["financial-services"],
    workspaceName: "Acme Asset Management",
    ownerEmail: "adaeze@acme-asset.example",
    sampleCount: SAMPLES,
  });
  wsA = a.workspaceId;
  const b = await seedWorkspace({
    appDb: app,
    authDb: auth,
    envelope,
    pack: industryPacks.utilities,
    workspaceName: "Acme Electricity Distribution",
    ownerEmail: "halima@acme-power.example",
    sampleCount: 60,
  });
  wsB = b.workspaceId;
});

afterAll(async () => {
  await app?.close();
  await auth?.close();
  await owner?.end();
});

describe("seed", () => {
  it("builds a full demo workspace through the pipeline", async () => {
    const statuses = await app.withTenant(wsA, (tx) =>
      tx
        .select({ status: schema.emailLog.status, n: sql<number>`count(*)::int` })
        .from(schema.emailLog)
        .groupBy(schema.emailLog.status),
    );
    const byStatus = Object.fromEntries(statuses.map((s) => [s.status, s.n]));
    expect(Object.values(byStatus).reduce((a, b) => a + b, 0)).toBe(SAMPLES);
    expect(byStatus.processed).toBeGreaterThan(80);
    expect(byStatus.skipped).toBeGreaterThan(0);
    expect(byStatus.shadow).toBeGreaterThan(0); // statements@ is in shadow mode
    expect(byStatus.processing).toBeUndefined();

    const [counts] = await app.withTenant(wsA, (tx) =>
      tx
        .execute<{ tickets: number; reviews: number; escalated: number; acks: number; runs: number }>(sql`
        select (select count(*)::int from tickets) tickets,
               (select count(*)::int from reviews) reviews,
               (select count(*)::int from tickets where escalated) escalated,
               (select count(*)::int from ticket_messages where direction = 'outbound' and author_type = 'system') acks,
               (select count(*)::int from agent_runs) runs`)
        .then((r) => r.rows),
    );
    expect(counts?.tickets).toBeGreaterThan(60);
    expect(counts?.reviews).toBeGreaterThan(0);
    expect(counts?.escalated).toBeGreaterThan(0);
    expect(counts?.acks).toBeGreaterThan(0);
    expect(counts?.runs).toBeGreaterThan(0);
  });

  it("routes escalations to the escalations team at urgent priority", async () => {
    const rows = await app.withTenant(wsA, (tx) =>
      tx
        .select({ team: schema.teams.key, priority: schema.tickets.priority })
        .from(schema.tickets)
        .innerJoin(schema.teams, eq(schema.teams.id, schema.tickets.teamId))
        .where(eq(schema.tickets.escalated, true)),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.team === "escalations" && r.priority === "urgent")).toBe(true);
  });

  it("is idempotent", async () => {
    const before = await app.withTenant(wsA, (tx) =>
      tx.select({ n: sql<number>`count(*)::int` }).from(schema.tickets),
    );
    const again = await seedWorkspace({
      appDb: app,
      authDb: auth,
      envelope,
      pack: industryPacks["financial-services"],
      workspaceName: "Acme Asset Management",
      sampleCount: SAMPLES,
    });
    expect(again).toMatchObject({ workspaceId: wsA, created: false, processed: 0, skippedExisting: SAMPLES });
    const after = await app.withTenant(wsA, (tx) =>
      tx.select({ n: sql<number>`count(*)::int` }).from(schema.tickets),
    );
    expect(after[0]?.n).toBe(before[0]?.n);
  });
});

describe("pipeline", () => {
  const deps = () => ({
    db: app,
    agents: new StubAgents(),
    destination: new HelpdeskDestination(wsA),
    acknowledger: new SimulatedAcknowledger(),
  });

  async function liveMailbox() {
    const [mailbox] = await app.withTenant(wsA, (tx) =>
      tx.select().from(schema.mailboxes).where(eq(schema.mailboxes.address, "complaints@acmeasset.ng")),
    );
    if (!mailbox) throw new Error("mailbox missing");
    return mailbox;
  }

  it("processes an email once, even when the job runs twice", async () => {
    const mailbox = await liveMailbox();
    const job = {
      workspaceId: wsA,
      mailboxId: mailbox.id,
      source: "simulator" as const,
      message: {
        internetMessageId: "<idempotency-1@test>",
        from: "musa.ibrahim@example.com",
        fromName: "Musa Ibrahim",
        to: [mailbox.address],
        cc: [],
        subject: "Please redeem my units",
        body: "I want to redeem 200,000 from my Money Market Fund units.",
        receivedAt: new Date().toISOString(),
        headers: {},
      },
    };
    const first = await processEmail(deps(), job);
    const second = await processEmail(deps(), job);
    expect(first).toMatchObject({ status: "processed", action: "created_ticket", alreadyProcessed: false });
    expect(second).toMatchObject({
      emailLogId: first.emailLogId,
      alreadyProcessed: true,
      ticketKey: first.ticketKey,
    });
    const tickets = await app.withTenant(wsA, (tx) =>
      tx
        .select()
        .from(schema.tickets)
        .where(eq(schema.tickets.key, first.ticketKey ?? "")),
    );
    expect(tickets).toHaveLength(1);
    // Keyword classification reroutes the email from complaints@ to Redemptions.
    const [log] = await app.withTenant(wsA, (tx) =>
      tx.select().from(schema.emailLog).where(eq(schema.emailLog.id, first.emailLogId)),
    );
    expect(log).toMatchObject({
      category: "redemption",
      routedTeam: "redemptions",
      rerouted: true,
      ackSent: true,
    });
    expect(log?.timeline.map((s) => s.step)).toEqual([
      "received",
      "filtered",
      "thread",
      "customer",
      "classified",
      "routed",
      "ticket",
      "acknowledged",
    ]);

    // A reply to the acknowledgement threads by headers and is appended, not a new ticket.
    const ack = await app.withTenant(wsA, (tx) =>
      tx
        .select({ id: schema.ticketMessages.internetMessageId })
        .from(schema.ticketMessages)
        .where(eq(schema.ticketMessages.emailLogId, first.emailLogId)),
    );
    const ackId = ack.find((m) => m.id?.startsWith("<ack."))?.id;
    const reply = await processEmail(deps(), {
      ...job,
      message: {
        ...job.message,
        internetMessageId: "<idempotency-2@test>",
        subject: "RE: Please redeem my units",
        body: "Any update?",
        inReplyTo: ackId,
      },
    });
    expect(reply).toMatchObject({ status: "processed", action: "appended", ticketKey: first.ticketKey });
  });
});

describe("ticket keys", () => {
  it("allocates unique, sequential keys per workspace under concurrency", async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, () => app.withTenant(wsB, (tx) => nextTicketNumber(tx, wsB))),
    );
    const numbers = results.map((r) => r.number).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(12);
    expect(numbers.at(-1)! - numbers[0]!).toBe(11);
    expect(results.every((r) => r.key === `MN-${r.number}`)).toBe(true);
  });

  it("starts each workspace at MN-1001", async () => {
    const [first] = await app.withTenant(wsA, (tx) =>
      tx.select({ key: schema.tickets.key }).from(schema.tickets).orderBy(schema.tickets.number).limit(1),
    );
    expect(first?.key).toBe("MN-1001");
    const [firstB] = await app.withTenant(wsB, (tx) =>
      tx.select({ key: schema.tickets.key }).from(schema.tickets).orderBy(schema.tickets.number).limit(1),
    );
    expect(firstB?.key).toBe("MN-1001");
  });
});

describe("Needs Review override", () => {
  it("updates the ticket, writes override rows and an audit entry", async () => {
    const [review] = await app.withTenant(wsA, (tx) =>
      tx
        .select({
          id: schema.reviews.id,
          ticketId: schema.reviews.ticketId,
          emailLogId: schema.reviews.emailLogId,
        })
        .from(schema.reviews)
        .where(sql`${schema.reviews.status} = 'open' and ${schema.reviews.ticketId} is not null`)
        .limit(1),
    );
    expect(review).toBeDefined();
    if (!review?.ticketId) return;
    const [kyc] = await app.withTenant(wsA, (tx) =>
      tx.select().from(schema.teams).where(eq(schema.teams.key, "kyc")),
    );

    const result = await app.withTenant(wsA, (tx) =>
      overrideReview(
        tx,
        wsA,
        review.id,
        { category: "kyc_update", note: "Customer is updating their BVN" },
        { userId: ownerA, name: "Adaeze Okafor" },
      ),
    );
    expect(result.changes.map((c) => c.field).sort()).toEqual(expect.arrayContaining(["category"]));

    const [ticket] = await app.withTenant(wsA, (tx) =>
      tx.select().from(schema.tickets).where(eq(schema.tickets.id, review.ticketId!)),
    );
    expect(ticket).toMatchObject({ category: "kyc_update", teamId: kyc?.id });
    const rows = await app.withTenant(wsA, (tx) =>
      tx.select().from(schema.overrides).where(eq(schema.overrides.reviewId, review.id)),
    );
    expect(rows.find((r) => r.field === "category")).toMatchObject({
      newValue: "kyc_update",
      userId: ownerA,
    });
    const [after] = await app.withTenant(wsA, (tx) =>
      tx.select().from(schema.reviews).where(eq(schema.reviews.id, review.id)),
    );
    expect(after?.status).toBe("overridden");
    const audit = await app.withTenant(wsA, (tx) =>
      tx
        .select()
        .from(schema.auditLog)
        .where(
          sql`${schema.auditLog.action} = 'review.overridden' and ${schema.auditLog.targetId} = ${review.emailLogId}`,
        ),
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.actorUserId).toBe(ownerA);
  });

  it("refuses to resolve the same review twice", async () => {
    const [done] = await app.withTenant(wsA, (tx) =>
      tx
        .select({ id: schema.reviews.id })
        .from(schema.reviews)
        .where(eq(schema.reviews.status, "overridden"))
        .limit(1),
    );
    await expect(
      app.withTenant(wsA, (tx) =>
        overrideReview(
          tx,
          wsA,
          done!.id,
          { category: "complaint" },
          { userId: ownerA, name: "Adaeze Okafor" },
        ),
      ),
    ).rejects.toThrow("already been resolved");
  });
});

describe("RLS on helpdesk tables", () => {
  it("never shows workspace B rows to workspace A, on every tenant table", async () => {
    const { rows: tables } = await owner.query<{ table_name: string }>(
      "select table_name from information_schema.columns where table_schema = 'public' and column_name = 'workspace_id' order by 1",
    );
    expect(tables.length).toBeGreaterThan(30);
    let checkedWithData = 0;
    for (const { table_name: table } of tables) {
      const truth = await owner.query<{ a: number; b: number }>(
        `select count(*) filter (where workspace_id = $1)::int a, count(*) filter (where workspace_id = $2)::int b from ${table}`,
        [wsA, wsB],
      );
      const seenByA = await app.withTenant(wsA, (tx) =>
        tx.execute<{ total: number; foreign: number }>(
          sql.raw(
            `select count(*)::int total, count(*) filter (where workspace_id <> '${wsA}')::int "foreign" from ${table}`,
          ),
        ),
      );
      const row = seenByA.rows[0];
      expect({ table, foreign: row?.foreign }).toEqual({ table, foreign: 0 });
      expect({ table, total: row?.total }).toEqual({ table, total: truth.rows[0]?.a });
      if ((truth.rows[0]?.b ?? 0) > 0) checkedWithData++;
    }
    // Make sure the check is meaningful: B actually has rows in most tables.
    expect(checkedWithData).toBeGreaterThan(15);
  });
});
