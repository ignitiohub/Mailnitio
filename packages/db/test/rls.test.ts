import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "../src/client";
import * as schema from "../src/schema";

/**
 * RLS isolation suite (architecture rules 1 and 10): workspace A can never read or write workspace B,
 * through any tenant table, as the real mailnitio_app role.
 */

const urls = inject("db");

let app: DatabaseHandle;
let auth: DatabaseHandle;
let owner: pg.Client;

const WS_A = randomUUID();
const WS_B = randomUUID();
const USER_A = randomUUID();
const USER_B = randomUUID();

/** Drizzle wraps driver errors ("Failed query: ..."); the Postgres error is the cause. */
async function expectDenied(promise: Promise<unknown>, pattern = /row-level security|permission denied/) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, "expected the database to refuse this query").toBeInstanceOf(Error);
  const cause = (error as Error & { cause?: Error }).cause;
  expect(cause?.message ?? (error as Error).message).toMatch(pattern);
}

beforeAll(async () => {
  app = createDatabase(urls.appUrl, { max: 2 });
  auth = createDatabase(urls.authUrl, { max: 2 });
  owner = new pg.Client({ connectionString: urls.ownerUrl });
  await owner.connect();

  // Identity and membership are created by the auth role, exactly as sign-up does.
  await auth.db.insert(schema.users).values([
    { id: USER_A, name: "Adaeze Okafor", email: `adaeze+${WS_A}@acme-asset.example` },
    { id: USER_B, name: "Tunde Bakare", email: `tunde+${WS_B}@acme-utilities.example` },
  ]);
  await auth.db.insert(schema.workspaces).values([
    { id: WS_A, name: "Acme Asset Management", slug: `acme-asset-${WS_A.slice(0, 6)}` },
    { id: WS_B, name: "Acme Utilities", slug: `acme-utilities-${WS_B.slice(0, 6)}` },
  ]);
  await auth.db.insert(schema.members).values([
    { workspaceId: WS_A, userId: USER_A, role: "owner" },
    { workspaceId: WS_B, userId: USER_B, role: "owner" },
  ]);

  await owner.query(
    "insert into feature_flags (key, description) values ('helpdesk.shadow_mode', 'Shadow mode') on conflict do nothing",
  );

  // Tenant data for each workspace, written through withTenant.
  for (const [ws, user] of [
    [WS_A, USER_A],
    [WS_B, USER_B],
  ] as const) {
    await app.withTenant(ws, async (tx) => {
      await tx
        .insert(schema.auditLog)
        .values({ workspaceId: ws, actorUserId: user, action: "workspace.created" });
      await tx
        .insert(schema.apiKeys)
        .values({ workspaceId: ws, name: "CI", prefix: "mn_test", keyHash: randomUUID() });
      await tx
        .insert(schema.usageEvents)
        .values({ workspaceId: ws, metric: "helpdesk.email_processed", sourceKey: randomUUID() });
      await tx.insert(schema.workspaceKeys).values({ workspaceId: ws, wrappedDek: `wrapped-${ws}` });
      await tx.insert(schema.invitations).values({
        workspaceId: ws,
        email: `invitee+${ws}@acme.example`,
        role: "agent",
        expiresAt: new Date(Date.now() + 86_400_000),
        inviterId: user,
      });
      await tx
        .insert(schema.featureFlagOverrides)
        .values({ workspaceId: ws, flagKey: "helpdesk.shadow_mode", enabled: ws === WS_A });
    });
  }
});

afterAll(async () => {
  await app?.close();
  await auth?.close();
  await owner?.end();
});

const TENANT_TABLES = [
  ["members", schema.members],
  ["invitations", schema.invitations],
  ["workspace_keys", schema.workspaceKeys],
  ["api_keys", schema.apiKeys],
  ["audit_log", schema.auditLog],
  ["usage_events", schema.usageEvents],
  ["feature_flag_overrides", schema.featureFlagOverrides],
] as const;

