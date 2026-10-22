import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? "local",
    release: process.env.RENDER_GIT_COMMIT,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
