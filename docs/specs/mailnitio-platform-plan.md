# Mailnitio — Platform Plan & Phase Specifications

| | |
|---|---|
| **Company / platform** | Mailnitio |
| **Products** | **Mailnitio Helpdesk** (first product): AI email customer service. A mini helpdesk with tickets/cases on the platform, powered by the **AI agent engine**; plus **Middleware mode**, a connector that runs the same AI against the customer's own CRM (the POC) · **Mailnitio Send** (second product): transactional + marketing email (API, templates, campaigns) on Amazon SES |
| **Companion spec** | `mailnitio-middleware-spec.md`: the AI agent engine + Middleware (CRM connector) spec: pipeline, threading, agents, connectors, training, Knowledge Pack. Used by Helpdesk in both modes; depends on the platform core defined here. |
| **Document type** | Infrastructure + spec-driven phase plan |
| **Version** | v1.0 |

---

## Contents

**Part A: Platform**
1. Vision & Products
2. Principles
3. Platform Architecture
4. Infrastructure & Hosting
5. Repository & Code Structure
6. Shared Core Services
7. Core Data Model
8. Identity, Workspaces & Access
9. Security & Compliance Baseline
10. Observability & Operations
11. Environments, CI/CD & Release

**Part B: Products**
12. Website (Marketing + Sign-up)
13. Mailnitio Helpdesk (summary of the companion spec)
14. Live Demo Environment
15. Mailnitio Send (Amazon SES)
16. Billing, Plans & Usage
17. Public API, Webhooks & MCP

**Part C: Phases (spec-driven)**
18. How Phases Are Specified
19. Phase 0: Foundations
20. Phase 1: Website & Accounts
21. Phase 2: Helpdesk + AI Agent Core (Outlook)
22. Phase 3: Live Demo
23. Phase 4: Middleware POC (CRM Sandbox + Training)
24. Phase 5: Send MVP (API + Templates)
25. Phase 6: Billing & Plans
26. Phase 7: Middleware Pilot → Production
27. Phase 8: Send Campaigns
28. Phase 9: Helpdesk Self-Serve (Connect, Config & Training UI)
29. Phase 10: Integrations (API, Webhooks, MCP, Connectors)
30. Phase 11: Enterprise & Scale

**Part D: Delivery**
31. Timeline & Dependencies
32. Team & Responsibilities
33. Cost by Phase
34. Pricing (Initial)
35. Risks & Mitigations
36. Decision Log & Open Questions
37. Glossary

---

# PART A: PLATFORM

## 1. Vision & Products

### 1.1 Vision
Mailnitio is the **email operations platform for businesses**: one platform to **receive and handle** customer email intelligently (Helpdesk, with an AI agent and an optional CRM Middleware) and to **send** transactional and marketing email reliably (Send), with AI, integrations and enterprise controls built in.

### 1.2 Products
| Product | Problem | What it does | Buyer | Sales motion |
|---|---|---|---|---|
| **Mailnitio Helpdesk** (product 1) | Support emails land in the wrong mailbox, every reply becomes a new case, manual sorting, slow answers, no proper ticketing | **Native mode:** a mini helpdesk on Mailnitio (shared inbox → tickets, assignment, replies, SLAs, notes) with an AI agent that routes, threads, acknowledges and answers. **Middleware mode:** the same AI agent connected to the customer's CRM, creating and updating cases there | SMEs and mid-size teams (native); enterprises with a CRM (middleware) | Native: self-serve trial + demo · Middleware: demo → POC → pilot |
| **Mailnitio Send** | Businesses need reliable, affordable sending (OTP, receipts, statements, newsletters) with good deliverability | API + SMTP-style sending on Amazon SES, domain verification, templates, events, campaigns, audiences, analytics | Developers, marketers, SMEs | Self-serve: sign up → verify domain → API key / campaigns |

### 1.3 Positioning
- **Helpdesk (native):** an AI-first, email-first mini helpdesk: simpler and cheaper than Zendesk/Freshdesk, connected directly to the company's Outlook/Gmail (replies still go out from their own mailbox), with AI routing, threading and answers built in, not sold as an add-on.
- **Helpdesk (middleware mode):** the same AI as a layer on the email + CRM the company already has. No helpdesk migration, per-email pricing, BYOK AI. Competes with native Microsoft/Zendesk/Freshdesk AI and tools like eesel / Forethought, differentiated by thread intelligence, Dynamics/Outlook depth, custom training per company, and local market focus.
- **Send:** Mailchimp / SendGrid / Mailgun / Brevo / Resend-class sending, differentiated by price, local billing (NGN), local support, and integration with Helpdesk (one platform for inbound and outbound).

---

## 2. Principles

1. **One platform, shared core:** identity, workspaces, billing, API keys, events, logs and admin are built once and used by both products.
2. **Multi-tenant from day one:** every record is scoped to a workspace, enforced by Postgres row-level security.
3. **Spec-driven delivery:** every phase has requirements (REQ IDs), acceptance criteria and exit criteria. Nothing ships without meeting them.
4. **Lean but portable:** cheap hosting now (Render + Neon + AWS SES), Docker + standard Postgres so it can move or scale without a rewrite.
5. **Function first, design later:** a clean, usable UI from shadcn/ui; brand design comes after product-market fit.
6. **Safe by default:** write-ahead logging, idempotency, shadow modes, kill switches, human review.
7. **Helpdesk native self-serve, middleware sales-led; Send self-serve:** the website supports both motions.
8. **Iterative:** each phase ends in something demoable or sellable.

---

## 3. Platform Architecture

### 3.1 Logical view
```
                           ┌──────────────────────────────────────────────┐
                           │                Website + App (Next.js)        │
                           │  Marketing · Pricing · Sign-up · Workspace    │
                           │  Helpdesk portal · Send dashboard · Admin        │
                           └───────────────────────┬──────────────────────┘
                                                   │ REST (session / API key)
┌──────────────────────────────────────────────────▼──────────────────────────────────────────┐
│                                   API (Fastify, TypeScript)                                  │
│  core: auth · workspaces · members · api-keys · billing · usage · audit · webhooks-out        │
│  middleware: graph webhooks · emails · reviews · replay · connectors · config · training          │
│  send: domains · send API · templates · contacts · campaigns · events · suppressions         │
└───────────────┬──────────────────────────────┬───────────────────────────────┬──────────────┘
                │                              │                               │
        ┌───────▼────────┐            ┌────────▼────────┐             ┌────────▼────────┐
        │ Postgres (Neon) │◄──────────►│ Workers (Node)   │────────────►│ External         │
        │ RLS · pg-boss   │            │ middleware-processor  │             │ Microsoft Graph  │
        │ pgvector        │            │ send-dispatcher  │             │ Dataverse / CRMs │
        └───────▲────────┘            │ event-ingestor   │             │ LLM providers    │
                │                      │ scheduler        │             │ Amazon SES/SNS/  │
                │                      │ webhook-deliverer│             │ SQS/S3           │
                │                      └────────▲────────┘             │ Paystack/Stripe  │
                │                               │                       └─────────────────┘
        ┌───────┴────────┐            ┌─────────┴────────┐
        │ Trainer (Python)│            │ SES events via    │
        │ train.* jobs    │            │ SNS → SQS (poll)  │
        └────────────────┘            └──────────────────┘
```

### 3.2 Component responsibilities
| Component | Responsibility |
|---|---|
| **Web (Next.js)** | Marketing site (SSR/SSG for SEO), auth screens, app portal for both products, internal admin |
| **API** | All HTTP: portal REST, public API (API keys), Graph webhooks, Paystack/Stripe webhooks. Never calls slow externals in the request path |
| **middleware-processor** | AI agent pipeline feeding the Helpdesk (native) or the CRM (middleware mode) (`mailnitio-middleware-spec.md` Sections 7–12) |
| **send-dispatcher** | Pulls send jobs, renders templates, enforces rate limits/quotas, calls SES, records message IDs |
| **event-ingestor** | Polls SQS for SES events (delivery, bounce, complaint, open, click…), updates messages, suppressions, stats, fires webhooks |
| **scheduler** | Subscription renewal, reconciliation, campaign schedules, usage roll-ups, retention, canary, health |
| **webhook-deliverer** | Signed outbound webhooks to customers, with retries |
| **trainer (Python)** | AI agent training jobs → Knowledge Packs |
| **Postgres** | System of record + job queue (pg-boss) + vectors (pgvector) |

### 3.3 Key architectural decisions
| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript end to end (+ Python only for training) | Speed, shared types, one team |
| Queue | pg-boss on Postgres (Phase 0–7); add Redis/BullMQ or SQS when send volume needs it | No extra infrastructure early; transactional enqueue |
| Sending | Amazon SES (v2 API) | Lowest cost per email, high deliverability, scalable |
| SES events | SES configuration set → SNS → **SQS** → worker polls | Durable (no lost events if the API is down), no public endpoint needed |
| Multi-tenancy | Shared DB + RLS | Simple, cheap, strong isolation when enforced properly |
| Hosting | Render (Frankfurt) + Neon (Frankfurt) + AWS (eu-central-1) | Cheap, EU region, simple ops |
| Auth | Better Auth (email/password, Google/Microsoft login, 2FA, organizations) | Multi-tenant auth in days |
| UI kit | Tailwind + shadcn/ui | Fast, consistent, design later |

---

## 4. Infrastructure & Hosting

### 4.1 Services
| Service | Provider | Plan (lean → growth) | Purpose |
|---|---|---|---|
| `mailnitio-web` | Render web service (Frankfurt) | Starter → Standard | Next.js website + app |
| `mailnitio-api` | Render web service | Starter → Standard ×2 | API, webhooks |
| `mailnitio-worker` | Render background worker | Starter → Standard ×2+ | All Node workers (one service, multiple queues; split later) |
| `mailnitio-trainer` | Render background worker (on demand) or run locally | Starter, scale during runs | Training |
| Database | Neon Postgres (aws-eu-central-1) | Free → Launch → Scale | Data, queue, vectors |
| Email sending | Amazon SES v2 (eu-central-1) | Pay per email | Send product + system email |
| SES events | Amazon SNS + SQS | Pay per use (pennies) | Event pipeline |
| Object storage | Amazon S3 (or Cloudflare R2) | Pay per use | Template assets, imports/exports, attachments, backups |
| DNS / CDN / WAF | Cloudflare | Free → Pro | DNS, TLS, DDoS protection, tracking domains |
| Errors | Sentry | Free → Team | Errors |
| Logs / uptime / heartbeats | Better Stack | Free → paid | Logs, uptime, heartbeats, on-call |
| System email (auth, alerts) | Amazon SES (own account) | — | OTP, invites, alerts (dogfooding) |
| Payments | Paystack (NGN, USD where available); Stripe for international (via an eligible entity) | Per transaction | Billing |
| Repo / CI | GitHub + Actions | Free → Team | Code, CI/CD |
| Secrets (platform) | Render env vars + envelope encryption for tenant secrets | — | Keys |

### 4.2 Network & domains
| Domain | Purpose |
|---|---|
| `mailnitio.com` | Marketing website |
| `app.mailnitio.com` | Application (portal, dashboards) |
| `api.mailnitio.com` | API, Graph webhooks, payment webhooks |
| `docs.mailnitio.com` | Developer docs (Phase 5) |
| `status.mailnitio.com` | Status page (Better Stack) |
| `demo.mailnitio.com` (+ demo mailboxes) | Live demo |
| `track.<customer-domain>` (CNAME) | Customer open/click tracking domains (Phase 8) |
| `mail.mailnitio.com` | System sending domain (auth email, alerts) |

