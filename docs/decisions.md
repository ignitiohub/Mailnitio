# Decisions

Choices made where the brief was silent or ambiguous. Newest last. Each entry: what, why, and what would
change it.

## D1: Foundations, website, design system (22 Oct 2026)

### Reference docs not available

`mailnitio-platform-plan.md` (§5 folder layout, §7 core tables) and §4/§5 of the D1 brief (pricing, app
sidebar) were not in the repository. The layout follows the stack list in CLAUDE.md; tables follow the D1
task list; the sidebar follows the approved Stitch dashboard. **Revisit when the plan is added.**

### Pricing figures are a draft

`packages/config/src/pricing.ts` holds placeholder plans and prices (Helpdesk ~₦12–15 per processed email,
Send ₦2.50 per email, derived from the Stitch mockup). NGN and USD are set explicitly per plan; there is no
FX conversion. Pricing is editable only in that file.

### Three database roles

- **owner**: migrations only (`DATABASE_URL_OWNER`).
- **mailnitio_app**: API and worker. Non-owner, `NOBYPASSRLS`; tenant tables are visible only inside
  `withTenant()`.
- **mailnitio_auth**: Better Auth only. Better Auth must read memberships across workspaces (sign-up,
  invitations, session workspace), which `withTenant` cannot express. Instead of `BYPASSRLS` (not grantable
  on Neon), the role gets explicit `auth_service` policies on identity and membership tables.

Roles are created `NOLOGIN` in migration `0001_rls.sql`; the migrate script sets passwords from
`APP_DB_PASSWORD` / `AUTH_DB_PASSWORD`, so no secret is in SQL. New tenant tables must add grants,
`ENABLE` + `FORCE` RLS and a `tenant_isolation` policy; the RLS suite fails if any `workspace_id` table
is missing forced RLS.

### `users` is visible to the app only for current members

The app role has a column-level grant on display fields and an RLS policy limiting rows to members of the
current workspace. Sessions, accounts and two-factor secrets are not readable by the app at all.

### Platform tables are not tenant tables

`leads`, `waitlist` and `feature_flags` have no workspace. They are accessed with `withPlatform()`.
Per-workspace flag values live in `feature_flag_overrides` (tenant table, RLS).

### Auth events in the audit log

`audit_log.workspace_id` is NOT NULL. User-level auth events (sign-in, MFA, password changes) are recorded
against the session's active workspace; events with no workspace are logged with pino only.

### Every sign-up creates a workspace

As the brief says. An invited person who signs up therefore also gets their own empty workspace before
accepting the invitation. Acceptable for D1; revisit with invitation-first sign-up.

### MFA enforcement

Owners and admins without TOTP get `403 mfa_required` on every workspace API except `/v1/me`; the web app
redirects them to `/setup-2fa`. Enforcement is server-side, so it cannot be bypassed from the UI.

### Same-origin API through the web app

The browser only talks to the web origin; Next.js rewrites `/api/auth/*` and `/v1/*` to the API (on
Render, over the private network via `API_HOSTPORT`). `onrender.com` is a public suffix, so cookies cannot
be shared between `*-web` and `*-api` subdomains; proxying keeps auth cookies first-party.

### Lead notifications through the worker

`POST /v1/leads` stores the lead first, then enqueues `leads.notify` (pg-boss). The worker sends the team
email, the optional Slack message and the requester confirmation, each guarded by its own timestamp so
retries never send twice. A 15-minute sweep re-enqueues leads whose notification never completed.

### Tooling

- **Biome** for lint and format (the brief does not name a linter; one fast tool for TS, JSX, CSS, JSON).
- **TypeScript 5.9**, not 7: Next.js and the Drizzle/Better Auth toolchains rely on the TypeScript JS API.
- **TanStack Table v8**, not v9: v8 is the documented, stable API.
- **Tests run on embedded PostgreSQL** locally (port 54339, throwaway data) and on a Postgres service
  container in CI, so the RLS suite does not depend on Docker.
- **Node**: `.nvmrc` and Render pin Node 22. Local development also works on Node 24.

### Local services do not collide with other projects

`docker-compose.yml` uses project, container, volume and network names prefixed `mailnitio` and binds
Postgres to `127.0.0.1:54329`. `pnpm db:local` runs the same database without Docker. Web uses port 3400
and the API 3401.

### Copy that needs sign-off before production

Legal pages (`/legal/*`), security claims (customer-hosted option, retention schedule) and industry
outcome figures are drafts written for staging and need legal and commercial review.
