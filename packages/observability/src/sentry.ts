import * as Sentry from "@sentry/node";

/** Initialise Sentry for Node services. No DSN (local development) means Sentry stays off. */
export function initSentry(options: {
  dsn?: string;
  service: string;
  environment: string;
  release?: string;
}) {
  if (!options.dsn) return false;
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    serverName: options.service,
    tracesSampleRate: 0.1,
    initialScope: { tags: { service: options.service } },
    beforeSend(event) {
      // Never send request bodies or cookies; they can contain customer email content or credentials.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
  return true;
}