Cloudflare in front of web + API (proxy, TLS, WAF rules, rate limiting on auth + public API).

### 4.3 AWS account layout
- **AWS Organization** with separate accounts: `mailnitio-prod`, `mailnitio-staging` (sending reputation and quotas isolated).
- IAM: one least-privilege IAM user/role per environment for the app (`ses:SendEmail`, `ses:*EmailIdentity*`, `ses:*ConfigurationSet*`, `sqs:ReceiveMessage/DeleteMessage`, `s3:Put/Get` on specific buckets). Access keys stored in Render secrets; rotate every 90 days.
- SES: production access requested in **Phase 0** (lead time); configuration sets per tenant (Section 15).
- CloudWatch alarms on SES account bounce/complaint rates.

### 4.4 Capacity plan (initial)
| Metric | Lean (Phase 0–4) | Growth (Phase 5–8) |
|---|---|---|
| Helpdesk emails processed | < 50k / month | 500k / month |
| Send emails | < 100k / month | 5–20M / month |
| API RPS | < 10 | 100+ |
| Workers | 1 instance | 2–6 instances, per queue |
| DB | Neon free/launch | Neon scale, read replica for analytics |

---

## 5. Repository & Code Structure

```
mailnitio/
├─ apps/
│  ├─ web/                    Next.js: (marketing) · (auth) · (app) · (admin) route groups
│  ├─ api/                    Fastify: core · helpdesk · middleware · send · public · webhooks modules
│  ├─ worker/                 middleware-processor · send-dispatcher · event-ingestor · scheduler · webhook-deliverer
│  └─ trainer/                Python training worker (Helpdesk)
├─ packages/
│  ├─ core/                   workspaces, members, api-keys, usage, audit, webhooks-out, feature flags
│  ├─ db/                     Drizzle schema, migrations, RLS policies, withTenant()
│  ├─ auth/                   Better Auth config, roles/permissions
│  ├─ billing/                plans, entitlements, Paystack/Stripe adapters
│  ├─ helpdesk/                tickets, views, assignment, replies, SLAs, canned responses, customers
│  ├─ middleware/              AI agent engine: pipeline, thread resolver, router, customer resolver, orchestrator
│  ├─ agents/                 classifier, context, kb-answer, guardrail, prompt builders
│  ├─ llm/                    gateway, providers, metering
│  ├─ connectors/             contracts + email-graph + crm-dataverse (+ later gmail, salesforce, hubspot)
│  ├─ send/                   domains, templates, rendering, dispatch, SES adapter, events, suppressions
│  ├─ templates/              rendering engine (MJML + Handlebars, sandboxed)
│  ├─ crypto/                 envelope encryption
│  ├─ config/                 zod schemas for tenant config, plans, env
│  ├─ observability/          logger, tracing, Sentry
│  ├─ ui/                     shared React components (shadcn-based)
│  └─ shared/                 types, errors, utils
├─ tools/
│  ├─ cli/                    `mailnitio` operator CLI
│  └─ train-cli/              `mailnitio-train` client
├─ infra/
│  ├─ render.yaml             Render Blueprint
│  ├─ aws/                    Terraform/CDK: SES, SNS, SQS, S3, IAM, alarms
│  └─ docker/                 Dockerfiles
├─ docs/                      specs, ADRs, runbooks
└─ tests/                     fixtures, scenarios, load tests
```

**Rules**
- Products depend on `core`; `core` never depends on a product.
- Products don't import each other; shared needs go into `core`.
- All DB access goes through `withTenant()` (RLS), except platform-admin code paths.
- Every external integration sits behind an interface in `connectors/` or `send/ses-adapter`.

---

## 6. Shared Core Services

| Service | Responsibility | Used by |
|---|---|---|
| **Identity** | Users, sessions, 2FA, social login, password reset | All |
| **Workspaces** | Tenant record, members, roles, invitations, settings | All |
| **Entitlements** | Which products, plans, limits and features a workspace has | All (gates routes + UI) |
| **API keys** | Create/revoke/rotate, scopes, last used, hashed storage | Send API, public API, MCP |
| **Usage metering** | Append-only usage events → daily roll-ups → billing | Helpdesk (emails processed, AI tokens), Send (emails sent, contacts) |
| **Billing** | Plans, subscriptions, invoices, payment webhooks, dunning | All |
| **Audit log** | Who did what, when, before/after | All |
| **Outbound webhooks** | Endpoints, signing secrets, event types, retries, delivery log | Helpdesk + Send |
| **Notifications** | Email (via own SES), in-app, Slack/Teams webhooks | Alerts, invites, digests |
| **Feature flags** | Per workspace / global, kill switches | All |
| **Files** | S3 uploads (signed URLs), virus scan (later), retention | Templates, imports, training data |
| **Admin** | Platform staff console: workspaces, impersonation (audited), plans, abuse | Ops |
| **Secrets** | Envelope encryption for tenant credentials | Helpdesk connectors, LLM keys |

---

## 7. Core Data Model

> All workspace tables have `workspace_id uuid not null`, timestamps, and RLS (`workspace_id = current_setting('app.workspace_id')::uuid`). Product-specific tables: Helpdesk in the companion spec (Section 6, with `tenant_id` = `workspace_id`); Send in Section 15.9.

```sql
-- identity (Better Auth managed)
users (id, email citext unique, name, image, email_verified, two_factor_enabled, created_at)
accounts (id, user_id, provider, provider_account_id, ...)        -- google / microsoft / credentials
sessions (...), verification (...), two_factor (...)

-- workspaces
workspaces (
  id uuid pk, name, slug unique, country, timezone, industry, size_band,
  status text,                      -- active | suspended | closed
  products text[],                  -- {helpdesk, send}
  dek_encrypted jsonb, settings jsonb, created_at
)
members (workspace_id, user_id, role, status, joined_at, primary key (workspace_id, user_id))
   -- role: owner | admin | supervisor | agent | developer | marketer | reviewer | viewer | billing
invitations (id, workspace_id, email, role, token_hash, invited_by, expires_at, accepted_at)

-- access
api_keys (
  id uuid pk, workspace_id, name, prefix text, key_hash text, scopes text[],
  product text, created_by, last_used_at, expires_at, revoked_at
)

-- billing
plans (id, product, code, name, price_monthly, currency, limits jsonb, features jsonb, active)
subscriptions (id, workspace_id, product, plan_id, status, provider, provider_ref,
               current_period_start, current_period_end, cancel_at, trial_end)
invoices (id, workspace_id, provider_ref, amount, currency, status, period, pdf_url, issued_at)
usage_events (id bigserial, workspace_id, product, metric, quantity, meta jsonb, at)
usage_daily (workspace_id, product, metric, day, quantity, primary key (...))
credits (workspace_id, product, balance, updated_at)              -- prepaid Send credits (optional)

-- platform
audit_log (id bigserial, workspace_id, actor_type, actor_id, action, target_type, target_id, before, after, ip, ua, at)
webhook_endpoints (id, workspace_id, url, secret_encrypted, events text[], active, created_at)
webhook_deliveries (id, endpoint_id, event_type, payload jsonb, status, attempts, last_status_code, next_attempt_at)
feature_flags (key, workspace_id null, enabled, value jsonb)
leads (id, name, email, company, role, product, message, source, utm jsonb, status, created_at)   -- demo/POC requests
waitlist (id, email, product, company, created_at)
```

---

## 8. Identity, Workspaces & Access

### 8.1 Sign-up & login
- Email + password (argon2id) with email verification; **Google** and **Microsoft** login (OIDC).
- **2FA (TOTP)** optional for members, enforced for owners/admins (workspace setting can enforce for all).
- Sessions: httpOnly secure cookies; idle timeout 12h; absolute 7 days.
- Rate limits + lockout on login, sign-up, reset (Cloudflare + app).
- Bot protection on sign-up and demo forms (Cloudflare Turnstile).

### 8.2 Workspace model
- A user can belong to multiple workspaces and switch between them.
- Creating an account creates the first workspace (the user is owner).
- A workspace enables products (Helpdesk and/or Send) via entitlements.

### 8.3 Roles
| Permission | Owner | Admin | Developer | Marketer | Reviewer | Viewer | Billing |
|---|---|---|---|---|---|---|---|
| Helpdesk: work tickets (reply, note, assign self, status) | ✓ | ✓ | — | — | ✓ | — | — |
| Workspace settings, members | ✓ | ✓ | — | — | — | — | — |
| Billing | ✓ | view | — | — | — | — | ✓ |
| API keys, webhooks | ✓ | ✓ | ✓ | — | — | — | — |
| Send: domains | ✓ | ✓ | ✓ | — | — | — | — |
| Send: templates, contacts, campaigns | ✓ | ✓ | ✓ | ✓ | — | view | — |
| Helpdesk: connections, mailboxes, config | ✓ | ✓ | — | — | — | — | — |
| Helpdesk: review, override, replay | ✓ | ✓ | — | — | ✓ | — | — |
| Helpdesk: logs, dashboards | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Audit log | ✓ | ✓ | — | — | — | — | — |

Helpdesk adds two roles: **Agent** (works tickets in their teams) and **Supervisor** (all teams, assignment, SLA, reports, review/override). Platform staff use separate `platform_role` accounts; every staff action inside a workspace is written to that workspace's audit log.

### 8.4 API keys
- Format: `mn_live_<prefix>_<secret>` / `mn_test_...`; only a SHA-256 hash is stored; shown once.
- Scopes: `send:write`, `send:read`, `templates:write`, `contacts:write`, `helpdesk:read`, `helpdesk:write`, `webhooks:write`.
- Per-key rate limits; last-used tracking; revoke and rotate.

---

## 9. Security & Compliance Baseline

| Area | Baseline (from Phase 0) |
|---|---|
| Transport | TLS everywhere; HSTS; Cloudflare in front |
| Data isolation | Postgres RLS + `FORCE RLS`; app role without BYPASSRLS; CI tests for cross-tenant access |
| Secrets | Envelope encryption (per-workspace DEK, platform KEK); write-only secret APIs |
| AuthN/Z | Better Auth, 2FA, RBAC per route, API key scopes |
| Input/output | zod validation everywhere; output encoding; CSP; sandboxed template rendering |
| Webhooks in | Graph clientState; SNS signature verification (if HTTP); Paystack/Stripe signature checks |
| Webhooks out | HMAC-SHA256 signature header + timestamp; replay protection |
| Abuse (Send) | Domain verification required; new-account sending limits; content checks; bounce/complaint auto-pause; manual review queue |
| PII | Minimisation; masking before AI; no Helpdesk bodies retained; Send content retention configurable |
| Backups | Neon PITR + nightly logical dump to S3 (encrypted, 30-day retention) |
| Dependencies | Renovate/Dependabot, `pnpm audit`, lockfile |
| Testing | OWASP ASVS L2 checklist; ZAP baseline in CI (Phase 5+); external pen test before first enterprise go-live |
| Compliance | NDPA 2023 + GDPR alignment; DPA + sub-processor list; retention + deletion + export; CAN-SPAM/GDPR rules for marketing email (unsubscribe, consent, physical address) |
| Policies | Acceptable Use Policy (Send anti-spam), Privacy Policy, Terms, DPA, Security page |