describe("database roles", () => {
  it("runs the app as a non-owner role without BYPASSRLS", async () => {
    const { rows } = await owner.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      "select rolsuper, rolbypassrls from pg_roles where rolname in ('mailnitio_app', 'mailnitio_auth')",
    );
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.rolsuper).toBe(false);
      expect(row.rolbypassrls).toBe(false);
    }
    const owners = await owner.query<{ tableowner: string }>(
      "select distinct tableowner from pg_tables where schemaname = 'public'",
    );
    expect(owners.rows.map((r) => r.tableowner)).not.toContain("mailnitio_app");
  });

  it("enables and forces RLS on every table with a workspace_id column", async () => {
    const { rows } = await owner.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      where c.relkind = 'r'
        and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'workspace_id' and not a.attisdropped)
    `);
    expect(rows.length).toBeGreaterThanOrEqual(TENANT_TABLES.length);
    for (const row of rows) {
      expect({ table: row.relname, enabled: row.relrowsecurity, forced: row.relforcerowsecurity }).toEqual({
        table: row.relname,
        enabled: true,
        forced: true,
      });
    }
  });

  it("requires workspace_id NOT NULL on every tenant table", async () => {
    const { rows } = await owner.query<{ table_name: string; is_nullable: string }>(
      "select table_name, is_nullable from information_schema.columns where table_schema = 'public' and column_name = 'workspace_id'",
    );
    for (const row of rows)
      expect({ table: row.table_name, nullable: row.is_nullable }).toEqual({
        table: row.table_name,
        nullable: "NO",
      });
  });
});

describe("tenant isolation", () => {
  it.each(TENANT_TABLES)("%s: workspace A only sees its own rows", async (_name, table) => {
    const rows = await app.withTenant(WS_A, (tx) =>
      tx.select({ workspaceId: table.workspaceId }).from(table),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.workspaceId === WS_A)).toBe(true);
  });

  it.each(TENANT_TABLES)("%s: filtering for workspace B from A returns nothing", async (_name, table) => {
    const rows = await app.withTenant(WS_A, (tx) =>
      tx.select().from(table).where(eq(table.workspaceId, WS_B)),
    );
    expect(rows).toHaveLength(0);
  });

  it("workspaces: A cannot see B", async () => {
    const rows = await app.withTenant(WS_A, (tx) =>
      tx.select({ id: schema.workspaces.id }).from(schema.workspaces),
    );
    expect(rows.map((r) => r.id)).toEqual([WS_A]);
  });

  it("cannot insert rows into another workspace", async () => {
    await expectDenied(
      app.withTenant(WS_A, (tx) =>
        tx.insert(schema.auditLog).values({ workspaceId: WS_B, action: "attack.insert" }),
      ),
    );
    await expectDenied(
      app.withTenant(WS_A, (tx) =>
        tx
          .insert(schema.apiKeys)
          .values({ workspaceId: WS_B, name: "x", prefix: "x", keyHash: randomUUID() }),
      ),
    );
  });

  it("cannot update or delete another workspace's rows", async () => {
    const updated = await app.withTenant(WS_A, (tx) =>
      tx
        .update(schema.apiKeys)
        .set({ name: "hijacked" })
        .where(eq(schema.apiKeys.workspaceId, WS_B))
        .returning(),
    );
    expect(updated).toHaveLength(0);
    const deleted = await app.withTenant(WS_A, (tx) =>
      tx.delete(schema.members).where(eq(schema.members.workspaceId, WS_B)).returning(),
    );
    expect(deleted).toHaveLength(0);
    const stillThere = await app.withTenant(WS_B, (tx) => tx.select().from(schema.members));
    expect(stillThere).toHaveLength(1);
  });

  it("cannot move a row into another workspace", async () => {
    await expectDenied(
      app.withTenant(WS_A, (tx) =>
        tx.update(schema.apiKeys).set({ workspaceId: WS_B }).where(eq(schema.apiKeys.workspaceId, WS_A)),
      ),
    );
  });

  it("cannot rename another workspace", async () => {
    const rows = await app.withTenant(WS_A, (tx) =>
      tx
        .update(schema.workspaces)
        .set({ name: "Hijacked" })
        .where(eq(schema.workspaces.id, WS_B))
        .returning(),
    );
    expect(rows).toHaveLength(0);
  });

  it("sees no tenant rows without withTenant", async () => {
    const rows = await app.db.select().from(schema.auditLog);
    expect(rows).toHaveLength(0);
  });

  it("does not leak the workspace setting to the next transaction on the same connection", async () => {
    const client = await app.pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.workspace_id', $1, true)", [WS_A]);
      await client.query("commit");
      const { rows } = await client.query("select count(*)::int as n from audit_log");
      expect(rows[0].n).toBe(0);
    } finally {
      client.release();
    }
  });

  it("only shows users who are members of the current workspace", async () => {
    const rows = await app.withTenant(WS_A, (tx) => tx.select({ id: schema.users.id }).from(schema.users));
    expect(rows.map((r) => r.id)).toEqual([USER_A]);
  });

  it("rejects a workspace id that is not a UUID", async () => {
    await expect(app.withTenant("' or 1=1 --", async () => null)).rejects.toThrow("workspace UUID");
  });
});

describe("privileges", () => {
  it("keeps the audit log append-only for the app", async () => {
    await expectDenied(app.withTenant(WS_A, (tx) => tx.update(schema.auditLog).set({ action: "edited" })));
    await expectDenied(app.withTenant(WS_A, (tx) => tx.delete(schema.auditLog)));
  });

  it("does not let the app read credentials or sessions", async () => {
    await expectDenied(app.db.select().from(schema.accounts));
    await expectDenied(app.db.select().from(schema.sessions));
    await expectDenied(app.db.select().from(schema.twoFactors));
  });

  it("does not let the app read password-related user columns it was not granted", async () => {
    await expectDenied(
      app.withTenant(WS_A, (tx) =>
        tx.select({ emailVerified: schema.users.emailVerified }).from(schema.users),
      ),
    );
  });
});
