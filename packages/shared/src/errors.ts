import { z } from "zod";

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    referenceId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

export type ErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthenticated"
  | "mfa_required"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "captcha_failed"
  | "internal_error";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_failed: 400,
  unauthenticated: 401,
  mfa_required: 403,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  captcha_failed: 400,
  internal_error: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS_BY_CODE[code];
  }
}