---

## 10. Observability & Operations

| Signal | Tooling | Notes |
|---|---|---|
| Logs | pino JSON → Better Stack | `workspace_id`, `product`, `request_id`, `job_id` on every line |
| Errors | Sentry | Tagged by workspace + product; PII scrubbing |
| Uptime | Better Stack monitors | web, api `/health`, Graph webhook validation echo |
| Heartbeats | Better Stack | Every scheduled job pings on success |
| Business metrics | DB-derived dashboards (admin) | Helpdesk: processed, rerouted, review, failures · Send: sent, delivered, bounce %, complaint %, opens, clicks |
| SES health | CloudWatch alarms | Account bounce > 2%, complaint > 0.05% (well below AWS review thresholds) |
| Status page | `status.mailnitio.com` | Public incidents |
| On-call | Better Stack on-call | Business hours + critical paging |

**Runbooks** (`docs/runbooks/`): Graph subscription failures · CRM errors · LLM outage · reply loop · SES bounce/complaint spike · SES sending paused · queue backlog · DB failover · secret rotation · payment webhook failures · abuse report handling · tenant suspension.

---

## 11. Environments, CI/CD & Release

| Env | Hosting | DB | External |
|---|---|---|---|
| local | Docker Compose (Postgres+pgvector, LocalStack for SES/SQS/S3 optional) | local | fixtures, SES sandbox |
| preview (per PR) | Render previews | Neon branch | fixtures |
| staging | Render `*-staging` | Neon `staging` branch | AWS staging account (SES sandbox), demo M365 tenant, client CRM sandboxes |
| production | Render | Neon `main` | AWS prod (SES production access) |

**Pipeline (GitHub Actions)**
1. PR: typecheck → lint → unit → contract → RLS tests → build → preview deploy.
2. Main: migrate staging → deploy staging → smoke tests → **manual approval** → migrate prod → deploy prod → smoke tests.
3. Migrations are expand/contract (backwards-compatible); feature flags guard incomplete features.
4. Rollback: Render rollback; flags off; migrations never destructive in the same release.
5. Infrastructure as code: `infra/aws` via Terraform (SES identities for the platform, SNS/SQS, S3, IAM, alarms); `render.yaml` for services.

---
# PART B: PRODUCTS

## 12. Website (Marketing + Sign-up)

### 12.1 Goals
1. Explain both products clearly and credibly to business buyers.
2. Convert: **start a free trial or book a demo** (Helpdesk native), **book a POC** (Helpdesk middleware mode for CRM users), **sign up / join the waitlist** (Send).
3. Show proof: a **live demo**, security posture, pricing transparency.
4. Be the front door to the app (same Next.js project, `(marketing)` route group).

### 12.2 Sitemap
| Page | Content | CTA |
|---|---|---|
| `/` Home | Headline, the two products, how it works (3 steps each), live demo teaser, logos/testimonials (later), security strip | Book a demo · Start free (Send) |
| `/helpdesk` | Problem → solution; features (routing, no duplicate cases, threading, customer matching, auto-response, review portal, training on your history); integrations (Outlook, Dynamics; more coming); BYOK AI; FAQs | Try the live demo · Book a POC |
| `/helpdesk/demo` | Live demo (Section 14) | Send a test email |
| `/send` | API + templates + campaigns; deliverability; local billing; code samples | Join waitlist / Start free |
| `/pricing` | Helpdesk (per agent + AI), Middleware/Enterprise (per email), Send (free tier + usage), FAQ | Start trial · Book a demo |
| `/security` | Data handling, hosting, BYOK, NDPA, encryption, sub-processors, DPA request | Request security pack |
| `/integrations` | Microsoft 365, Dynamics 365, (soon) Gmail, Salesforce, HubSpot, Zapier, MCP | — |
| `/docs` | Developer docs (Phase 5; stub before) | — |
| `/about`, `/contact` | Company, contact form | Contact |
| `/legal/*` | Terms, Privacy, AUP, DPA, Cookie policy | — |
| `/login`, `/signup`, `/forgot` | Auth | — |
| `/status` | Link to the status page | — |

### 12.3 Lead and sign-up flows
**Book a demo / POC (Helpdesk, either mode)**
```
Form: name, work email, company, role, country, CRM used (Dynamics/Salesforce/HubSpot/None/Other),
      email volume/month, mailboxes, message
→ Turnstile check → leads row → notify sales (email + Slack) → confirmation email with calendar link
→ admin: lead status (new → contacted → demo → POC → won/lost)
```

**Sign up (self-serve)**
```
/signup → email+password or Google/Microsoft → verify email
→ onboarding:
   1. Workspace: company name, country, industry, size
   2. "What brings you here?" → Helpdesk | Send | Both
   3a. Helpdesk → connect a mailbox and start a trial (native, Phase 9 self-serve; staff-assisted before), open the demo workspace, or book a CRM POC (middleware)
   3b. Send (before Phase 5) → waitlist confirmation; (after Phase 5) → verify domain → API key → test send
   4. Invite teammates (optional)
→ app dashboard
```

### 12.4 App shell (after login)
- Workspace switcher, product nav (Helpdesk / Send), settings (members, API keys, webhooks, billing, audit).
- Empty states guide users to the next action (connect a mailbox, verify a domain, create a template).
- The Helpdesk section shows **Request setup / POC** until the workspace's mailbox is connected by Mailnitio staff (Phases 2–8), then the full helpdesk; self-serve connection arrives in Phase 9.

### 12.5 Website technical spec
- Next.js App Router; marketing pages SSG/ISR; MDX for content pages and docs.
- SEO: metadata, OG images, sitemap.xml, robots.txt, schema.org (Organization, SoftwareApplication).
- Analytics: privacy-friendly (Plausible or PostHog) + UTM capture into leads.
- Cookie consent (only if non-essential cookies are used).
- Performance: Lighthouse ≥ 90 on marketing pages.
- Accessibility: WCAG 2.1 AA basics (contrast, labels, keyboard).

---

## 13. Mailnitio Helpdesk (Product 1: AI Email Customer Service)

> The AI agent engine and Middleware (CRM connector) are specified in **`mailnitio-middleware-spec.md`**. This section specifies the Helpdesk product built on top of it.

### 13.1 What it is
An **AI-first mini helpdesk for email customer service**. A company connects its support mailboxes (Outlook first, Gmail later); every inbound email is handled by the **AI agent** (classify, route, thread, identify the customer, acknowledge, auto-answer standard questions), and the team works **tickets on the Mailnitio platform**: assign, reply, add notes, track SLAs, resolve. Replies are sent **from the company's own mailbox** (via Graph), so customers see normal email.

The same AI agent can instead run in **Middleware mode**, connected to the company's CRM (Dynamics first) so cases are created and updated there. That is the enterprise path and the POC.

### 13.2 Modes
| | **Native Helpdesk** (default) | **Middleware mode** (CRM connector) |
|---|---|---|
| Where tickets live | Mailnitio (tickets/cases on the platform) | Customer's CRM (Dynamics, later Salesforce/HubSpot) |
| Where agents work | Mailnitio Helpdesk UI | Their CRM; Mailnitio portal for AI review, logs, replay |
| Queues | Mailnitio teams/queues (+ optional Outlook folder/category sync) | CRM queues |
| Replies | From the Mailnitio UI, sent through the customer's mailbox (Graph) | From the CRM (server-side sync) |
| Customer records | Mailnitio customers (lightweight contacts) | CRM contacts/accounts |
| Buyer | SMEs, mid-size teams, companies without a good helpdesk | Enterprises with a CRM (banks, insurers, telcos) |
| Sales motion | Self-serve trial + demo | Demo → POC (client sandbox) → pilot |
| Shared | AI agent engine, threading, routing, acknowledgement, KB auto-answer, training/Knowledge Pack, review/override, logs, reliability | same |

A workspace runs one mode per mailbox; it can move from Native to Middleware later without losing history (tickets can be exported/synced to the CRM).

### 13.3 Native Helpdesk features
**Tickets & views**
- Ticket = Mailnitio case: ID (`MN-1042`), subject, customer, status, priority, category, team, assignee, tags, SLA timers, channel (email), created/updated, AI fields (confidence, reason, summary).
- Statuses: `new → open → pending (waiting on customer) → on_hold → resolved → closed`; reopen on customer reply within the reopen window (Context Agent rules).
- Views: My tickets, Unassigned, Team queues, Needs Review (AI), Escalations, SLA at risk, All; filters + saved views; bulk actions.
- Ticket detail: full thread (inbound + outbound + notes), AI summary, customer panel (past tickets, contact info), timeline of AI decisions and actions.

**Working tickets**
- Reply / reply-all / forward from the UI → sent via Graph from the receiving mailbox, threading headers preserved, ticket ID in the subject.
- Internal notes with @mentions; collision detection ("Ada is replying").
- Assignment: manual, round-robin per team, AI-suggested assignee (later: skills/load-based).
- Canned responses / macros (text + status/tag changes), with variables.
- **AI assist:** suggested reply (grounded in KB + the approved response library), thread summary, tone rewrite; the human always sends.
- Merge duplicate tickets, split a ticket, link related tickets.
- Attachments (stored in S3, virus-scanned later).

**Team & SLA**
- Teams (queues) mapped from categories (complaints, enquiries, redemptions…); members belong to teams.
- SLA policies by priority/category: first-response and resolution targets, business hours, breach warnings, escalation.
- Business hours + holidays per workspace.

**Customers**
- Lightweight customer records auto-created from senders (email, name, phone, company, custom fields), with all their tickets; identifier fields (e.g. account number) used by the customer resolver.

**Notifications**
- In-app + email notifications (assignment, customer reply, SLA warnings, mentions); daily digest.

**Reporting**
- Volume, first response time, resolution time, SLA compliance, backlog, by team/agent/category; AI metrics (auto-routed %, rerouted %, auto-answered %, review rate, override rate).

**AI agent (shared engine)**
- Classification, content-based routing to teams, thread decisions (continuation/closure/new issue/escalation/mixed), customer identification, acknowledgement, KB auto-answer (suggest → send per topic), escalation detection, training on historical email (Knowledge Pack). See the Middleware spec.

**Outlook sync (optional, per mailbox)**
- Apply Outlook categories / move to folders matching the ticket's team, so staff who still look at Outlook see the same organisation.

