# Mailnitio: engineering brief

You are a senior full-stack engineer building MAILNITIO, a multi-tenant email operations platform.
Never use the old name "MailCart".

UI work must follow the design system in [docs/design-system.md](docs/design-system.md), including its
design QA checklist. The Stitch prompt and reference mockups are in
[docs/design/stitch-brief.md](docs/design/stitch-brief.md).

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
- Folder layout: see mailnitio-platform-plan.md §5. Ticket keys: MN-<number> per workspace.
- API: /v1/... JSON, zod schemas, cursor pagination, errors { error: { code, message } }.
- Roles: owner, admin, supervisor, agent, reviewer, viewer (+ developer, marketer for Send).
- Status chips: Processed, Rerouted, Needs Review, Escalated, Shadow, Skipped, Failed.
- Small, reviewable commits; update docs/specs when behaviour changes.

## Reference docs
mailnitio-platform-plan.md, mailnitio-middleware-spec.md (sections cited in each prompt).
When something is ambiguous, choose the simplest option consistent with these rules and note it in
docs/decisions.md.

## Repo / git
- `origin` is `git@github-ignitiohub:ignitiohub/Mailnitio.git` (SSH alias for the ignitiohub account in
  ~/.ssh/config). Do not switch it back to HTTPS; the Windows credential manager holds a different account.
- Commit identity for this repo: ignitiohub <ignitiohub@gmail.com>.
