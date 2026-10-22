# Mailnitio

AI email operations platform: **Helpdesk** (AI email customer service) and **Send** (templates and bulk
email). Engineering rules are in [CLAUDE.md](CLAUDE.md), the design system in
[docs/design-system.md](docs/design-system.md) and decisions in [docs/decisions.md](docs/decisions.md).

## Repository layout

```
apps/
  web/       Next.js: marketing site, auth, app shell, /design-system      (port 3400)
  api/       Fastify + zod: /v1 API and Better Auth at /api/auth           (port 3401)
  worker/    pg-boss jobs (lead notifications)
packages/
  config/    Typed site content: navigation, pricing, industries
  core/      Audit, usage, flags, workspaces, system email
  auth/      Better Auth: email/password, TOTP, workspaces, roles
  db/        Drizzle schema, migrations, RLS, withTenant()
  crypto/    Envelope encryption (per-workspace DEK, platform KEK)
  ui/        Design tokens and components
  shared/    Roles, statuses, API errors, pagination, shared schemas
  observability/  pino logger, Sentry
infra/render.yaml   Render Blueprint (Frankfurt)
```

## Local development

Requirements: Node 22+, pnpm 10.

```bash
pnpm install
cp .env.example .env          # then fill MAILNITIO_KEK and BETTER_AUTH_SECRET (commands are in the file)

# Database: either Docker...
docker compose up -d          # container "mailnitio-postgres" on 127.0.0.1:54329
# ...or without Docker (leave running in its own terminal)
pnpm db:local

pnpm db:migrate               # applies migrations and sets the runtime role passwords
pnpm dev                      # web on :3400, API on :3401, worker
```

Without `RESEND_API_KEY`, system emails (verification links, password resets) are printed to the API log.
Without Turnstile keys, the demo form skips the captcha check.

## Checks

```bash
pnpm lint        # Biome
pnpm typecheck
pnpm test        # includes the RLS isolation suite on embedded PostgreSQL
pnpm build
```

CI runs the same four steps on every pull request.

## Staging (Render + Neon)

1. Neon project in `eu-central-1` with branches `dev` and `staging`. Use the owner connection string for
   `DATABASE_URL_OWNER`; `DATABASE_URL` connects as `mailnitio_app` and `DATABASE_URL_AUTH` as
   `mailnitio_auth` with the passwords you set in `APP_DB_PASSWORD` / `AUTH_DB_PASSWORD`.
2. Render: New Blueprint Instance from `infra/render.yaml`, then fill every `sync: false` variable.
   `API_PUBLIC_URL`, `WEB_ORIGIN` and `NEXT_PUBLIC_SITE_URL` are the web service URL.
3. The API runs migrations before each deploy (`preDeployCommand`).