### 13.4 Native Helpdesk data model (additions to the Middleware spec tables)
```sql
teams (id, workspace_id, name, email_alias, business_hours_id, auto_assign text)        -- none|round_robin
team_members (team_id, user_id, role)
tickets (
  id uuid pk, workspace_id, number bigint, key text,             -- key = 'MN-1042' (unique per workspace)
  mailbox_id, thread_id, customer_id, subject, status, priority, category, team_id, assignee_id,
  tags text[], source text,                                      -- email (later: whatsapp, form)
  ai_confidence numeric, ai_reason text, ai_summary text, needs_review bool,
  sla_policy_id, first_response_due timestamptz, resolution_due timestamptz,
  first_responded_at, resolved_at, closed_at, reopened_count int, related_ticket_ids uuid[],
  crm_case_id text null,                                         -- set in middleware mode / when synced
  created_at, updated_at, unique (workspace_id, number)
)
ticket_messages (
  id uuid pk, workspace_id, ticket_id, email_log_id null, direction text,  -- inbound|outbound|note
  author_type text, author_id, from_addr, to_addrs text[], cc_addrs text[], subject,
  body_html text, body_text text, attachments jsonb, graph_message_id, internet_message_id,
  sent_status text, created_at
)
ticket_events (id bigserial, workspace_id, ticket_id, type, actor_type, actor_id, data jsonb, at)   -- status/assign/tag/AI
customers (id uuid pk, workspace_id, email citext, name, phone, company, identifiers jsonb, fields jsonb,
           created_at, unique (workspace_id, email))
customer_emails (workspace_id, customer_id, email citext)              -- extra addresses
sla_policies (id, workspace_id, name, conditions jsonb, first_response_mins, resolution_mins, business_hours_id)
business_hours (id, workspace_id, timezone, schedule jsonb, holidays jsonb)
canned_responses (id, workspace_id, title, body, actions jsonb, team_id null, created_by)
saved_views (id, workspace_id, user_id null, name, filters jsonb)
notifications (id, workspace_id, user_id, type, data jsonb, read_at, created_at)
```
**Message bodies:** in Native mode the helpdesk is the system of record, so ticket message bodies **are stored** (encrypted at rest, retention configurable per workspace). The AI pipeline still sends only masked text to the LLM. (In Middleware mode bodies are not retained; the CRM is the record.)

### 13.5 How the AI pipeline feeds the Helpdesk
```
Inbound email → AI agent pipeline (Middleware spec §7) → destination connector:
    Native mode     → HelpdeskDestination: create/append ticket, set team/priority/tags,
                      start SLA timers, notify assignee, (optional) Outlook category/folder sync
    Middleware mode → CrmConnector: create/append CRM case, queue, reopen, link
```
Both destinations implement the same interface (`createCase`, `appendMessage`, `reopen`, `linkRelated`, `route`), so the pipeline is identical.

### 13.6 Capabilities by phase
| Capability | Phase |
|---|---|
| AI agent pipeline on Outlook (Graph webhooks, delta, threading, classifier, context agent, routing, acknowledgement) | 2 |
| Native Helpdesk: tickets, views, ticket detail, reply via Graph, notes, assignment, statuses, teams, canned responses, customers | 2 |
| SLA policies, business hours, notifications, basic reports | 2–3 |
| KB auto-answer (suggest/send), AI suggested replies + summaries | 2–3 |
| Live public demo | 3 |
| **Middleware mode: Dynamics connector in the client sandbox (POC)** | 4 |
| Training pipeline + insight report + Knowledge Pack | 4 |
| Middleware pilot → production | 7 |
| Self-serve connect, config UI, training UI, advanced reports | 9 |
| Gmail, Salesforce, HubSpot connectors; WhatsApp/web-form channels | 10–11 |

## 14. Live Demo Environment

### 14.1 Purpose
Let a prospect (on the website or in a meeting) **send an email and watch Mailnitio handle it live**: classification, rerouting, case/thread decision, acknowledgement, auto-answer. No setup on their side.

### 14.2 How the email connection works (no DNS needed)
- Mailnitio owns a **Microsoft 365 demo tenant**. Shared mailboxes (no licence needed), e.g.:
  - `complaints@mailnitiodemo.onmicrosoft.com`
  - `enquiries@mailnitiodemo.onmicrosoft.com`
  - `support@mailnitiodemo.onmicrosoft.com`
- An **Entra app registration** in that tenant with Graph application permissions `Mail.Read`, `Mail.ReadWrite`, `Mail.Send` + admin consent, restricted to the demo mailboxes (Exchange RBAC for Applications / application access policy).
- Mailnitio connects through the **Microsoft Graph API** (OAuth client credentials): it subscribes to new-mail webhooks, reads messages, moves/tags them, and sends replies. **No DNS changes are needed**, because the default `onmicrosoft.com` domain works.
- **Optional branded addresses** (e.g. `complaints@demo.mailnitio.com`): add `demo.mailnitio.com` to the M365 tenant (TXT verification + MX + autodiscover records in Cloudflare). The connection is still via Graph; DNS only makes mail for that domain arrive in Outlook.
- **DNS is used for Send, not Helpdesk:** customers verifying a sending domain add DKIM/SPF/DMARC records (Section 15.4).

### 14.3 Other ways a customer's mail can reach Mailnitio (for reference)
| Method | How | When |
|---|---|---|
| **Graph API (primary)** | App registration + admin consent; mail stays in Outlook | Microsoft 365 customers (default) |
| **Gmail API** | Google OAuth + Pub/Sub watch | Google Workspace customers (Phase 10) |
| **Forwarding** | Outlook/Gmail rule forwards to `in+<workspace>@inbound.mailnitio.com` (SES inbound) | Customers who can't grant API access; quick trials |
| **MX subdomain** | Customer points e.g. `support.company.com` MX to SES inbound | Dedicated support addresses |
Forwarding and MX modes lose the "stay in their mailbox" behaviour and require Mailnitio to send replies from its own infrastructure on their verified domain, so Graph stays the primary method.

### 14.4 Demo experience
```
/helpdesk/demo page
 1. "Send an email to complaints@… — ask a question, complain, or reply to a previous answer."
 2. Visitor sends from their own email client
 3. Within ~10s the page shows (live feed, polling/SSE):
      received → classified "enquiry (0.93)" → rerouted complaints@ → Enquiries
      → case MN-1042 created → acknowledgement sent → (FAQ) auto-answer sent
 4. Visitor receives the acknowledgement / answer in their inbox
 5. Visitor replies → feed shows "same case MN-1042 · continuation" (or "closure" for thanks)
```
- Sample scripts on the page: "Ask where the offices are", "Complain about a delayed withdrawal", "Reply 'thank you'", "Mention a regulator".
- **Presenter mode** (logged-in staff): full portal view of the demo workspace (reasons, timeline, review, override).

### 14.5 Demo safety & abuse controls
- **Public feed is sanitised:** sender shown as `t***@gmail.com`, no bodies; only subject (truncated), category, decision.
- Rate limits: ≤ 5 emails per sender per hour; ≤ 200 demo emails/day; circuit breaker.
- Replies only to the original sender; max 1 acknowledgement + 1 answer per sender per thread per day.
- Content filter: no replies to messages flagged as abusive/spam; blocklist.
- Demo data auto-deleted after 7 days; daily reset of demo cases.
- The demo KB contains only fictional company information ("Acme Asset Management"), clearly labelled as a demo.
- Separate demo workspace and LLM budget cap.

---

## 15. Mailnitio Send (Amazon SES)

### 15.1 Scope
| Capability | Phase |
|---|---|
| Domain verification (DKIM, SPF via custom MAIL FROM, DMARC guidance) | 5 |
| API keys + REST send API (single + batch), idempotency keys | 5 |
| Templates (code/HTML + MJML, Handlebars variables, versions, preview, test send) | 5 |
| Events: delivered, bounced, complained, rejected, delayed, opened, clicked | 5 |
| Suppression lists (bounces, complaints, unsubscribes, manual) | 5 |
| Message logs + search; webhooks to customer endpoints | 5 |
| Usage metering + free tier + limits | 5–6 |
| SMTP relay credentials | 8 |
| Contacts, audiences, segments, CSV import | 8 |
| Drag-and-drop editor, campaigns, scheduling, A/B subject tests | 8 |
| Unsubscribe pages + preference centre, one-click unsubscribe | 8 |
| Analytics (opens, clicks, bounces by campaign/domain) | 8 |
| Custom tracking domains | 8 |
| Dedicated IPs, warm-up, deliverability insights | 11 |

### 15.2 Architecture
```
Customer app ──POST /v1/send (API key)──► API ──► validate · idempotency · suppression check
                                                │   · quota/rate check · persist message (queued)
                                                ▼
                                         pg-boss: send.dispatch (per-workspace fairness)
                                                ▼
                                    send-dispatcher worker
                                      render template (MJML→HTML, Handlebars vars)
                                      add headers (List-Unsubscribe, X-Mailnitio-Message-ID)
                                      SES v2 SendEmail (ConfigurationSetName = workspace set,
                                                        EmailTags = workspace, message, campaign)
                                      store SES MessageId → status: sent
                                                ▼
              SES ──event destination──► SNS topic ──► SQS queue (+ DLQ)
                                                ▼
                                    event-ingestor worker (long-poll SQS)
                                      map MessageId → message
                                      update status/timeline; bounces/complaints → suppression
                                      stats roll-up; usage events; customer webhooks
```

### 15.3 Multi-tenant SES design
| Concern | Design |
|---|---|
| Identities | Each customer verifies **their own domain** as an SES email identity (Easy DKIM). Sending only from verified domains. |
| Configuration sets | One per workspace (`ws_<id>`), with an event destination → shared SNS topic → SQS; enables per-tenant event attribution and tracking options |
| Tagging | `EmailTags`: `workspace_id`, `message_id`, `campaign_id`, `stream` (transactional/marketing) |
| Streams | Transactional and marketing separated (different config sets, later different IP pools) so marketing reputation can't hurt OTPs/receipts |
| Reputation protection | Mailnitio tracks bounce/complaint rates **per workspace** and auto-throttles/pauses a workspace before it can affect the shared SES account |
| Quotas | Per-workspace daily limits + max send rate (plan-based + trust level), enforced by the dispatcher; the account-level SES quota is shared |
| New-account limits | New workspaces start at a low daily limit (e.g. 200/day) until domain verified + payment method + manual/automated review |
| SES multi-tenant features | Evaluate AWS's current SES tenant/reputation-isolation features at build time and adopt if they fit |

### 15.4 Domain verification (customer flow)
```
Send → Domains → Add domain "company.com"
→ Mailnitio calls SES CreateEmailIdentity (Easy DKIM, 2048-bit) + sets custom MAIL FROM "mail.company.com"
→ UI shows DNS records to add:
     3 × CNAME   <token>._domainkey.company.com → <token>.dkim.amazonses.com      (DKIM)
     MX          mail.company.com → feedback-smtp.<region>.amazonses.com          (MAIL FROM)
     TXT         mail.company.com "v=spf1 include:amazonses.com ~all"              (SPF)
     TXT         _dmarc.company.com "v=DMARC1; p=none; rua=mailto:…"              (DMARC, recommended)
→ "Check records" button + background polling (GetEmailIdentity) → Verified ✓
→ Optional: tracking domain CNAME track.company.com → Mailnitio tracking endpoint (Phase 8)
```
Guidance follows the major mailbox providers' bulk-sender rules: SPF + DKIM + DMARC, aligned From domain, one-click unsubscribe for marketing, low spam complaint rates.

