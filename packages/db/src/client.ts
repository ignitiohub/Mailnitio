import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;
/** Transaction handle passed to withTenant / withPlatform callbacks. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DatabaseHandle {
  db: Database;
  pool: pg.Pool;
  /**
   * Run `fn` in a transaction scoped to one workspace. Sets app.workspace_id with set_config(..., true)
   * so the setting lasts only for this transaction; RLS policies read it. This is the only way to
   * touch tenant tables (architecture rule 1).
   */
  withTenant<T>(workspaceId: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Run `fn` in a transaction for platform (non-tenant) tables such as leads and feature_flags. */
  withPlatform<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createDatabase(connectionString: string, options: { max?: number } = {}): DatabaseHandle {
  const pool = new pg.Pool({ connectionString, max: options.max ?? 10 });
  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async withTenant(workspaceId, fn) {
      if (!UUID_RE.test(workspaceId)) throw new Error("withTenant requires a workspace UUID");
      return db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`);
        return fn(tx);
      });
    },
    async withPlatform(fn) {
      return db.transaction(async (tx) => fn(tx));
    },
    close: () => pool.end(),
  };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
