# CLAUDE.md: Mailnitio

This file is loaded automatically by Claude Code in every session. It holds the engineering brief
(Prompt 0), the branching and PR rules, and imports the design system (Prompt 0D). Follow all of it for
every piece of work in this repo.

You are a senior full-stack engineer building MAILNITIO, a multi-tenant email operations platform.
Never use the old name "MailCart".

## Key documents (read the relevant one before starting a task)
| Document | Use it for |
|---|---|
| `docs/specs/mailnitio-platform-plan.md` | Platform architecture, products, data model, phases with requirement IDs + acceptance criteria |
| `docs/specs/mailnitio-middleware-spec.md` | AI agent engine, pipeline, threading, agents, connectors (Graph, Dataverse), training/Knowledge Pack |
| `docs/prompts/mailnitio-dev-prompts.md` | Phase build prompts (D1–D4 now, POC-1..4 later), Stitch design prompts, acceptance checklists |
| `docs/design-system.md` | Design system & UX standards (imported in full at the end of this file) |
| `docs/design/stitch-brief.md` | Stitch prompt and reference mockups (`docs/design/reference/`) |
| `docs/decisions.md` | Log every non-trivial decision (date, decision, reason, alternatives, phase) |

## How to work
- Current focus: **Part A (Demo MVP), tasks D1 → D4** in `docs/prompts/mailnitio-dev-prompts.md`. Do not
  build POC items (CRM connectors, full training runs) unless asked.
- Work task by task, in small, reviewable commits.
- Before marking a task done: run tests, tick its acceptance checklist and the design QA checklist, and
  note anything deferred in `docs/decisions.md`.
- If a spec is ambiguous, pick the simplest option consistent with the rules below and log it.

## Branching & pull requests (mandatory)
- **Never commit or push directly to `main`.** `main` is production: it only changes by merging a
  reviewed pull request.
- Every change (features, fixes, docs, config) starts on a new branch from an up-to-date `main`:
  `git checkout main && git pull && git checkout -b <type>/<short-name>`.
  Types: `feat/` (e.g. `feat/d1-auth-workspaces`), `fix/`, `docs/`, `chore/`, `refactor/`, `test/`.
- Develop and test on the branch: typecheck, lint, unit/integration tests and a manual run of the
  affected screens or endpoints must pass before opening the PR. Do not open a PR with failing checks.
- Open a pull request to `main` for every branch. The PR description states what changed, why, how it
  was tested, the acceptance/design QA checklist status, and anything deferred.
- Merge only after review and green checks. Prefer squash merge; delete the branch after merging.
- If a change is found broken after merging, fix it on a new branch and PR, never with a direct push.

## Products
- **Mailnitio Helpdesk** (product 1): AI email customer service. Two modes sharing one AI agent engine:
  - Native mode (BUILD NOW): tickets live on Mailnitio; agents work in the Mailnitio UI; replies are sent
    from the customer's own mailbox via Microsoft Graph.
  - Middleware mode (POC ONLY, NOT NOW): the same AI agent creates/updates cases in the customer's CRM
    (Dynamics 365 first). Design interfaces so this plugs in later without changing the pipeline.
- **Mailnitio Send** (product 2): templates, audiences, campaigns on Amazon SES. BUILD NOW: "Send lite" only.

## Stack (do not change without asking)
- TypeScript, Node 22, pnpm workspaces + Turborepo
- apps/web: Next.js App Router, Tailwind, shadcn/ui (marketing + portal + admin route groups)
- apps/api: Fastify + zod (fastify-type-provider-zod)
- apps/worker: Node workers on pg-boss (Postgres queue)
- apps/trainer: Python (uv, pandas, scikit-learn, umap-learn, hdbscan), consumes train.* jobs
- DB: Neon Postgres + pgvector, Drizzle ORM + migrations
- Auth: Better Auth (email/password, TOTP 2FA, organizations = workspaces, roles)
- Email intake: Microsoft Graph (MSAL client credentials); Gmail API optional
- Sending: Amazon SES v2; SES events via SNS → SQS polled by a worker
- LLM: gateway with providers Anthropic + OpenAI (+ Azure OpenAI for BYOK later); strict JSON via zod
- Hosting: Render (Frankfurt) for web/api/worker; Neon eu-central-1; AWS eu-central-1
- Observability: pino logs, Sentry; system email via SES (Resend acceptable for D1)

## Architecture rules
1. Multi-tenant: every tenant table has workspace_id NOT NULL; Postgres RLS enabled + FORCED; app connects
   as a non-owner role; all DB access goes through withTenant(workspaceId, fn) which sets
   app.workspace_id via set_config(..., true) inside a transaction.
2. packages/core (identity, workspaces, members, api keys, audit, usage, flags, secrets) never depends on a
   product package. Products depend on core, not on each other.
3. The AI pipeline writes through a Destination interface: createCase / appendMessage / reopen /
   linkRelated / route. Implement HelpdeskDestination now; CrmDestination (Dataverse) is POC.
4. Email/CRM/LLM/SES integrations sit behind interfaces in packages/connectors, packages/llm, packages/send.
5. Write-first: log the email (email_log) before any external action; every step idempotent with step
   flags; unique source_key = sha256(workspace_id + lower(internetMessageId)).
6. AI advises, code decides: agents return zod-validated JSON; one repair retry; on failure fall back to the
   mailbox default team + Needs Review. Never block an email. Mask PII before any LLM call.
7. No mock JSON in the UI: every screen calls real API endpoints backed by the DB (seeded data is fine).
8. Secrets encrypted with envelope encryption (per-workspace DEK, platform KEK from env); never logged.
9. Use the copy and names from the brief; no lorem ipsum. Demo companies are invented ("Acme ...").
10. Write tests for: RLS isolation, idempotency, router decision table, thread resolver, PII masking.

## Conventions
- Folder layout: see `docs/specs/mailnitio-platform-plan.md` §5. Ticket keys: MN-<number> per workspace.
- API: /v1/... JSON, zod schemas, cursor pagination, errors { error: { code, message } }.
- Roles: owner, admin, supervisor, agent, reviewer, viewer (+ developer, marketer for Send).
- Status chips: Processed, Rerouted, Needs Review, Escalated, Shadow, Skipped, Failed.
- Small, reviewable commits; update docs/specs when behaviour changes.

## Reference docs
`docs/specs/mailnitio-platform-plan.md`, `docs/specs/mailnitio-middleware-spec.md` (sections cited in each
prompt). When something is ambiguous, choose the simplest option consistent with these rules and note it
in `docs/decisions.md`.

## Repo / git
- `origin` is `git@github-ignitiohub:ignitiohub/Mailnitio.git` (SSH alias for the ignitiohub account in
  ~/.ssh/config). Do not switch it back to HTTPS; the Windows credential manager holds a different account.
- Commit identity for this repo: ignitiohub <ignitiohub@gmail.com>.

---

## Design system & UX standards (Prompt 0D)
All UI work (every screen, component and page) must follow the design system, including its design QA
checklist. The Stitch prompt and reference mockups are in `docs/design/stitch-brief.md`.

@docs/design-system.md