### 15.5 Send API (Phase 5)
```http
POST /v1/send
Authorization: Bearer mn_live_xxx
Idempotency-Key: 6f1c…
{
  "from": { "email": "no-reply@company.com", "name": "Company" },
  "to": [{ "email": "ada@example.com", "name": "Ada" }],
  "cc": [], "bcc": [], "reply_to": "support@company.com",
  "subject": "Your statement is ready",          // or from template
  "template_id": "tpl_statement", "template_version": "latest",
  "variables": { "first_name": "Ada", "month": "September" },
  "html": null, "text": null,                       // when not using a template
  "attachments": [{ "filename": "statement.pdf", "content_base64": "…", "content_type": "application/pdf" }],
  "tags": { "type": "statement" },
  "stream": "transactional",
  "send_at": null                                   // optional schedule
}
→ 202 { "id": "msg_01J…", "status": "queued" }
```
| Endpoint | Purpose |
|---|---|
| `POST /v1/send` | Single message (up to 50 recipients total across to/cc/bcc) |
| `POST /v1/send/batch` | Up to 500 personalised messages in one call |
| `GET /v1/messages/:id` · `GET /v1/messages?…` | Status + event timeline |
| `POST/GET/PATCH /v1/templates` · `POST /v1/templates/:id/versions` · `POST /v1/templates/:id/test` | Templates |
| `GET/POST/DELETE /v1/suppressions` | Suppression management |
| `GET/POST /v1/domains` · `POST /v1/domains/:id/verify` | Domains |
| `POST/GET /v1/webhooks` | Event webhooks |

**SDKs:** Node and Python first (thin wrappers), with cURL examples in the docs.

### 15.6 Templates
- Authoring: **MJML** (responsive email markup) + **Handlebars** variables; HTML-only also allowed.
- Versioning: draft → published versions; sends pin a version or use `latest`.
- Preview with sample data; test send to verified addresses; plain-text auto-generated.
- Rendering in the worker (sandboxed; no arbitrary code); size limit; image hosting on S3/CDN.
- Phase 8: **drag-and-drop editor** (evaluate GrapesJS + MJML plugin (open-source) vs an embeddable commercial editor such as Unlayer), saving as MJML/HTML.

### 15.7 Events & statuses
`queued → sent → delivered | bounced (hard/soft) | complained | rejected | failed`, plus `delayed`, `opened`, `clicked`, `unsubscribed`.
- Hard bounce / complaint → add to the workspace suppression list automatically.
- Soft bounce → SES retries; final failure recorded.
- Opens/clicks via SES tracking (configuration set + custom redirect domain in Phase 8).
- Every event updates the message timeline, daily stats, usage, and fires customer webhooks.

### 15.8 Campaigns (Phase 8)
| Feature | Spec |
|---|---|
| Contacts | Unique per workspace by email; custom fields (JSONB); consent status + source + timestamp; double opt-in option |
| Import | CSV/XLSX with column mapping; validation (syntax, role addresses, disposables, duplicates, suppressed); import report |
| Audiences & segments | Static lists + dynamic segments (rules on fields, tags, engagement) |
| Campaign | Audience/segment, template, subject + preview text, from/reply-to, schedule or send now, timezone, throttle |
| A/B | Subject or content test on a % sample; auto-pick winner by opens/clicks after N hours |
| Compliance | Mandatory unsubscribe link + `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; physical address in footer; consent required for marketing stream |
| Preference centre | Hosted page: unsubscribe all / by topic |
| Reports | Sent, delivered, opens (unique/total), clicks, CTR, bounces, complaints, unsubscribes; by domain (gmail/yahoo/outlook); link map |
| Safety | Pre-send checks: audience size vs plan, suppressed removed, spam-score check (later), first campaigns of new workspaces require review |

### 15.9 Send data model
```sql
send_domains (id, workspace_id, domain, ses_identity_arn, dkim_status, mail_from_domain, mail_from_status,
              dmarc_present bool, tracking_domain, status, verified_at, last_checked_at)
send_templates (id, workspace_id, name, slug, stream, active_version int, created_by, created_at)
send_template_versions (id, template_id, version, subject, preheader, mjml, html, text, variables_schema jsonb,
                        status, created_by, created_at)
send_messages (
  id text pk,                          -- msg_<ulid>
  workspace_id, api_key_id, idempotency_key, stream, campaign_id null,
  from_email, to_email, subject, template_id, template_version, tags jsonb,
  ses_message_id text unique, status, status_at, error, size_bytes,
  opened_at, clicked_at, created_at,
  unique (workspace_id, idempotency_key)
)                                        -- one row per recipient; partitioned by month
send_events (id bigserial, workspace_id, message_id, type, at, data jsonb)   -- partitioned by month
send_suppressions (workspace_id, email citext, reason, source, created_at, primary key (workspace_id, email))
send_stats_daily (workspace_id, day, stream, campaign_id, sent, delivered, bounced, complained, opened, clicked, unsubscribed)
contacts (id, workspace_id, email citext, first_name, last_name, fields jsonb, tags text[],
          consent_status, consent_source, consent_at, status, created_at, unique (workspace_id, email))
lists (id, workspace_id, name, type)               -- static | segment
list_members (list_id, contact_id)
segments (id, workspace_id, name, rules jsonb)
campaigns (id, workspace_id, name, list_id, segment_id, template_version_id, subject, preheader, from, reply_to,
           schedule_at, timezone, status, ab_test jsonb, stats jsonb, created_by, sent_at)
