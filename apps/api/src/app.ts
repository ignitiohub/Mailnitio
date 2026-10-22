import { randomUUID } from "node:crypto";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Auth } from "@mailnitio/auth";
import type { DatabaseHandle } from "@mailnitio/db";
import type { Logger } from "@mailnitio/observability";
import Fastify, { type FastifyBaseLogger } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { registerAuthRoutes } from "./plugins/auth-routes";
import { registerErrorHandling } from "./plugins/errors";
import { createWorkspaceGuard } from "./plugins/session";
import type { JobQueue } from "./queue";
import { healthRoutes } from "./routes/health";
import { leadRoutes } from "./routes/leads";
import { workspaceRoutes } from "./routes/workspace";
import type { CaptchaVerifier } from "./turnstile";

export interface AppDeps {
  logger: Logger;
  appDb: DatabaseHandle;
  auth: Auth;
  queue: JobQueue;
  verifyCaptcha: CaptchaVerifier;
  publicUrl: string;
  version: string;
}

export async function buildApp(deps: AppDeps) {
  const app = Fastify({
    loggerInstance: deps.logger as FastifyBaseLogger,
    trustProxy: true,
    genReqId: () => `req_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
    requestIdHeader: false,
    bodyLimit: 256 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  registerErrorHandling(app);
  registerAuthRoutes(app, deps.auth, deps.publicUrl);

  const guard = createWorkspaceGuard({ auth: deps.auth, appDb: deps.appDb });
  await app.register(healthRoutes({ appDb: deps.appDb, version: deps.version }));
  await app.register(leadRoutes({ appDb: deps.appDb, queue: deps.queue, verifyCaptcha: deps.verifyCaptcha }));
  await app.register(workspaceRoutes({ appDb: deps.appDb, guard }));

  return app;
}
