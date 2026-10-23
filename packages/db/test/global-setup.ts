import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import type { TestProject } from "vitest/node";
import { runMigrations } from "../src/migrate";

declare module "vitest" {
  export interface ProvidedContext {
    db: { ownerUrl: string; appUrl: string; authUrl: string };
  }
}

const APP_PASSWORD = "mailnitio_app_test";
const AUTH_PASSWORD = "mailnitio_auth_test";
const EMBEDDED_PORT = 54339;

function withCredentials(url: string, user: string, password: string): string {
  const parsed = new URL(url);
  parsed.username = user;
  parsed.password = password;
  return parsed.toString();
}

/**
 * Tests run against a real PostgreSQL as the real runtime roles.
 * - CI: TEST_DATABASE_URL_OWNER points at the Postgres service container.
 * - Local: an embedded PostgreSQL is started on port 54339 with a throwaway data directory,
 *   so tests never touch Docker or any other project's database.
 */
export default async function setup(project: TestProject) {
  let ownerUrl = process.env.TEST_DATABASE_URL_OWNER;
  let embedded: EmbeddedPostgres | null = null;
  let dataDir: string | null = null;

  if (!ownerUrl) {
    dataDir = mkdtempSync(join(tmpdir(), "mailnitio-pg-"));
    embedded = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "mailnitio_owner",
      password: "mailnitio_owner_test",
      port: EMBEDDED_PORT,
      persistent: false,
      onLog: () => {},
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase("mailnitio_test");
    ownerUrl = `postgres://mailnitio_owner:mailnitio_owner_test@127.0.0.1:${EMBEDDED_PORT}/mailnitio_test`;
  } else {
    // Start from an empty schema so repeated local runs against a shared server stay deterministic.
    const client = new pg.Client({ connectionString: ownerUrl });
    await client.connect();
    await client.query(
      "drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;",
    );
    await client.end();
  }

  await runMigrations({ ownerUrl, appPassword: APP_PASSWORD, authPassword: AUTH_PASSWORD });

  project.provide("db", {
    ownerUrl,
    appUrl: withCredentials(ownerUrl, "mailnitio_app", APP_PASSWORD),
    authUrl: withCredentials(ownerUrl, "mailnitio_auth", AUTH_PASSWORD),
  });

  return async () => {
    if (embedded) await embedded.stop();
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  };
}
