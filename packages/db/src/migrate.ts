import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../drizzle", import.meta.url));

/**
 * Apply migrations as the owner role, then give the runtime roles their login passwords.
 * The RLS migration creates mailnitio_app and mailnitio_auth as NOLOGIN; passwords never live in SQL files.
 */
export async function runMigrations(input: {
  ownerUrl: string;
  appPassword?: string;
  authPassword?: string;
}): Promise<void> {
  const client = new pg.Client({ connectionString: input.ownerUrl });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    for (const [role, password] of [
      ["mailnitio_app", input.appPassword],
      ["mailnitio_auth", input.authPassword],
    ] as const) {
      if (!password) continue;
      // ALTER ROLE cannot take bind parameters, so the password is escaped as a literal.
      await client.query(
        `alter role ${client.escapeIdentifier(role)} with login password ${client.escapeLiteral(password)}`,
      );
    }
  } finally {
    await client.end();
  }
}
