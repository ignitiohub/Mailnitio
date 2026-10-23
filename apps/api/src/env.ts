import { z } from "zod";

/** Empty variables (e.g. `SENTRY_DSN=` in .env or an unset Render secret) count as unset. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "staging", "production", "test"]).default("local"),
  PORT: z.coerce.number().int().default(3401),
  HOST: z.string().default("0.0.0.0"),
  /** Runtime connection as mailnitio_app (RLS enforced). */
  DATABASE_URL: z.string().url(),
  /** Runtime connection as mailnitio_auth (Better Auth tables). */
  DATABASE_URL_AUTH: z.string().url(),
  MAILNITIO_KEK: z.string().min(40),
  BETTER_AUTH_SECRET: z.string().min(32),
  /** Public origin of the API as seen by browsers (through the web app's rewrite). */
  API_PUBLIC_URL: z.string().url().default("http://localhost:3400"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3400"),
  TURNSTILE_SECRET_KEY: optional(z.string()),
  LEADS_NOTIFY_EMAIL: z.string().email().default("sales@mailnitio.com"),
  SENTRY_DSN: optional(z.string().url()),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid API environment: ${fields}`);
  }
  return parsed.data;
}
