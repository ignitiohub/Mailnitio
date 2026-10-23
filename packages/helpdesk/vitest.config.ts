import { defineConfig } from "vitest/config";

// Own embedded Postgres port and database so this suite never collides with packages/db's.
process.env.MAILNITIO_TEST_PG_PORT ??= "54340";
process.env.MAILNITIO_TEST_DB_SUFFIX ??= "helpdesk";

export default defineConfig({
  test: {
    globalSetup: ["../db/test/global-setup.ts"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
