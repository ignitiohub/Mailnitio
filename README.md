# Mailnitio

Mailnitio is a multi-tenant email operations platform with two products:

- **Mailnitio Helpdesk**: AI email customer service. Incoming email is classified and routed by an AI
  agent into tickets that agents work in the Mailnitio UI, with replies sent from the customer's own
  mailbox via Microsoft Graph. A Middleware mode (same AI agent, writing cases into the customer's CRM,
  Dynamics 365 first) follows as a proof of concept.
- **Mailnitio Send**: templates, audiences and campaigns on Amazon SES ("Send lite" first).

## Documentation

| Document | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Engineering brief, architecture rules, branching & PR rules (loaded by Claude Code) |
| [docs/specs/mailnitio-platform-plan.md](docs/specs/mailnitio-platform-plan.md) | Platform architecture, products, data model, phases and acceptance criteria |
| [docs/specs/mailnitio-middleware-spec.md](docs/specs/mailnitio-middleware-spec.md) | AI agent engine, pipeline, threading, connectors (Graph, Dataverse), training |
| [docs/prompts/mailnitio-dev-prompts.md](docs/prompts/mailnitio-dev-prompts.md) | Build prompts per task (D1–D4, POC-1..4) and acceptance checklists |
| [docs/design-system.md](docs/design-system.md) | Design system & UX standards, design QA checklist |
| [docs/design/stitch-brief.md](docs/design/stitch-brief.md) | Stitch design prompt and reference mockups |
| [docs/decisions.md](docs/decisions.md) | Decision log |

## Tech stack

- **Monorepo**: TypeScript, Node 22, pnpm workspaces + Turborepo
- **Web**: Next.js App Router, Tailwind, shadcn/ui
- **API**: Fastify + zod
- **Workers**: Node on pg-boss (Postgres queue); Python trainer (uv, scikit-learn, umap-learn, hdbscan)
- **Data**: Neon Postgres + pgvector, Drizzle ORM, row-level security per workspace
- **Auth**: Better Auth (email/password, TOTP 2FA, organisations = workspaces)
- **Integrations**: Microsoft Graph (email intake and sending), Amazon SES v2, Anthropic + OpenAI LLMs
- **Hosting**: Render (Frankfurt), Neon eu-central-1, AWS eu-central-1; pino + Sentry

## Repository layout

```
apps/
  web/            Next.js: marketing site, auth, onboarding, app shell, /design-system   (port 3400)
  api/            Fastify + zod: /v1 API and Better Auth at /api/auth                     (port 3401)
  worker/         pg-boss jobs (lead notifications)
packages/
  config/         Typed site content: navigation, pricing, industries
  core/           Audit, usage, flags, workspaces, system email
  auth/           Better Auth: email/password, TOTP, workspaces, roles
  db/             Drizzle schema, migrations, RLS, withTenant()
  crypto/         Envelope encryption (per-workspace DEK, platform KEK)
  ui/             Design tokens and components
  shared/         Roles, statuses, API errors, pagination, shared schemas
  observability/  pino logger, Sentry
infra/render.yaml Render Blueprint (Frankfurt)
```

## Getting started

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

### Demo data

Load an industry pack into a demo workspace (idempotent; `--reset` wipes and reloads that workspace's
helpdesk data, about 25 s for 500 emails):

```bash
# sign up in the app first, then:
pnpm mailnitio seed --pack financial-services --workspace "Acme Asset Management" --owner you@example.com
# later runs on the same workspace can drop --owner
pnpm mailnitio seed --pack financial-services --workspace "Acme Asset Management" --reset
```

Packs: `financial-services`, `utilities`, `generic`. `--owner` is the email of an existing user and is
required when the workspace does not exist yet. Owners and admins can send more test emails from
**Email simulator** in the portal; the worker must be running to process them.

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

## Contributing

`main` is production. Never push to it directly: create a branch (`feat/...`, `fix/...`, `docs/...`),
test your change there, and open a pull request. See [CLAUDE.md](CLAUDE.md#branching--pull-requests-mandatory).
