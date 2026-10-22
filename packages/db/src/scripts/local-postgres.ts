import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

/**
 * Docker-free local Postgres for development: same port, user and database as docker-compose.yml
 * (127.0.0.1:54329, mailnitio_owner / mailnitio), data kept in .local/pgdata at the repo root.
 * Run `pnpm db:local` in its own terminal and leave it running.
 */
const dataDir = fileURLToPath(new URL("../../../../.local/pgdata", import.meta.url));
const fresh = !existsSync(dataDir);
mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "mailnitio_owner",
  password: "mailnitio_owner_dev",
  port: 54329,
  persistent: true,
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("mailnitio");
console.log("Local Postgres running on 127.0.0.1:54329 (database mailnitio). Press Ctrl+C to stop.");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
