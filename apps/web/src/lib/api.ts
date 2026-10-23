import { errorBodySchema } from "@mailnitio/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly referenceId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Fetch a /v1 endpoint on the same origin (proxied to the API). Errors become ApiError with a reference ID. */
export async function apiFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(
      0,
      "network_error",
      "We could not reach Mailnitio. Check your connection and try again.",
    );
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  const parsed = errorBodySchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) {
    const { code, message, referenceId, details } = parsed.data.error;
    throw new ApiError(response.status, code, message, referenceId, details);
  }
  throw new ApiError(
    response.status,
    "internal_error",
    "Something went wrong on our side. Try again in a moment.",
    response.headers.get("x-request-id") ?? undefined,
  );
}

/** Map API validation details to { field: message } for inline form errors. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== "validation_failed" || !Array.isArray(error.details))
    return {};
  const out: Record<string, string> = {};
  for (const item of error.details as { field?: string; message?: string }[]) {
    if (item.field && item.message && !out[item.field]) out[item.field] = item.message;
  }
  return out;
}
