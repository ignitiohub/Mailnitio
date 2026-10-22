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

## Getting started

Setup instructions will be added in task D1 (monorepo scaffold).

## Contributing

`main` is production. Never push to it directly: create a branch (`feat/...`, `fix/...`, `docs/...`),
test your change there, and open a pull request. See [CLAUDE.md](CLAUDE.md#branching--pull-requests-mandatory).
