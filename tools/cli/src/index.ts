import { getPack, industryPacks } from "@mailnitio/config/packs";
import { createEnvelope } from "@mailnitio/crypto";
import { createDatabase } from "@mailnitio/db";
import { seedWorkspace } from "@mailnitio/helpdesk";

/**
 * Mailnitio operator CLI.
 *
 *   pnpm mailnitio seed --pack financial-services --workspace "Acme Asset Management" [--owner you@company.com] [--reset] [--count 500]
 */

const USAGE = `Usage:
  pnpm mailnitio seed --pack <${Object.keys(industryPacks).join("|")}> --workspace "<name>" [--owner <email>] [--reset] [--count <n>]

Options:
  --pack        Industry pack to load
  --workspace   Workspace name; created if it does not exist (requires --owner)
  --owner       Email of an existing user to make owner (sign up first)
  --reset       Delete the workspace's helpdesk data before seeding
  --count       Number of sample emails (default 500)`;

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] ?? "";
    if (!arg.startsWith("--")) continue;
    const name = arg.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags[name] = next;
      i++;
    } else {
      flags[name] = true;
    }
  }
  return { command, flags };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set. Copy .env.example to .env at the repo root and fill it in.`);
    process.exit(1);
  }
  return value;
}

async function seed(flags: Record<string, string | boolean>) {
  const pack = typeof flags.pack === "string" ? getPack(flags.pack) : undefined;
  const workspace = typeof flags.workspace === "string" ? flags.workspace : undefined;
  if (!pack || !workspace) {
    console.error(USAGE);
    process.exit(1);
  }
  const count = typeof flags.count === "string" ? Number(flags.count) : 500;
  if (!Number.isInteger(count) || count < 1 || count > 5000) {
    console.error("--count must be a whole number between 1 and 5000");
    process.exit(1);
  }

  const appDb = createDatabase(env("DATABASE_URL"), { max: 4 });
  const authDb = createDatabase(env("DATABASE_URL_AUTH"), { max: 2 });
  try {
    console.log(
      `Seeding "${workspace}" with the ${pack.name} pack (${count} emails)${flags.reset ? ", after reset" : ""}...`,
    );
    let lastPercent = -1;
    const result = await seedWorkspace({
      appDb,
      authDb,
      envelope: createEnvelope(env("MAILNITIO_KEK")),
      pack,
      workspaceName: workspace,
      ownerEmail: typeof flags.owner === "string" ? flags.owner : undefined,
      reset: flags.reset === true,
      sampleCount: count,
      onProgress: (done, total) => {
        const percent = Math.floor((done / total) * 10) * 10;
        if (percent !== lastPercent) {
          lastPercent = percent;
          process.stdout.write(`  ${percent}%\n`);
        }
      },
    });
    console.log(
      `Done in ${(result.durationMs / 1000).toFixed(1)}s: workspace ${result.workspaceId}${result.created ? " (created)" : ""}, ` +
        `${result.processed} emails processed, ${result.skippedExisting} already present, ${result.tickets} tickets.`,
    );
  } finally {
    await Promise.all([appDb.close(), authDb.close()]);
  }
}

const { command, flags } = parseArgs(process.argv.slice(2));
try {
  if (command === "seed") await seed(flags);
  else {
    console.log(USAGE);
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
