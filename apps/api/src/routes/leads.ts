import { type DatabaseHandle, schema } from "@mailnitio/db";
import { AppError, leadInputSchema } from "@mailnitio/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { JobQueue } from "../queue";
import type { CaptchaVerifier } from "../turnstile";

export const LEAD_NOTIFY_QUEUE = "leads.notify";

/**
 * POST /v1/leads: book-a-demo. Write-first: the lead is stored before any notification is attempted;
 * notifications run in the worker with per-channel idempotency flags.
 */
export const leadRoutes =
  (deps: { appDb: DatabaseHandle; queue: JobQueue; verifyCaptcha: CaptchaVerifier }): FastifyPluginAsyncZod =>
  async (app) => {
    app.post(
      "/v1/leads",
      {
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
        schema: {
          body: leadInputSchema,
          response: { 201: z.object({ data: z.object({ id: z.string().uuid() }) }) },
        },
      },
      async (request, reply) => {
        const { captchaToken, preferredSlot, ...lead } = request.body;
        if (!(await deps.verifyCaptcha(captchaToken, request.ip))) {
          throw new AppError(
            "captcha_failed",
            "We could not confirm you are human. Refresh the page and try again.",
          );
        }

        const [row] = await deps.appDb.withPlatform((tx) =>
          tx
            .insert(schema.leads)
            .values({
              ...lead,
              interest: lead.interest ?? null,
              message: lead.message || null,
              source: lead.source ?? null,
              utm: lead.utm ?? {},
              preferredSlot: preferredSlot ? new Date(preferredSlot) : null,
            })
            .returning({ id: schema.leads.id }),
        );
        if (!row) throw new Error("Lead insert returned no row");

        try {
          await deps.queue.send(LEAD_NOTIFY_QUEUE, { leadId: row.id }, { singletonKey: row.id });
        } catch (error) {
          // The lead is safely stored; a failed enqueue is logged and picked up by the worker's sweep.
          request.log.error({ err: error, leadId: row.id }, "failed to enqueue lead notification");
        }

        return reply.status(201).send({ data: { id: row.id } });
      },
    );
  };
