import { AppError, type ErrorBody } from "@mailnitio/shared";
import * as Sentry from "@sentry/node";
import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

/** Every error leaves the API as { error: { code, message, referenceId } }. Never a stack trace. */
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const referenceId = String(request.id);

    if (hasZodFastifySchemaValidationErrors(error)) {
      const body: ErrorBody = {
        error: {
          code: "validation_failed",
          message: "Some fields are missing or invalid.",
          referenceId,
          details: error.validation.map((issue) => ({
            field: issue.instancePath.replace(/^\//, "").replaceAll("/", "."),
            message: issue.message,
          })),
        },
      };
      return reply.status(400).send(body);
    }

    if (error instanceof AppError) {
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message, referenceId, details: error.details } });
    }

    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    if (status === 429) {
      return reply.status(429).send({
        error: {
          code: "rate_limited",
          message: "Too many requests. Wait a moment and try again.",
          referenceId,
        },
      });
    }
    if (status < 500) {
      return reply.status(status).send({
        error: { code: "bad_request", message: "The request could not be processed.", referenceId },
      });
    }

    request.log.error({ err: error }, "unhandled error");
    Sentry.captureException(error, { tags: { referenceId } });
    return reply.status(500).send({
      error: {
        code: "internal_error",
        message: "Something went wrong on our side. Try again, and contact support if it keeps happening.",
        referenceId,
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: "not_found",
        message: "This endpoint does not exist.",
        referenceId: String(request.id),
      },
    });
  });
}
