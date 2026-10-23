import { createAuth } from "@mailnitio/auth";
import { createEnvelope } from "@mailnitio/crypto";
import { createDatabase } from "@mailnitio/db";
import { createLogger, initSentry } from "@mailnitio/observability";
import { buildApp } from "./app";
import { loadEnv } from "./env";
import { createJobQueue } from "./queue";
import { LEAD_NOTIFY_QUEUE } from "./routes/leads";
import { createTurnstileVerifier } from "./turnstile";

const env = loadEnv();
const version = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "dev";
initSentry({ dsn: env.SENTRY_DSN, service: "api", environment: env.APP_ENV, release: version });
const logger = createLogger("api", { level: env.LOG_LEVEL });

const appDb = createDatabase(env.DATABASE_URL);
const authDb = createDatabase(env.DATABASE_URL_AUTH, { max: 5 });
const envelope = createEnvelope(env.MAILNITIO_KEK);
const auth = createAuth({
  database: authDb,
  envelope,
  logger,
  baseURL: env.API_PUBLIC_URL,
  webOrigin: env.WEB_ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
});
const queue = await createJobQueue(env.DATABASE_URL, [LEAD_NOTIFY_QUEUE]);

const app = await buildApp({
  logger,
  appDb,
  auth,
  queue,
  verifyCaptcha: createTurnstileVerifier(env.TURNSTILE_SECRET_KEY),
  publicUrl: env.API_PUBLIC_URL,
  version,
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "shutting down");
  await app.close();
  await queue.stop();
  await Promise.all([appDb.close(), authDb.close()]);
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ port: env.PORT, host: env.HOST });