imports (id, workspace_id, file_key, status, mapping jsonb, report jsonb, created_at)
```
`send_messages` and `send_events` are partitioned monthly; detailed events are retained 90 days by default (configurable), with aggregates kept longer.

### 15.10 Abuse prevention (protects the platform's SES account)
- Verified domain required; free/personal domains (gmail.com etc.) can't be used as From.
- New workspaces: low limits, then automatic trust-level increases based on bounce < 2%, complaint < 0.05%, age, payment.
- Auto-pause a workspace's marketing stream at bounce ≥ 4% or complaint ≥ 0.08% (rolling), transactional at stricter review.
- AUP acceptance at sign-up; a report-abuse address; admin review queue; content heuristics (phishing keywords, URL reputation, later).
- Purchased lists forbidden; consent fields mandatory for marketing imports.

---

## 16. Billing, Plans & Usage

### 16.1 Metrics metered
| Product | Metric | Source |
|---|---|---|
| Helpdesk | `agent_seats` (native), `emails_processed` (inbound, excluding skipped), `ai_tokens` (managed mode), `auto_answers`, mailboxes | Helpdesk + AI pipeline |
| Send | `emails_sent` (per recipient), `contacts` (marketing), dedicated IPs (later) | Dispatcher, contacts table |

### 16.2 Billing mechanics
- Plans with included quantities + overage price; **monthly or annual**.
- Paystack (NGN, USD where supported) for African customers; Stripe for international via an eligible entity; invoices for enterprise (bank transfer, PO).
- Enterprise Helpdesk contracts: annual invoice (onboarding fee + subscription), entered as a manual subscription.
- Entitlements service enforces limits: soft limit (warn at 80%, 100%) and hard limits configurable per plan (Send: stop at quota unless overage enabled).
- Dunning: retries, emails, grace period, then read-only / sending paused.
- Taxes: VAT 7.5% (Nigeria) on invoices; withholding-tax handling for enterprise clients.

---

## 17. Public API, Webhooks & MCP

### 17.1 Public API principles
- REST + JSON, versioned (`/v1`), API keys with scopes, cursor pagination, idempotency keys on POST, consistent errors, rate-limit headers.
- OpenAPI spec generated from zod schemas; docs at `docs.mailnitio.com` (Mintlify/Docusaurus/Fumadocs).

### 17.2 Outbound webhooks
| Event | Product |
|---|---|
| `message.sent`, `message.delivered`, `message.bounced`, `message.complained`, `message.opened`, `message.clicked`, `message.unsubscribed` | Send |
| `campaign.sent`, `campaign.completed` | Send |
| `helpdesk.ticket.created`, `helpdesk.ticket.updated`, `helpdesk.ticket.assigned`, `helpdesk.ticket.resolved`, `helpdesk.message.received`, `helpdesk.message.sent`, `helpdesk.sla.breached`, `helpdesk.email.rerouted`, `helpdesk.review.opened`, `helpdesk.escalation` | Helpdesk |
Signed (`Mailnitio-Signature: t=…,v1=HMAC`), retries with exponential backoff for 24h, delivery log + manual resend in the UI.

### 17.3 MCP server (Phase 10)
A tenant-scoped MCP server (API-key auth) so AI agents can use Mailnitio:
| Tool | Description |
|---|---|
| `send_email` | Send a templated or raw email (respects limits/suppressions) |
| `list_templates`, `get_template` | Template discovery |
| `get_message_status` | Delivery timeline |
| `search_helpdesk_tickets` | Search Helpdesk log (decisions, categories) |
| `get_ai_decision` | Why an email was routed as it was |
| `list_reviews`, `resolve_review` | Human-in-the-loop actions (scoped) |
| `campaign_stats` | Campaign performance |

---
# PART C: PHASES (SPEC-DRIVEN)

## 18. How Phases Are Specified

Each phase has:
- **Goal:** the outcome in one sentence
- **Scope:** in / out
- **Requirements:** `P<n>-<AREA>-<nn>`, each testable
- **Acceptance criteria:** Given / When / Then for the key behaviours
- **Deliverables:** what exists at the end
- **Exit criteria:** what must be true to close the phase
- **Dependencies:** what must come first

Workflow per requirement: spec → tests (where practical) → build → review → demo → mark done. Specs live in `docs/specs/phase-<n>.md`, generated from this document and refined before each phase starts.

---

## 19. Phase 0: Foundations

**Goal:** a secure multi-tenant base that every product builds on, deployed to staging and production.
**Duration:** ~1 week · **Depends on:** company, domain, accounts (Render, Neon, AWS, Cloudflare, GitHub)

**In scope:** repo, CI/CD, DB + RLS, auth, workspaces, members, roles, API keys, audit, usage events, feature flags, envelope encryption, job queue, observability, AWS base (SES production-access request, SNS/SQS, S3), lean hosting.
**Out of scope:** product features, billing.

| ID | Requirement |
|---|---|
| P0-REPO-01 | Monorepo (pnpm + Turborepo) with apps `web`, `api`, `worker`, packages per Section 5 |
| P0-CI-01 | GitHub Actions: typecheck, lint, unit tests, build on every PR; deploy staging on merge; manual approval to prod |
| P0-DB-01 | Drizzle schema + migrations for the core tables (Section 7) |
| P0-DB-02 | RLS enabled + forced on every workspace table; app connects as a non-owner role |
| P0-DB-03 | `withTenant(workspaceId, fn)` sets `app.workspace_id` per transaction; lint rule forbids raw DB access outside it |
| P0-AUTH-01 | Email/password sign-up with email verification; Google + Microsoft login |
| P0-AUTH-02 | TOTP 2FA; enforced for owner/admin |
| P0-WS-01 | Create workspace on sign-up; invite members by email; roles per Section 8.3; workspace switcher API |
| P0-KEY-01 | API keys: create (shown once), hash storage, scopes, revoke, last-used |
| P0-AUD-01 | Audit log entries for auth events, member changes, key changes, settings changes |
| P0-SEC-01 | Envelope encryption library (KEK env, per-workspace DEK, AES-256-GCM) with tests |
| P0-Q-01 | pg-boss configured (worker on the direct DB connection), retries, DLQ, schedules |
| P0-OBS-01 | pino logs → Better Stack; Sentry in web/api/worker; `/health` endpoints; uptime monitors |
| P0-AWS-01 | Terraform: S3 buckets, SNS topic + SQS queue (+DLQ) for SES events, IAM least-privilege users per env |
| P0-AWS-02 | SES: platform domain `mail.mailnitio.com` verified (DKIM, MAIL FROM, DMARC); **production access requested** |
| P0-MAIL-01 | System emails (verification, invites, password reset) sent via SES |
| P0-FLAG-01 | Feature flags (global + per workspace) with an admin toggle |
| P0-ADMIN-01 | Minimal platform admin: list workspaces/users, suspend workspace, view audit |

**Acceptance criteria**
- *Given* users in workspaces A and B, *when* a user in A calls any endpoint with B's IDs, *then* they get 404/403 and the RLS test suite passes for every table.
- *Given* a new sign-up, *when* the user verifies their email, *then* a workspace exists with them as owner and an audit entry is recorded.
- *Given* an API key, *when* it is revoked, *then* subsequent calls fail within 60 seconds.
- *Given* a deploy to main, *then* staging updates automatically and production requires approval.

**Deliverables:** running staging + production (lean plans), auth + workspaces working end to end, CI green, runbook skeleton.
**Exit criteria:** all P0 requirements done; RLS tests green; SES production access requested (approval may arrive later); error/uptime alerts reach the team.

---

## 20. Phase 1: Website & Accounts

**Goal:** a public website that explains Mailnitio, captures leads and sign-ups, and leads into the app.
**Duration:** ~1–2 weeks (parallel with Phase 2) · **Depends on:** P0 auth/workspaces

| ID | Requirement |
|---|---|
| P1-WEB-01 | Pages per Section 12.2 (Home, Helpdesk, Send, Pricing, Security, Integrations, About, Contact, Legal, Docs stub) |
| P1-WEB-02 | Responsive, Lighthouse ≥ 90 (performance, SEO, accessibility) on marketing pages |
| P1-WEB-03 | SEO: metadata, OG images, sitemap, robots, structured data |
| P1-LEAD-01 | Book demo / POC form (fields per 12.3), Turnstile, saved to `leads`, Slack + email notification, auto-reply with calendar link |
| P1-LEAD-02 | Send waitlist form → `waitlist` + confirmation email |
| P1-ONB-01 | Sign-up onboarding: workspace details → product choice → next step (POC request / waitlist / demo workspace) → invite teammates |
| P1-APP-01 | App shell: workspace switcher, product nav, settings (profile, members, API keys, audit), empty states |
| P1-ADMIN-01 | Admin: leads pipeline (status, notes, owner), waitlist export |
| P1-LEGAL-01 | Terms, Privacy, AUP, Cookie policy, DPA request page (lawyer-reviewed before Phase 5 launch) |
| P1-ANL-01 | Analytics (privacy-friendly) + UTM capture into leads/sign-ups |

**Acceptance criteria**
- *Given* a visitor on `/helpdesk`, *when* they submit the demo form, *then* a lead is stored, sales gets notified within 1 minute, and the visitor receives a confirmation email.
- *Given* a new user, *when* they complete onboarding choosing "Send", *then* they land in the app with the Send waitlist confirmed and an empty-state guide.
- *Given* a mobile device, *then* all marketing pages render without horizontal scroll and pass basic accessibility checks.

**Deliverables:** live website at `mailnitio.com`, app at `app.mailnitio.com`, leads + waitlist pipeline.
**Exit criteria:** website live, forms working end to end, legal pages published, analytics recording.

---

## 21. Phase 2: Helpdesk + AI Agent Core (Outlook)

**Goal:** the first product: a native mini helpdesk where the AI agent handles inbound Outlook email and the team works tickets on Mailnitio, ready for the demo, early customers and as the base for the CRM POC.
**Duration:** ~3–4 weeks · **Depends on:** P0 · **Spec:** `mailnitio-middleware-spec.md` Sections 4–13, 15–19

| ID | Requirement |
|---|---|
| P2-CON-01 | Graph connector: client-credentials auth (cert or secret), test connection |
| P2-CON-02 | Subscriptions per mailbox: create, validate echo, renew (< 48h), lifecycle notifications, delete |
| P2-CON-03 | Webhook: clientState verification, enqueue in the same transaction, 202 in < 3s |
| P2-CON-04 | Delta reconciliation every 15 min per mailbox |
| P2-PIPE-01 | Write-ahead `email_log`, status machine, step flags, idempotent `source_key`, per-thread advisory lock |
| P2-PIPE-02 | Pre-filter: auto-replies, bounces, loops, own messages |
| P2-THR-01 | Thread resolver: case token → headers → conversationId → heuristic; `email_threads`, `message_index` |
| P2-AI-01 | LLM gateway: ≥ 2 providers, BYOK + managed, JSON enforcement, metering, budgets |
| P2-AI-02 | Classifier with tenant-defined categories (config), confidence, priority, escalation flags |
| P2-AI-03 | Context Agent: decision + reply type + rolling summary (one call) |
| P2-RTE-01 | Router: decision table, thresholds, escalation rules, Needs Review |
| P2-HD-01 | **HelpdeskDestination:** AI pipeline creates/appends tickets (`MN-xxxx`), sets team, priority, category, tags, needs-review |
| P2-HD-02 | Ticket views: My tickets, Unassigned, Team queues, Needs Review, Escalations, All; filters, search, bulk actions |
| P2-HD-03 | Ticket detail: thread (inbound/outbound/notes), AI summary + reason, customer panel, decision timeline |
| P2-HD-04 | Reply / reply-all / forward from the UI via Graph from the receiving mailbox, threading headers + ticket key in the subject |
| P2-HD-05 | Internal notes with @mentions; collision indicator |
| P2-HD-06 | Assignment (manual + round-robin per team); statuses + reopen rules; merge/split/link |
| P2-HD-07 | Teams (queues) mapped from categories; Agent + Supervisor roles |
| P2-HD-08 | Canned responses with variables |
| P2-HD-09 | Customers (auto-created from senders) with ticket history |
| P2-HD-10 | Notifications (in-app + email): assignment, customer reply, mention |
| P2-HD-11 | Optional Outlook sync: category/folder per team |
| P2-HD-12 | AI suggested reply (KB + response library) and thread summary; human sends |
| P2-SLA-01 | SLA policies + business hours; first-response/resolution timers; breach warnings (may slip to Phase 3) |
| P2-RPT-01 | Basic reports: volume, first response, resolution time, backlog, AI metrics |
| P2-ACK-01 | Acknowledgement via createReply/send with templates, `Auto-Submitted` header, loop limits + breaker |
| P2-KB-01 | Minimal KB (manual entries) + KB Answer + Guardrail agents, mode `suggest`/`send` per topic (demo-grade) |
| P2-PORT-01 | Portal: dashboard, email log + filters, email detail/timeline, Needs Review + override, replay, mailboxes, connections |
| P2-OPS-01 | Alerts: failures, DLQ, subscription expiry, silence; canary on demo mailboxes |
| P2-CLI-01 | `mailnitio` CLI: workspace provision, connection add/test, mailbox add/subscribe/mode, config push/validate |

**Acceptance criteria** (run on the Mailnitio demo tenant)
- *Given* an enquiry sent to `complaints@`, *when* processed, *then* it is classified as an enquiry with confidence ≥ threshold, a ticket `MN-xxxx` is created in the Enquiries team queue (rerouted from Complaints), and the sender receives one acknowledgement.
- *Given* an agent replies from the ticket, *then* the customer receives it from `complaints@` in the same email thread, and the message appears on the ticket as outbound.
- *Given* the customer replies to the acknowledgement or to an agent, *then* it attaches to the same ticket with reply type `continuation`, the assignee is notified, and no new acknowledgement is sent.
- *Given* "thank you" on a case, *then* reply type `closure`, no reply sent.
- *Given* the same notification delivered twice, *then* one log row, one case, one acknowledgement.
- *Given* the webhook is down for 30 minutes, *then* delta reconciliation processes all missed emails.
- *Given* an out-of-office reply, *then* it is skipped with reason `auto_reply`.
- *Given* "Where are your offices?" with KB mode `send`, *then* an answer grounded in the KB entry is sent and recorded with its KB IDs; with mode `suggest`, it is shown in the portal only.

**Deliverables:** native Helpdesk (tickets, replies, assignment, teams, canned responses, customers, notifications, basic reports) powered by the AI agent pipeline; AI review portal; CLI; alerts.
**Exit criteria:** scenario subset (middleware spec 20.1 #1–5, 8–17, 22–23, 27–28, 30–31 in native mode) passes; an internal team works the demo tenant's tickets end to end for 3 consecutive days.

---

## 22. Phase 3: Live Demo

**Goal:** a public, safe, impressive live demo on the website, plus presenter mode for meetings.
**Duration:** ~1 week · **Depends on:** P1, P2

| ID | Requirement |
|---|---|
| P3-DEMO-01 | Demo M365 tenant + shared mailboxes + app registration scoped to them (Section 14.2) |
| P3-DEMO-02 | Demo workspace with fictional company config, categories, KB ("Acme Asset Management") |
| P3-DEMO-03 | `/helpdesk/demo` page with instructions, sample scripts and a live sanitised feed (polling ≤ 3s or SSE) |
| P3-DEMO-04 | Presenter mode: staff login shows the full portal for the demo workspace |
| P3-DEMO-05 | Abuse controls per Section 14.5 (rate limits, sanitisation, reply caps, blocklist, budget cap) |
| P3-DEMO-06 | Nightly reset + 7-day data deletion for the demo workspace |
| P3-DEMO-07 | Demo video (2–3 min) + screenshots for the website and sales deck |
| P3-SALES-01 | Sales deck + one-pager + POC proposal template + security/trust pack v1 |

**Acceptance criteria**
- *Given* a visitor emails `complaints@…` with "what is your minimum investment?", *then* within 15 seconds the feed shows classification + reroute + case, and the visitor receives an acknowledgement and a KB answer.
- *Given* 10 emails from one sender in 5 minutes, *then* replies stop after the cap and the feed shows "rate limited".
- *Given* the public feed, *then* no full addresses or bodies are visible.

**Deliverables:** live demo, presenter mode, demo video, sales kit.
**Exit criteria:** 20 consecutive demo runs succeed; latency p95 < 15s; abuse tests pass.

---

## 23. Phase 4: Middleware POC (CRM Sandbox + Training)

**Goal:** prove **Middleware mode**: the same AI agent connected to a real client's environment (their test mailboxes + their **CRM sandbox**), trained on their (masked or synthetic) history, creating and updating cases in their CRM.
**Duration:** 2–4 weeks per POC (runs alongside Phase 5) · **Depends on:** P2, P3, a signed POC agreement

| ID | Requirement |
|---|---|
| P4-POC-01 | POC agreement template: scope, duration, success criteria, NDA, data handling (sandbox data / masked / synthetic) |
| P4-CRM-01 | Dataverse connector (middleware spec 13.2): auth, contact lookup, **idempotent case create via alternate key**, append email, queue, reopen, link |
| P4-CRM-02 | Tenant field mapping config + `mailnitio crm check` (fields, key, role, queues) |
| P4-CUS-01 | Customer resolver (middleware spec Section 9) with contact cache + flags |
| P4-TRN-01 | Trainer worker: ingest (Dataverse/file), clean, mask, embed, cluster, label, response scoring |
| P4-TRN-02 | Insight report (topics, misrouting %, reopen rates, auto-response candidates) |
| P4-TRN-03 | Taxonomy review via XLSX export/import; gold set; evaluation; calibration |
| P4-TRN-04 | Knowledge Pack v1 build, export, activate in shadow |
| P4-SHD-01 | Shadow mode on the client's test mailboxes with comparison report vs expected outcomes |
| P4-REP-01 | POC results report: accuracy, duplicates prevented, threading accuracy, time saved estimate, recommendations |

**Acceptance criteria** (agreed with the client before starting)
- Routing accuracy ≥ 90% on the client gold set; complaint recall ≥ 97%.
- Zero duplicate cases across the scenario suite (middleware spec 20.1).
- Reply-to-correct-case ≥ 95%.
- KB answers 100% grounded (no hallucination in a reviewed sample).
- No lost emails in the reconciliation test.

**Deliverables:** working POC in the client sandbox, insight report, POC results report, go/no-go recommendation.
**Exit criteria:** client sign-off on the POC results → production pilot proposal (Phase 7).

---

## 24. Phase 5: Send MVP (API + Templates)

**Goal:** developers can verify a domain, create templates, and send transactional email via API with full event tracking.
**Duration:** ~3–4 weeks · **Depends on:** P0 (AWS, SES production access), P1

| ID | Requirement |
|---|---|
| P5-DOM-01 | Add domain → SES identity (Easy DKIM) + custom MAIL FROM; DNS records shown; verification polling; status UI |
| P5-DOM-02 | Block free/personal domains as From; DMARC presence check + guidance |
| P5-API-01 | `POST /v1/send`, `POST /v1/send/batch` per Section 15.5 with validation, idempotency keys, scopes |
| P5-API-02 | Rate limiting per key/workspace; plan quotas; clear error codes |
| P5-DSP-01 | Dispatcher: per-workspace fair queues, template rendering, headers, SES SendEmail with config set + tags, retry on throttling |
| P5-EVT-01 | SES config set per workspace → SNS → SQS; event-ingestor updates status/timeline |
| P5-EVT-02 | Hard bounce/complaint → suppression; suppression check before send |
| P5-TPL-01 | Templates: MJML/HTML + Handlebars, versions, preview with sample data, test send |
| P5-LOG-01 | Message log UI: search by recipient/ID/tag/status, timeline view |
| P5-WH-01 | Customer webhooks (Section 17.2 Send events): endpoints, signing, retries, delivery log |
| P5-STAT-01 | Dashboard: sent, delivered, bounce %, complaint %, by day |
| P5-REP-01 | Per-workspace reputation tracking + auto-throttle/pause thresholds (Section 15.10) |
| P5-DOC-01 | Docs site: quickstart, auth, send, templates, events, webhooks, errors; Node + Python SDKs; OpenAPI |
| P5-FREE-01 | Free tier limits (e.g. 3,000/month, 100/day) + new-account limits |

**Acceptance criteria**
- *Given* a workspace adds `company.com`, *when* the DNS records are added, *then* the domain shows verified (DKIM + MAIL FROM) within 15 minutes of propagation.
- *Given* a valid API call with a template and variables, *then* the email arrives rendered correctly, the message shows `delivered`, and a `message.delivered` webhook is received.
- *Given* the same `Idempotency-Key` twice, *then* one message is sent and the second call returns the original message.
- *Given* a hard-bounce address, *then* the message shows `bounced`, the address is suppressed, and the next send to it is rejected with `suppressed`.
- *Given* a workspace's complaint rate exceeds its threshold, *then* its marketing stream is paused and staff are alerted.

**Deliverables:** Send API + dashboard + docs + SDKs.
**Exit criteria:** 10 internal/beta workspaces sending; event accuracy verified against SES; SES account bounce < 2%, complaint < 0.05%.

---

## 25. Phase 6: Billing & Plans

**Goal:** charge for Send (self-serve) and Helpdesk (invoice/subscription), with metering and entitlements.
**Duration:** ~1–2 weeks · **Depends on:** P0 usage events, P5

| ID | Requirement |
|---|---|
| P6-PLN-01 | Plans + entitlements per product (Section 34), admin-editable |
| P6-PAY-01 | Paystack subscriptions (NGN) + card payments; webhook verification; Stripe/USD path where available |
| P6-INV-01 | Invoices (PDF), VAT, billing details, history |
| P6-USE-01 | Usage roll-ups (daily) → overage calculation → invoice lines |
| P6-LIM-01 | Limit enforcement: warnings at 80/100%, hard stop or overage per plan |
| P6-DUN-01 | Dunning: retries, emails, grace period, downgrade/pause |
| P6-ENT-01 | Enterprise manual subscriptions (annual invoice, onboarding fee) |

**Acceptance criteria**
- *Given* a Send workspace on a plan, *when* usage passes 80%, *then* the owner gets a warning email + in-app banner.
- *Given* a failed renewal, *then* dunning emails are sent and service continues during the grace period, then pauses per policy.

**Exit criteria:** a real payment collected end to end in production; invoices correct for a test month.

---

## 26. Phase 7: Middleware Pilot → Production

**Goal:** the first client live in production per mailbox, with SLA and support.
**Duration:** 2–6 weeks (client-paced) · **Depends on:** P4 success, contract, client approvals

| ID | Requirement |
|---|---|
| P7-CON-01 | Contract: MSA, DPA, SLA, order form; security questionnaire completed |
| P7-SEC-01 | Pen test (or client security review) passed; findings fixed |
| P7-PRD-01 | Production connections (Graph + Dataverse prod), BYOK LLM configured |
| P7-SHD-01 | Shadow on production mailboxes 1–2 weeks; comparison report accepted |
| P7-LIVE-01 | Go-live per mailbox (client disables native email-to-case on that mailbox) |
| P7-OPS-01 | Canary, CRM reconciliation, alerts to Mailnitio ops + client contacts, on-call rota |
| P7-SUP-01 | Support process: channel, SLA hours, escalation, monthly review meeting |

**Exit criteria:** all agreed mailboxes live; 30 days with no Sev-1 incidents; reconciliation clean; client acceptance → becomes the reference customer.

---

## 27. Phase 8: Send Campaigns

**Goal:** a Mailchimp-type marketing product on top of Send.
**Duration:** ~4–6 weeks · **Depends on:** P5, P6

| ID | Requirement |
|---|---|
| P8-CON-01 | Contacts with custom fields, consent, tags; CRUD + API |
| P8-IMP-01 | CSV/XLSX import with mapping, validation, dedupe, suppression, report |
| P8-SEG-01 | Lists + rule-based segments |
| P8-EDT-01 | Drag-and-drop editor (GrapesJS+MJML or an embedded editor), saved templates, brand kit (logo, colours, footer) |
| P8-CMP-01 | Campaign builder: audience, template, subject/preheader, from, schedule/timezone, throttle, send now |
| P8-AB-01 | A/B subject/content test with auto-winner |
| P8-UNS-01 | Unsubscribe link + one-click `List-Unsubscribe`/`-Post` headers + hosted preference centre |
| P8-TRK-01 | Open/click tracking; custom tracking domain per workspace |
| P8-RPT-01 | Campaign reports (Section 15.8) + per-domain breakdown |
| P8-SMTP-01 | SMTP relay credentials per workspace (for legacy apps) |
| P8-SAFE-01 | Pre-send checks + first-campaign review queue |

**Acceptance criteria**
- *Given* an imported list with invalid, duplicate and suppressed rows, *then* the import report shows each category and only valid, consented contacts are added.
- *Given* a scheduled campaign, *then* it sends at the scheduled time in the chosen timezone, honouring the throttle, and the report updates within 5 minutes of events.
- *Given* a recipient clicks one-click unsubscribe in their mail client, *then* they are unsubscribed within 1 minute and excluded from future marketing sends.

**Exit criteria:** 5 workspaces running real campaigns; unsubscribe compliance verified with major mailbox providers; complaint rate < 0.1%.

---

## 28. Phase 9: Helpdesk Self-Serve (Connect, Config & Training UI)

**Goal:** a company can connect Microsoft 365, configure and train Helpdesk mostly without Mailnitio staff.
**Duration:** ~4–6 weeks · **Depends on:** P7

| ID | Requirement |
|---|---|
| P9-MSA-01 | Mailnitio multi-tenant Entra app + admin-consent flow ("Connect Microsoft 365"); **publisher verification** completed |
| P9-MBX-01 | Mailbox picker + scope guidance (access policy instructions for admins) |
| P9-CFG-01 | Config UI: categories, destinations/queues, rules, thresholds, templates, agents, with versioning, diff, shadow activation |
| P9-TRN-01 | Training UI (middleware spec 14.16): data sources, runs, clusters, taxonomy, gold labelling, responses, KB, eval, publish/rollback |
| P9-ONB-01 | Onboarding wizard: connect → choose mode (mailbox/CRM) → import history → train → shadow → go live |
| P9-CRM-01 | Self-serve Dynamics connection (app user instructions + test) |

**Exit criteria:** a new customer goes from sign-up to shadow mode without staff help, in a test with 2 friendly customers.

---

## 29. Phase 10: Integrations (API, Webhooks, MCP, Connectors)

**Goal:** Mailnitio fits into customers' ecosystems and AI agents.
**Duration:** ongoing, ~6–8 weeks initial · **Depends on:** P5, P7

| ID | Requirement |
|---|---|
| P10-API-01 | Public Helpdesk API (ingest messages, query decisions/cases) + full OpenAPI |
| P10-WH-01 | Helpdesk webhooks (Section 17.2) |
| P10-MCP-01 | MCP server with tools per Section 17.3; API-key scopes; audit of agent actions |
| P10-ZAP-01 | Zapier/Make apps (send email, new event triggers) |
| P10-GML-01 | Gmail/Workspace connector (OAuth + Pub/Sub watch); Google verification + security assessment |
| P10-SF-01 | Salesforce connector (cases, contacts, queues) |
| P10-HS-01 | HubSpot connector (tickets, contacts, pipelines) |
| P10-INB-01 | Inbound via forwarding/MX (SES receiving) for customers without API access |

**Exit criteria:** each connector passes its contract suite + one live customer/partner using it.

---

## 30. Phase 11: Enterprise & Scale

**Goal:** close larger enterprise deals and scale sending volume.
**Depends on:** revenue + demand

| ID | Requirement |
|---|---|
| P11-SSO-01 | SAML/OIDC SSO, SCIM provisioning, enforced 2FA, IP allowlists |
| P11-CMP-01 | SOC 2 Type I → II program; ISO 27001 roadmap; annual pen tests |
| P11-HOST-01 | Customer-hosted deployment (Docker + Terraform/Bicep for Azure/AWS), update pipeline |
| P11-IP-01 | Dedicated sending IPs + warm-up automation; separate IP pools per stream |
| P11-DLV-01 | Deliverability tooling: inbox placement tests, blocklist monitoring, DMARC report parsing |
| P11-CH-01 | Channels: WhatsApp/SMS into Helpdesk; SMS in Send |
| P11-SCL-01 | Queue migration to SQS/Redis for Send at high volume; read replicas; partition management |
| P11-DATA-01 | Data residency options (EU / in-country partner hosting) |

---
# PART D: DELIVERY

## 31. Timeline & Dependencies

```
Week:        1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16
P0 Found.   ███
P1 Website   ███  ███
P2 Helpdesk+AI   ███  ███  ███  ███
P3 Demo                     ███
P4 Middleware POC                        ███  ███  ███  ███ (client-paced)
P5 Send MVP                                ███  ███  ███  ███
P6 Billing                                                ███  ███
P7 Middleware pilot                                             ███  ███  ███  ███ (client-paced)
P8 Campaigns                                                        ███  ███  ███  ███ ...
P9 Helpdesk self-serve                                                            (months 4–5)
P10 Integrations                                                               (months 5–6)
P11 Enterprise                                                                 (month 6+)
```

| Milestone | Target | Proof |
|---|---|---|
| M1: Platform live | End of week 1 | Sign-up → workspace in production |
| M2: Website live + leads | Week 2 | First demo requests |
| M3: Live demo | Week 4 | Public demo + presenter mode |
| M4: First POC started | Weeks 4–5 | Client sandbox connected |
| M5: Send beta | Week 8 | Beta workspaces sending via API |
| M6: First revenue | Weeks 6–11 | Native Helpdesk subscription, Send payments or Middleware pilot invoice |
| M7a: First native Helpdesk customer | Weeks 6–10 | Team working tickets in production |
| M7b: First Middleware (CRM) customer live | Weeks 10–14 | Production mailboxes live in CRM mode |
| M8: Campaigns GA | Week 16+ | Real campaigns sent |

**Critical-path dependencies**
| Dependency | Needed for | Lead time | Action |
|---|---|---|---|
| SES production access | P5 | Days–weeks | Request in P0 with bounce/complaint handling described |
| Microsoft demo tenant | P2/P3 | 1 day | Business Basic trial or developer sandbox |
| Client POC agreement + sandbox access | P4 | Weeks | Start sales conversations in P1 |
| Paystack/Stripe merchant approval | P6 | 1–3 weeks | Apply in P1 |
| Legal docs (Terms, Privacy, AUP, DPA) | P1/P5 | 1–2 weeks | Engage a lawyer in P0 |
| Company registration, bank, tax | P6/P7 | Weeks | Start immediately |
| Microsoft publisher verification (Partner ID) | P9 | Weeks | Start in P7 |
| Google OAuth verification + security assessment | P10 Gmail | Weeks–months | Start early in P10 |

---

## 32. Team & Responsibilities

| Role | Phase 0–6 | Responsibilities |
|---|---|---|
| **Lead / architect (you)** | Full-time | Architecture, backend core, AI agent pipeline + Helpdesk backend, SES integration, infrastructure, security |
| **Full-stack developer** | Full-time | Website, Helpdesk UI (tickets, views, replies), Send dashboard, templates UI, tests |
| **Customer success / sales** | Part-time from Phase 3 | Leads, demos, POCs, onboarding, training reviews, support line 1 |
| **Outsourced** | As needed | Lawyer (contracts, policies), accountant (tax/VAT), pen test firm, designer (post-MVP) |

Grow to 4–5 (second developer, onboarding/support specialist) after 3–5 paying Helpdesk customers or meaningful Send volume.

**Ways of working:** weekly phase review against requirements; demo every Friday; specs in `docs/specs`; ADRs for decisions; Claude-assisted development with code review on every PR.

---

## 33. Cost by Phase (infrastructure, approximate)

| Phase | Setup | Monthly |
|---|---|---|
| P0–P1 | Render Starter ×3 (web, api, worker), Neon free/launch, Cloudflare free, Sentry/Better Stack free, AWS (SES/SQS/S3 pennies), domain | **~$25–60** |
| P2–P3 | + Microsoft demo tenant (1 licence ~$6) + LLM usage for demo (capped) | **~$40–100** |
| P4 | + trainer runs (~$25–75 per run) + client BYOK or managed LLM | **~$60–150** |
| P5–P6 | + SES sending (**$0.10 per 1,000 emails**) + staging AWS account; upgrade API/worker to Standard | **~$100–250** + SES usage |
| P7 | Production hardening: Standard ×2 for API/worker, Neon Launch/Scale, paid monitoring | **~$200–400** |
| P8+ | Growth: more workers, DB scale, dedicated IPs (~$25 each/month), editor licence (if commercial) | Scales with revenue |

One-off: legal docs ~$1k–3k · pen test ~$3k–8k (before the first enterprise go-live) · company/tax setup (varies).
All prices are approximate and must be checked against current vendor pricing.

---

## 34. Pricing (Initial, to validate)

### 34.1 Mailnitio Helpdesk
**Native Helpdesk (per agent + AI usage)**
| Plan | Price | Includes | AI usage |
|---|---|---|---|
| **Starter** | ~$12–15 / agent / month | 1 mailbox, tickets, assignment, canned responses, basic reports | AI routing + acknowledgement on up to 2,000 emails/month |
| **Growth** | ~$25–35 / agent / month | 5 mailboxes, teams, SLAs, Outlook sync, AI suggested replies, KB auto-answer | Up to 10,000 emails/month; then ~$0.02/email |
| **Business** | ~$45–60 / agent / month | Unlimited mailboxes, advanced reports, training on history (Knowledge Pack), API/webhooks | Up to 30,000 emails/month; BYOK option |
| **BYOK discount** | −20–30% on AI usage | Customer's own Azure OpenAI/Claude/Gemini key | — |

**Middleware mode (CRM connector, enterprise)**
| Plan | Monthly | Includes | Overage |
|---|---|---|---|
| **Middleware BYOK** | $500 | Up to 30k processed emails, 5 mailboxes, 1 CRM, AI review portal | $0.02 / email |
| **Middleware Managed AI** | $1,000 | Same + AI included | $0.03 / email |
| **Enterprise** | from $2,000 | Unlimited mailboxes, 150k+ emails, SLA, priority support, quarterly retraining, auto-response | Custom |
| **Onboarding** | $2,000–5,000 one-time | CRM integration, historical training, Knowledge Pack, shadow, go-live | — |
| **POC** | Free or credited against onboarding | 2–4 weeks in the client sandbox | — |

Native Helpdesk is priced per agent because the team works inside Mailnitio; Middleware is priced per email because the team works in their CRM.

### 34.2 Mailnitio Send
| Plan | Monthly | Emails / month | Notes |
|---|---|---|---|
| **Free** | $0 | 3,000 (100/day) | 1 domain, API + templates, Mailnitio branding in marketing footer |
| **Starter** | ~$10–15 | 20,000 | 3 domains, webhooks, 30-day logs |
| **Growth** | ~$35–50 | 100,000 | Campaigns, 10k contacts, A/B, 90-day logs |
| **Scale** | ~$150+ | 500,000+ | Dedicated IP option, priority support |
| **Overage** | ~$0.40–0.80 per 1,000 | — | Cost basis: SES $0.10 / 1,000 + infrastructure + support |
| **NGN pricing** | Local price list via Paystack | — | Review quarterly for exchange-rate moves |

Margins: Send is high-margin per email but low per customer, so volume matters. Native Helpdesk scales with seats across many SMEs; Middleware is high-value per enterprise customer, so a few customers matter. Validate both with early customers before publishing final prices.

---

## 35. Risks & Mitigations

| Risk | Area | Mitigation |
|---|---|---|
| SES production access delayed or denied | Send | Apply in P0 with clear policies; strong abuse controls; fallback provider adapter (Postmark/Mailgun) behind the same interface |
| A spammer damages the shared SES reputation | Send | Verified domains, new-account limits, per-workspace auto-pause, AUP, review queue, separate streams |
| Long enterprise sales cycles | Middleware | Live demo + quick POCs; Send revenue in parallel; founding-customer pricing |
| Client approvals slow (Entra, CRM, security) | Middleware | Request on day 0; native Helpdesk lets clients start without the CRM |
| Small-vendor trust | Both | Trust pack, BYOK, shadow mode, status page, security page, references |
| Wrong customer receives information | Helpdesk | No account data in auto-responses; reply only to the actual sender; guardrails; human review |
| Lost or duplicated emails/cases | Helpdesk / Middleware | Write-ahead, idempotency (unique source key; CRM alternate key in middleware mode), reconciliation, canary |
| Deliverability problems (spam folder) | Send | SPF/DKIM/DMARC enforcement, one-click unsubscribe, warm-up, dedicated IPs later |
| Microsoft/Google API or policy changes | Helpdesk | Official SDKs, monitor deprecations, connector contract tests |
| Exchange-rate risk (NGN revenue, USD costs) | Business | USD-indexed or regularly reviewed NGN pricing; annual prepay |
| Support load with a small team | Ops | Self-serve onboarding (P9), docs, runbooks, CS hire at 3–5 customers |
| Scope creep from client custom requests | Delivery | Phase specs + change requests; paid custom integration work |
| Key-person dependency | Ops | Docs, ADRs, CLI, two people able to operate production |

---

## 36. Decision Log & Open Questions

| # | Decision / question | Status | Default |
|---|---|---|---|
| D1 | Product names: Mailnitio Helpdesk (native + Middleware mode) / Mailnitio Send | Proposed | Adopt |
| D2 | Hosting: Render + Neon (Frankfurt) + AWS eu-central-1 | Decided (lean) | — |
| D3 | Queue: pg-boss until Send volume needs SQS/Redis | Decided | Revisit at ~1M sends/month |
| D4 | Template editor for campaigns: GrapesJS (OSS) vs embedded commercial editor | Open | Decide at P8 start |
| D5 | Payments: Paystack primary; Stripe via an eligible entity | Open | Paystack first |
| D6 | Legal entity contracting with clients | Open | Register before P6 |
| D7 | First product = native Helpdesk (AI email customer service); Middleware (CRM connector) proven via POC in parallel | Decided | — |
| D7b | POC environment for Middleware | Decided | Client CRM sandbox; native Helpdesk if no CRM |
| D8 | Docs platform (Mintlify / Docusaurus / Fumadocs) | Open | Fumadocs (inside Next.js) |
| D9 | Analytics (Plausible / PostHog) | Open | PostHog (product + web) |
| D10 | Free tier size for Send | Open | 3,000/month |
| D11 | SES multi-tenant features vs own per-workspace controls | Open | Own controls; evaluate SES features at P5 |
| D12 | Domain names (`mailnitio.com` availability) | Open | Secure the domain + social handles now |

---

## 37. Glossary

| Term | Meaning |
|---|---|
| **Workspace** | A customer account (tenant); owns members, products, data |
| **Helpdesk** | Mailnitio's first product: AI email customer service with tickets on the platform (native) or connected to a CRM (middleware mode) |
| **AI agent engine** | The shared pipeline (classify, route, thread, identify, acknowledge, answer, train) behind both modes |
| **Middleware mode** | Helpdesk's CRM connector mode: the AI agent creates/updates cases in the customer's CRM |
| **Send** | Mailnitio's email sending product (API, templates, campaigns) |
| **Native mode** | Helpdesk with tickets on Mailnitio; agents work in the Mailnitio UI; replies sent via the customer's mailbox |
| **BYOK** | Bring your own key: the customer's own LLM endpoint/key |
| **Knowledge Pack** | Versioned per-workspace training output used by the AI agent |
| **Shadow mode** | The AI agent decides and logs without acting |
| **SES** | Amazon Simple Email Service: the sending infrastructure behind Send |
| **Configuration set** | SES grouping of sending rules and event destinations (one per workspace) |
| **DKIM / SPF / DMARC** | Email authentication records a customer adds to DNS to send from their domain |
| **Suppression list** | Addresses never to send to (bounced, complained, unsubscribed) |
| **Stream** | Transactional vs marketing sending, kept separate for reputation |
| **RLS** | Postgres row-level security, enforcing workspace isolation |
| **REQ ID** | Requirement identifier `P<phase>-<area>-<nn>` used for spec-driven delivery |
