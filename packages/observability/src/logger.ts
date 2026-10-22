import pino, { type DestinationStream, type Logger } from "pino";

export type { Logger };

/**
 * Paths that must never reach logs. Secrets are never logged (architecture rule 8); request bodies with
 * credentials are redacted at source.
 */
export const REDACT_PATHS = [
  "password",
  "*.password",
  "newPassword",
  "*.newPassword",
  "token",
  "*.token",
  "secret",
  "*.secret",
  "*.apiKey",
  "*.clientSecret",
  "*.wrappedDek",
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
];

export function createLogger(
  service: string,
  options: { level?: string; destination?: DestinationStream } = {},
): Logger {
  const pretty =
    !options.destination && process.env.NODE_ENV !== "production" && process.env.LOG_PRETTY !== "false";
  return pino(
    {
      name: service,
      level: options.level ?? process.env.LOG_LEVEL ?? "info",
      redact: { paths: REDACT_PATHS, censor: "[redacted]" },
      base: { service, env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development" },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(pretty
        ? { transport: { target: "pino-pretty", options: { colorize: true, singleLine: true } } }
        : {}),
    },
    options.destination,
  );
}
