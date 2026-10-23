import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
// Each package that runs database tests sets its own port and database name in its vitest config.
const EMBEDDED_PORT = Number(process.env.MAILNITIO_TEST_PG_PORT ?? 54339);
const DB_NAME = `mailnitio_test_${process.env.MAILNITIO_TEST_DB_SUFFIX ?? "db"}`;

function withCredentials(url: string, user: string, password: string): string {
  const parsed = new URL(url);
  parsed.username = user;
  parsed.password = password;
  return parsed.toString();
}

/**
 * Tests run against a real PostgreSQL as the real runtime roles.
 * - CI: TEST_DATABASE_URL_OWNER points at the Postgres service container; a fresh database per
 *   package is created on it.
 * - Local: an embedded PostgreSQL is started (port 54339 by default) with a throwaway data directory,
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
      // UTF-8 like Neon; on Windows initdb would otherwise use the system code page.
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      onLog: () => {},
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase(DB_NAME);
    ownerUrl = `postgres://mailnitio_owner:mailnitio_owner_test@127.0.0.1:${EMBEDDED_PORT}/${DB_NAME}`;
  } else {
    // A fresh database per package keeps runs deterministic and isolated on a shared server.
    const client = new pg.Client({ connectionString: ownerUrl });
    await client.connect();
    await client.query(`drop database if exists ${DB_NAME} with (force)`);
    await client.query(`create database ${DB_NAME}`);
    await client.end();
    const url = new URL(ownerUrl);
    url.pathname = `/${DB_NAME}`;
    ownerUrl = url.toString();
  }

  await runMigrations({ ownerUrl, appPassword: APP_PASSWORD, authPassword: AUTH_PASSWORD });

  project.provide("db", {
    ownerUrl,
    appUrl: withCredentials(ownerUrl, "mailnitio_app", APP_PASSWORD),
    authUrl: withCredentials(ownerUrl, "mailnitio_auth", AUTH_PASSWORD),
  });

  return async () => {
    if (embedded && dataDir) {
      // A clean pg_ctl shutdown stops every backend; on Windows the library's process kill can leave
      // Postgres 18 I/O workers running and holding the port.
      try {
        execFileSync(await pgCtlPath(), ["stop", "-D", dataDir, "-m", "fast", "-w", "-t", "30"], {
          stdio: "ignore",
        });
      } catch {
        await embedded.stop();
      }
    }
    if (dataDir) {
      try {
        rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // Windows can hold the directory briefly after shutdown; it is in the OS temp folder.
      }
    }
  };
}

async function pgCtlPath(): Promise<string> {
  const require = createRequire(import.meta.url);
  const pkg = `@embedded-postgres/${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
  const entry = require.resolve(pkg, { paths: [require.resolve("embedded-postgres")] });
  const mod = (await import(pathToFileURL(entry).href)) as { pg_ctl: string };
  return mod.pg_ctl;
}
