import { requireEnv } from "../client";
import { runMigrations } from "../migrate";

await runMigrations({
  ownerUrl: requireEnv("DATABASE_URL_OWNER"),
  appPassword: process.env.APP_DB_PASSWORD,
  authPassword: process.env.AUTH_DB_PASSWORD,
});
console.log("Migrations applied");
