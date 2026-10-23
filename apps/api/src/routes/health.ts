import { type DatabaseHandle, sql } from "@mailnitio/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const healthRoutes =
  (deps: { appDb: DatabaseHandle; version: string }): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/health",
      {
        config: { rateLimit: false },
        schema: {
          response: {
            200: z.object({ status: z.literal("ok"), version: z.string(), database: z.literal("ok") }),
            503: z.object({
              status: z.literal("degraded"),
              version: z.string(),
              database: z.literal("unreachable"),
            }),
          },
        },
      },
      async (_request, reply) => {
        try {
          await deps.appDb.db.execute(sql`select 1`);
          return { status: "ok" as const, version: deps.version, database: "ok" as const };
        } catch {
          return reply
            .status(503)
            .send({ status: "degraded" as const, version: deps.version, database: "unreachable" as const });
        }
      },
    );
  };
