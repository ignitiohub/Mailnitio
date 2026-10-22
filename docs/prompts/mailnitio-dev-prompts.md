# Mailnitio — Development Prompt Pack (Demo MVP → Client POC → Roadmap)

| | |
|---|---|
| **Date** | 22 Oct 2026 |
| **Owner** | Makinde Victor |
| **Source of truth** | `docs/specs/mailnitio-platform-plan.md` (platform, products, phases) · `docs/specs/mailnitio-middleware-spec.md` (AI agent engine + CRM connector) |
| **How to use** | **Coding sessions:** paste **Prompt 0 (Global Context)** + **Prompt 0D (Design System & UX Standards)**, then the phase's **Build prompt**. **Design (Stitch):** paste the **Stitch Design Preamble**, then the phase's Stitch prompt. Tick the **Acceptance checklist** (including the Design QA checklist) before closing a phase. |

---

## Summary

We build a **generic, demo-ready Mailnitio in ~6 weeks**: a marketing site plus a working platform where a **native Helpdesk** (tickets on Mailnitio) is driven by an **AI agent** that sorts live support emails, plus **Send lite** (templates, audiences, a bulk send with a live monitor). It's enough for enterprises (e.g. an asset manager, an electricity distributor) to see the value and commission a **custom POC**, where the same AI agent runs in **Middleware mode** against their own mailbox and **CRM sandbox**.

- **Audience:** customer-service, CX and IT heads at organisations with high email volume on Outlook/Gmail, with or without a CRM (finance, utilities, telecoms, insurance, education).
- **The demo must prove:**
  1. An email sent live in the meeting is classified, rerouted, ticketed and logged with a reason within seconds.
  2. Replies attach to the existing ticket instead of creating duplicates; new issues in a reply become a new linked ticket.
  3. Humans stay in control: Needs Review, overrides, shadow mode, audit.
  4. Their own history can become an insight report (misrouting, top topics) without any integration.
- **It is not** a production integration into their CRM. That is the paid custom POC (Middleware mode) that follows.
- **One platform, two products:** **Mailnitio Helpdesk** (AI email customer service: the core pitch) and **Mailnitio Send** (templates + bulk sending, shown as an add-on in the demo).

---

## 1. Scope Split: What We Build Now vs POC vs Later

| Area | **NOW: Demo MVP (generic, weeks 1–6)** | **POC: per client (2–4 weeks each, after the demo is won)** | **LATER: roadmap (after first POC/customers)** |
|---|---|---|---|
| Platform | Monorepo, auth (email+password, TOTP), workspaces, roles, RLS, audit, usage events, admin basics | Client workspace provisioned by staff | Billing (Paystack/Stripe), SSO, self-serve onboarding |
| Website | Marketing site, pricing (config-driven), security, industries, book-a-demo, sign-in | — | Docs site, status page, blog |
| Email intake | Demo **Microsoft 365** tenant (Graph webhooks + delta); optional demo **Gmail** (internal Workspace app) | Client's own mailboxes via a **customer-owned** app registration, scoped to test mailboxes | Self-serve "Connect Microsoft 365" (multi-tenant app, publisher verification), Gmail public app |
| Tickets / cases | **Native Helpdesk:** tickets, teams/queues, customers, reply via Graph, notes, assignment, statuses | **Middleware mode:** Dynamics 365 (or Salesforce) connector, field mapping, **alternate-key idempotent** case creation | More CRMs (HubSpot, Zoho), sync between native and CRM |
| AI agent | Classifier + Context Agent via LLM gateway (managed keys), PII masking, router, escalation terms, acknowledgement | Their taxonomy, rules, VIP/third-party domains, reopen windows, BYOK (their Azure OpenAI) | KB auto-answer (send mode), suggested replies at scale, dynamic few-shot |
| Customer match | Email lookup in Mailnitio customers | Account no / ID-style identifiers, shared-email and third-party rules against the CRM | — |
| Human control | Needs Review, overrides, shadow/live per mailbox, audit | Their reviewers, comparison reports | Approval workflows |
| Insights / training | CSV upload → insight report (clean, mask, embed, cluster, label) | Full training run → **Knowledge Pack**, taxonomy sign-off, gold-set evaluation, calibration | Training UI in the portal |
| Send | **Send lite:** templates (MJML), audiences (CSV + consent), campaign builder, live send monitor, SES events; demo sends to the SES mailbox simulator | Their domains (DKIM/SPF/DMARC) if they want to trial Send | Send API + SDKs, webhooks, campaigns at scale, dedicated IPs |
| Security | MFA, roles, PII masking, tenant isolation, encrypted secrets | DPA/NDA, BYOK, data-handling agreement, sandbox data decision | SOC 2 path, customer-hosted deployment |
| Data | Invented companies + synthetic emails only | Real samples **only** under NDA, anonymised; sandbox data per agreement | — |

---

## 2. Demo Story (15 minutes)

One customer email from inbox to ticket, then zoom out to the dashboard and their own data.

1. **The problem (1 min):** landing page hero. Wrong-mailbox emails, duplicate cases, slow first response.
2. **Live send (3 min):** the client emails the demo `complaints@` mailbox from their phone. Within ~10 seconds it appears in the **Inbox Log** as *Enquiry · rerouted from Complaints · 94%*, a ticket `MN-1042` is created in the **Enquiries** team queue, and the acknowledgement lands on their phone.
3. **Why it decided (2 min):** open **Email Detail**: decision timeline (received → filtered → thread matched → customer found → classified → routed → ticket → acknowledged) with the AI's one-line reason.
4. **The reply (2 min):** the client replies *"Thanks, also my statement is wrong."* Mailnitio appends the thanks to `MN-1042` and opens **new linked ticket** `MN-1043` for the statement issue.
5. **The agent works it (1 min):** in the **Ticket** view, an agent replies from Mailnitio; the client receives it from `complaints@` in the same email thread.
6. **Human in control (2 min):** a regulator-threat email lands in **Needs Review** as an escalation; the presenter overrides a category; the change is audited.
7. **Dashboard (1 min):** volumes, reroute %, tickets created vs appended, AI cost per email, mailbox health, shadow vs live.
8. **Your data (2 min):** a pre-run **Insight Report** from a sample of their anonymised emails: top topics, % misrouted, auto-answer candidates.
9. **Close (1 min):** pricing page and the **POC offer**: 2 weeks in shadow mode on one of their mailboxes, connected to their CRM sandbox (Middleware mode).

*(Optional 2-min Send add-on: build a campaign to a 10k demo audience and watch the live send monitor.)*

---

## 3. Website Pages

| Page | Purpose | Key sections |
|---|---|---|
| **Home** | Pitch in one scroll | Hero ("Every support email in the right place, in seconds"), how it works (Mailbox → Mailnitio AI → Helpdesk or your CRM), stats strip, two product cards (Helpdesk, Send), works-with logos (Outlook, Gmail, Dynamics 365, Salesforce), security badges, CTA "Book a demo" |
| **Product: Helpdesk** | Depth for CX/IT buyers | AI routing by content, smart ticket creation, threading, customer matching, acknowledgements, team inbox + SLAs, Needs Review, shadow mode, training on your history, **Middleware mode for CRM users** |
| **Product: Send** | Add-on | Templates, audiences, bulk sends with a live monitor, deliverability (SPF/DKIM/DMARC), API coming soon |
| **Industries** | Vertical proof | Financial services, Utilities, Telecoms, Insurance, Education: sample categories, escalation terms, outcomes |
| **Pricing** | Self-qualify | Plans table (from typed config), usage calculator, POC offer, FAQ |
| **Security & Compliance** | Clear procurement | NDPA, data minimisation, PII masking, bring-your-own AI key, customer-hosted option, audit log, sub-processors |
| **Book a demo** | Lead capture | Form (name, work email, company, role, country, volume, email platform, CRM, message) + calendar link |
| **Sign in / Sign up** | Platform entry | Email + password, MFA |

---

## 4. Pricing (Config-Driven; Validate in First Meetings)

> Pricing lives in a **typed config file** so it can change without code edits. Figures follow `docs/specs/mailnitio-platform-plan.md` §34 and are proposals.

**Mailnitio Helpdesk: Native (team works tickets in Mailnitio)**
| Plan | Price (USD, billed in NGN available) | Includes |
|---|---|---|
| **Pilot** | Free, 30 days | 1 mailbox, up to 5,000 emails, shadow mode, insight report |
| **Starter** | ~$12–15 / agent / mo | 1 mailbox, tickets, AI routing + acknowledgement (2k emails/mo) |
| **Growth** | ~$25–35 / agent / mo | 5 mailboxes, teams, SLAs, suggested replies (10k emails/mo; then ~$0.02/email) |
| **Business** | ~$45–60 / agent / mo | Unlimited mailboxes, training on history, webhooks (30k emails/mo; BYOK option) |

**Mailnitio Helpdesk: Middleware mode (team works in their CRM)**
| Plan | Price | Includes |
|---|---|---|
| **Middleware BYOK** | $500 / mo | Up to 30k emails, 5 mailboxes, 1 CRM connector; client's own AI key |
| **Middleware Managed AI** | $1,000 / mo | Same + AI included; overage ~$0.03/email |
| **Enterprise** | Custom (annual) | Unlimited mailboxes, BYOK, customer-hosted option, SSO, SLA, dedicated support |
| **Onboarding / POC** | POC free or credited; onboarding $2k–5k | CRM integration, training, Knowledge Pack, shadow, go-live |

**Mailnitio Send add-on:** Free 3,000/mo · Starter ~$10–15 (20k) · Growth ~$35–50 (100k + campaigns).

Estimated cost to serve: ~$0.005–0.012 AI per email plus lean infrastructure (~$25–150/mo in early phases). Validate the price points with 2–3 friendly prospects.

---

## 5. Portal Screens (Demo MVP)

| Sidebar group | Screen | What the user does there |
|---|---|---|
| Overview | **Dashboard** | KPIs (processed today, new vs appended tickets, reroute %, Needs Review, failures, AI cost), category chart, mailbox health, shadow/live |
| Helpdesk | **Tickets** | Views (My tickets, Unassigned, Team queues, Escalations, All), filters, bulk actions |
| Helpdesk | **Ticket view** | Thread (inbound/outbound/notes), reply via mailbox, notes, assignment, status, linked tickets, customer panel, AI card |
| Helpdesk | **Inbox Log** | Every email with category, confidence, team/queue, action and status chips |
| Helpdesk | **Email Detail** | Decision timeline, AI reason, thread with rolling summary, customer match, linked ticket |
| Helpdesk | **Needs Review** | Approve, change category/queue, link to ticket, split, set customer; every action audited |
| Helpdesk | **Customers** | Customer list + profile with ticket history |
| Insights | **Insight Report** | Upload CSV of past emails → topics, volumes, % misrouted, auto-answer candidates, Export PDF |
| Send | **Campaigns** | Builder (Audience → Content → Settings → Review) + Live Send Monitor |
| Send | **Audiences & Templates** | CSV import with consent, segments, MJML template editor, acknowledgement templates |
| Setup | **Mailboxes & Connections** | Connection status, test, shadow/live/paused per mailbox, ack on/off |
| Setup | **Teams, Rules & Categories** | Teams, categories → team map, thresholds, escalation terms, canned responses (simple forms) |
| Admin | **Users & Audit** | Invite with roles (Owner, Admin, Supervisor, Agent, Reviewer, Viewer), MFA status, audit log |
| Admin | **Usage** | Emails processed, AI cost, sends (billing UI later) |
| Admin (staff) | **Email Simulator** | Inject a sample email into the pipeline (offline demo) |

---

## 6. Demo Data & Industry Packs

A pack = taxonomy, teams/queues, escalation terms, acknowledgement templates, canned responses, a few KB entries, and ~500 seeded synthetic emails with decisions + tickets. Switched per demo workspace.

| Pack | Demo workspace | Categories | Escalation terms |
|---|---|---|---|
| Financial services | "Acme Asset Management" | Complaint, Enquiry, Redemption, KYC Update, Statement Request, Feedback | SEC, CBN, PenCom, lawyer, court, petition, press |
| Utilities | "Acme Electricity Distribution" | Billing Dispute, Outage Report, Prepaid Token Issue, Meter Request, New Connection, Estimated Billing Complaint | NERC, lawyer, court, petition, media, community protest |
| Generic | "Acme Services" | Complaint, Enquiry, Service Request, Feedback, Spam | regulator, lawyer, court, media |

Use invented company names and synthetic emails in demos. Real client samples are used **only** for the insight report, anonymised, under an NDA.

---

## 7. Phase Overview

| Phase | Weeks | Delivers | Demo-ready when |
|---|---|---|---|
| **D1. Foundations + website + design system** | 1 | Monorepo, platform core (auth, workspaces, RLS), design tokens, marketing site, book-a-demo | Site live on staging; sign-up creates a workspace |
| **D2. Helpdesk portal on seeded data** | 2–3 | All portal screens on industry-pack data via real APIs, tickets + replies (simulated), Email Simulator | Full click-through demo without live email |
| **D3. Live email + AI agent** | 4–5 | Graph (and optional Gmail) webhooks, AI pipeline, native Helpdesk destination, acknowledgement, reply via Graph, Needs Review | Live-send moment works in < 15 seconds, repeatedly |
| **D4. Insights + Send lite** | 6 | CSV → insight report; templates, audiences, campaign builder, SES sending + live monitor | Insight report from a sample CSV; 10k send to the SES simulator |
| **POC. Client POC (Middleware mode)** | 2–4 per client | Their mailboxes + CRM sandbox connector, training → Knowledge Pack, shadow, comparison report | Shadow decisions vs their agents' outcomes meet the agreed criteria |
| **LATER** | After POC | Send API, billing, Middleware pilot → production, campaigns at scale, self-serve, integrations | Per platform plan phases 5–11 |

---

## 8. Prompt 0: Global Context (paste at the start of every coding session)

```text
You are a senior full-stack engineer building MAILNITIO, a multi-tenant email operations platform.
Never use the old name "MailCart".

PRODUCTS
- Mailnitio Helpdesk (product 1): AI email customer service. Two modes sharing one AI agent engine:
  • Native mode (BUILD NOW): tickets live on Mailnitio; agents work in the Mailnitio UI; replies are sent
    from the customer's own mailbox via Microsoft Graph.
  • Middleware mode (POC ONLY, NOT NOW): the same AI agent creates/updates cases in the customer's CRM
    (Dynamics 365 first). Design interfaces so this plugs in later without changing the pipeline.
- Mailnitio Send (product 2): templates, audiences, campaigns on Amazon SES. BUILD NOW: "Send lite" only.

STACK (do not change without asking)
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

ARCHITECTURE RULES
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

CONVENTIONS
- Folder layout: see docs/specs/mailnitio-platform-plan.md §5. Ticket keys: MN-<number> per workspace.
- API: /v1/... JSON, zod schemas, cursor pagination, errors { error: { code, message } }.
- Roles: owner, admin, supervisor, agent, reviewer, viewer (+ developer, marketer for Send).
- Status chips: Processed, Rerouted, Needs Review, Escalated, Shadow, Skipped, Failed.
- Small, reviewable commits; update docs/specs when behaviour changes.

REFERENCE DOCS: docs/specs/mailnitio-platform-plan.md, docs/specs/mailnitio-middleware-spec.md (sections cited in each prompt).
When something is ambiguous, choose the simplest option consistent with these rules and note it in
docs/decisions.md.
```

---

## 8D. Prompt 0D: Design System & UX Standards (paste with Prompt 0 in every coding session)

```text
DESIGN SYSTEM & UX STANDARDS: MAILNITIO (apply to every screen, component and page you build)

AUDIENCE & PERSONALITY
- Users: business administrators, CX/support managers, supervisors, agents, IT and marketing staff at
  enterprises and growing companies. They use the app for hours a day on desktop, and check it on mobile.
- Personality: professional, premium, calm, trustworthy, precise. Think "enterprise financial software",
  not "consumer startup". Confidence through restraint: clean layouts, clear hierarchy, quality details.
- Never: playful illustrations in the app, emoji in UI, neon colours, heavy gradients, glassmorphism,
  drop-shadow-heavy cards, cartoon icons, decorative animation, cramped or cluttered screens.

COLOUR TOKENS (CSS variables in packages/ui; Tailwind theme maps to them; never hard-code hex in components)
Light theme:
  --bg            #F7F8FA   app background
  --surface       #FFFFFF   cards, tables, panels
  --surface-2     #F1F3F7   subtle fills, table header, hover rows
  --border        #E3E6EC   default borders/dividers
  --border-strong #CDD2DB   inputs, focused containers
  --text          #0E1525   primary text
  --text-muted    #4A5568   secondary text (AA on white)
  --text-subtle   #6B7385   captions, placeholders (AA for ≥14px)
  --primary       #3B3FC4   brand indigo (buttons, links, active nav)
  --primary-hover #3236A8
  --primary-soft  #EEF0FF   selected rows, active nav background, info chips
  --primary-fg    #FFFFFF
  --success #0F8A5F / soft #E7F6EF   (Processed, Delivered, Resolved)
  --warning #B7791F / soft #FDF5E6   (Needs Review, Pending, SLA at risk)
  --danger  #C53030 / soft #FDECEC   (Escalated, Failed, Bounced, SLA breached)
  --info    #2563EB / soft #EAF1FE   (Rerouted, In progress)
  --neutral #64748B / soft #F1F5F9   (Shadow, Skipped, Draft)
Dark theme (same token names): --bg #0B0F19, --surface #121826, --surface-2 #1A2132, --border #252D3F,
  --border-strong #343D52, --text #E8ECF4, --text-muted #A7B0C2, --text-subtle #7F899D,
  --primary #7B7FF0, --primary-hover #8D91F5, --primary-soft #1E2142, status colours lightened for AA.
Chart palette (ordered, colour-blind-aware): #3B3FC4, #0F8A5F, #B7791F, #2563EB, #7C3AED, #0E7490,
  #C53030, #64748B. Max 6 series per chart; label directly where possible.
Rule: colour is never the only signal; status always has text (+ icon where useful).

TYPOGRAPHY
- Font: Inter (variable) for UI and marketing; tabular numerals (font-variant-numeric: tabular-nums) for
  all numbers, KPIs, tables, timestamps. Mono: JetBrains Mono for IDs (MN-1042), API keys, code, headers.
- Scale (px / line-height / weight):
  Display 48/56/600 (marketing hero only) · H1 30/38/600 · H2 24/32/600 · H3 20/28/600 · H4 16/24/600
  Body 14/20/400 (app default) · Body-lg 16/24/400 (marketing, forms on mobile) · Small 13/18/400
  Caption 12/16/500 · Overline 11/16/600 uppercase tracking 0.06em (section labels, table group headers)
- Letter-spacing: -0.02em on Display/H1/H2. Max line length ~72ch for prose.

SPACING, LAYOUT, SHAPE
- 4px base, 8px grid. Common gaps: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 6px inputs/buttons/chips, 8px cards/panels, 12px modals/drawers, full for avatars/pills.
- Elevation: borders first; shadows only for overlays (dropdowns, popovers, modals, drawers):
  sm 0 1px 2px rgb(16 24 40 / .06); md 0 4px 12px rgb(16 24 40 / .08); lg 0 12px 32px rgb(16 24 40 / .12).
- App shell: left sidebar 248px (collapsible to 64px icon rail), top bar 56px, content max-width 1440px,
  page padding 24px (desktop) / 16px (mobile). Page header: title + description + primary action right.
- Density: comfortable by default (table rows 44px); "compact" toggle (36px) for power users, persisted.

COMPONENTS (shadcn/ui-based, wrapped in packages/ui; one source of truth)
- Buttons: primary (one per view), secondary (outline), ghost, destructive; sizes sm/md/lg; loading state
  with spinner + disabled; icon-only buttons need a tooltip + aria-label.
- Inputs: label above, helper text below, inline validation on blur, error text in --danger with icon;
  required marker; never placeholder-as-label.
- StatusChip: soft background + strong text + optional dot; fixed vocabulary:
  Processed, Rerouted, Needs Review, Escalated, Shadow, Skipped, Failed, Open, Pending, Resolved, Closed.
- KpiCard: label (caption), value (H2 tabular), delta vs previous period (↑/↓ with colour + text), sparkline.
- DataTable: sticky header, sortable columns, column visibility, row hover, row selection with bulk-action
  bar, server pagination + page size, filter chips above, saved views, empty/loading/error states,
  truncation with tooltip, right-aligned numbers, monospace IDs, relative time with absolute on hover.
- Timeline (decision trail): vertical, step icon + label + timestamp + detail; failed steps in danger.
- ConfidenceBar: 0–100% bar with value; colour bands follow thresholds (≥ high = success, between = warning,
  < low = danger); always shows the number.
- AI card: category, confidence bar, one-line reason, reply type, model + cost (small, muted).
  AI-generated content is labelled "AI suggestion" with a subtle sparkle-free icon (e.g. lucide "wand").
- Drawers for detail/edit on desktop (right side, 480–640px); full-screen sheets on mobile.
- Modals only for confirmations and short forms; destructive confirm requires typing or explicit wording.
- Toasts: bottom-right (desktop) / top (mobile), 4–6s, with undo where possible.
- Icons: lucide-react only, 16px in dense UI / 20px in nav, stroke 1.75; consistent metaphors.

STATES (every screen and component must implement)
- Loading: skeletons matching the final layout (no full-page spinners after first load).
- Empty: icon + one-line explanation + primary next action (e.g. "Connect a mailbox").
- Error: plain-language message + retry + support reference ID; never raw stack traces.
- Partial/degraded: banners for shadow mode, paused mailbox, AI fallback, plan limits (warning style).
- Permission: hide actions the role can't perform; if a page is restricted, explain and suggest who to ask.

INTERACTIVITY & MOTION
- Hover, focus, active, disabled styles on every interactive element; cursor pointer only on clickables.
- Visible focus ring: 2px --primary + 2px offset; full keyboard navigation; logical tab order.
- Keyboard shortcuts (shown in tooltips + "?" help dialog): ⌘/Ctrl+K command palette, / search,
  g d dashboard, g t tickets, j/k next/prev row, e assign to me, r reply, n note, ⌘/Ctrl+Enter send.
- Optimistic updates for status/assignee changes with rollback on error.
- Live data: subtle "new" highlight (fade 1.5s) on rows arriving via SSE/polling; never jump scroll.
- Motion: 150–200ms ease-out for hover/expand, 200–250ms for drawers/modals; respect prefers-reduced-motion.
- Inline editing where safe (tags, assignee, status); autosave drafts (reply composer) with "Saved" state.

RESPONSIVE (mobile-first CSS, designed desktop-first for power use)
- Breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
- ≥ lg: full sidebar + multi-column layouts (e.g. ticket thread + side panel).
- md: collapsible icon rail; side panels become drawers.
- < md: sidebar becomes a drawer via hamburger; bottom tab bar for 4 key areas (Dashboard, Tickets,
  Review, More); tables become stacked cards (key fields + status chip + chevron); filters in a bottom
  sheet; sticky primary action at the bottom; touch targets ≥ 44×44px; no horizontal page scroll
  (only inside explicitly scrollable regions).
- Test at 390px, 768px, 1024px, 1440px.

ACCESSIBILITY (WCAG 2.1 AA minimum)
- Contrast ≥ 4.5:1 text, ≥ 3:1 UI components and large text, in both themes.
- Semantic HTML, landmarks, labelled form controls, aria-live for toasts/live feeds, alt text, table
  headers with scope, accessible names for icon buttons, focus trapping in modals/drawers.

CONTENT & TONE
- Clear, concise, professional British/Nigerian business English; sentence case for UI labels and buttons
  ("Assign to me", not "ASSIGN TO ME"); verbs on buttons; no jargon on customer-facing pages.
- Numbers: thousands separators, currency with code/symbol (₦, $), dates "22 Oct 2026, 14:05" in the
  workspace timezone; relative times in lists ("3 min ago") with absolute on hover.
- Error and empty-state copy explains what happened and what to do next.

MARKETING SITE SPECIFICS
- Premium corporate look: generous whitespace, strong typographic hierarchy (Display/H1), restrained
  colour (white/very light grey sections alternating, indigo accents), real product screenshots/UI
  mockups in subtle device or browser frames, thin dividers, customer-logo strip in greyscale.
- Max content width 1200px; 12-column grid; sections 96px (desktop) / 64px (mobile) vertical padding.
- One primary CTA per section ("Book a demo"); secondary as text/outline button.
- Subtle, purposeful motion only (fade/slide 8px on scroll, ≤ 300ms); no parallax, no autoplaying video
  with sound. Lighthouse ≥ 90 (performance, accessibility, best practices, SEO).

THEMING
- Light theme default; dark theme available via user preference (system/light/dark), persisted.
- Workspace branding (later): logo in the sidebar + acknowledgement templates only; product UI colours
  stay Mailnitio.

DESIGN QA CHECKLIST (must pass before a screen is "done")
[ ] Uses only tokens and packages/ui components (no ad-hoc colours, sizes or one-off components)
[ ] Loading, empty, error, permission states implemented
[ ] Works at 390 / 768 / 1024 / 1440 px with no horizontal page scroll; touch targets ≥ 44px on mobile
[ ] Keyboard-only usable; visible focus; screen-reader labels on icon buttons
[ ] Contrast AA in light and dark themes
[ ] Numbers tabular and right-aligned; IDs monospace; dates in workspace timezone
[ ] Copy in sentence case, clear verbs, no lorem ipsum
[ ] Matches the approved Stitch design (spacing, hierarchy, states)
```

---

## 8S. Stitch Design Preamble (paste before every Stitch prompt)

```text
Design for MAILNITIO, a B2B email operations platform (AI helpdesk + email sending) for enterprises and
growing companies in Africa. Users are business administrators, CX managers, supervisors and agents who
work in the product all day.

Aesthetic: professional, premium, corporate, calm and precise, like high-end enterprise financial
software. Restraint over decoration: clean layouts, strong typographic hierarchy, generous whitespace on
marketing pages, efficient density in the app. No playful illustrations, emoji, neon, heavy gradients,
glassmorphism or heavy shadows.

Visual system:
- Colours: brand indigo #3B3FC4 (primary actions, active nav), neutrals: background #F7F8FA,
  surfaces #FFFFFF, borders #E3E6EC, text #0E1525, muted text #4A5568. Status: success #0F8A5F,
  warning/review #B7791F, danger/escalation #C53030, info/rerouted #2563EB, neutral/shadow #64748B, each
  with a soft tinted background for chips. Dark mode: background #0B0F19, surfaces #121826,
  primary #7B7FF0.
- Typography: Inter; tabular numbers for data; JetBrains Mono for IDs like MN-1042.
  Scale: Display 48, H1 30, H2 24, H3 20, body 14 (app) / 16 (marketing).
- 8px grid; radius 6px (controls) / 8px (cards) / 12px (modals); borders over shadows; shadows only on
  overlays.
- Icons: Lucide, 1.75 stroke, 16–20px.
- App shell: 248px left sidebar (collapsible icon rail), 56px top bar with workspace switcher, search,
  alerts, profile; page header with title, description and one primary action.
- Tables: sticky headers, status chips with text, right-aligned tabular numbers, filter chips, bulk-action
  bar, comfortable 44px rows (compact option).
- Every screen shows realistic data (invented companies like "Acme Asset Management", Nigerian names and
  context, ₦ and $ amounts) and includes its empty, loading (skeleton) and error states.

Responsive: provide desktop 1440 and mobile 390 for every screen. On mobile the sidebar becomes a drawer
plus a bottom tab bar (Dashboard, Tickets, Review, More), tables become stacked cards, filters open in a
bottom sheet, and the primary action is sticky at the bottom. Touch targets ≥ 44px.

Accessibility: WCAG AA contrast in light and dark, visible focus states, status never conveyed by colour
alone.

Consistency: reuse the same components, spacing, colours and patterns across all screens; this design must
look like one coherent product family with the marketing site.
```

---

# PART A: BUILD NOW (Demo MVP, ~6 weeks)

## D1. Foundations + Website + Design System (Week 1)

### Stitch prompt (design)
```text
[Paste the Stitch Design Preamble first]

Design system and marketing website for Mailnitio. First produce the design system page: colour tokens
(light + dark), type scale, spacing, radius, elevation, and components (buttons, inputs, status chips,
KPI card, data table, timeline, confidence bar, AI card, drawer, modal, toast, empty/loading/error states,
mobile bottom tab bar). Then the marketing pages below, using only that system.

Pages:
1) Home: hero "Every support email in the right place, in seconds" with sub-line "Mailnitio's AI reads,
   routes and tickets your customer emails. In our helpdesk, or straight into your CRM." CTA "Book a demo"
   + secondary "See it live". How-it-works flow: Your mailbox → Mailnitio AI → Helpdesk or your CRM.
   Stats strip (e.g. "94% routed correctly", "0 duplicate cases", "<10s to ticket"). Two product cards:
   Helpdesk (AI email customer service) and Send (templates and bulk email). Works-with logos: Outlook,
   Gmail, Dynamics 365, Salesforce. Security badges (NDPA-aligned, PII masking, bring your own AI key).
2) Product: Helpdesk: routing by content, smart ticket creation, threading, customer matching,
   acknowledgements, team inbox + SLAs, Needs Review, shadow mode, training on your history, and a
   "Middleware mode" section for teams that work in Dynamics 365 / Salesforce.
3) Product: Send: templates, audiences, bulk sends with a live monitor, deliverability (SPF/DKIM/DMARC),
   "API coming soon".
4) Industries: Financial services, Utilities, Telecoms, Insurance, Education, each with sample categories,
   escalation terms and outcomes.
5) Pricing: tabs "Helpdesk (native)", "Helpdesk (middleware)", "Send". Plans table, usage calculator,
   POC offer banner, FAQ.
6) Security & Compliance: NDPA, data minimisation, PII masking, bring your own AI key, customer-hosted
   option, audit log, sub-processors.
7) Book a demo: form (name, work email, company, role, country, monthly email volume, email platform,
   CRM, message) + calendar slot.
8) Sign in / Sign up with MFA step.
Desktop 1440 and mobile 390.
```

### Build prompt (coding agent)
```text
[Paste Prompt 0 + Prompt 0D first]

TASK D1: Foundations + website + design system.

1. Create the Mailnitio monorepo (pnpm + Turborepo) per docs/specs/mailnitio-platform-plan.md §5:
   apps/web, apps/api, apps/worker; packages/core, db, auth, ui, config, crypto, observability, shared.
   CI (GitHub Actions): typecheck, lint, test, build on PR. Render Blueprint (infra/render.yaml) for
   web, api, worker (Frankfurt, starter plans). Neon dev + staging branches.

2. packages/db: Drizzle schema + migrations for the core tables (platform plan §7): users/accounts/sessions
   (Better Auth), workspaces, members, invitations, api_keys, audit_log, usage_events, feature_flags,
   leads, waitlist. RLS policies (ENABLE + FORCE) on all workspace tables; non-owner app role;
   withTenant(workspaceId, fn). Write an RLS test suite (workspace A cannot read/write B).

3. packages/auth + apps/api: Better Auth with email/password + email verification, TOTP 2FA (enforced for
   owner/admin), organizations as workspaces, roles owner/admin/supervisor/agent/reviewer/viewer.
   Sign-up creates the first workspace (user = owner). Audit auth + member events.

4. packages/crypto: envelope encryption (AES-256-GCM, per-workspace DEK wrapped by MAILNITIO_KEK) + tests.

5. packages/ui: implement Prompt 0D exactly: colour tokens (light + dark) as CSS variables + Tailwind theme,
   type scale (Inter + tabular nums, JetBrains Mono), spacing, radius, elevation, motion tokens,
   theme switcher (system/light/dark), plus a /design-system internal page showing every token and
   component with all states. Components: Button, Card, Badge,
   StatusChip (Processed, Rerouted, Needs Review, Escalated, Shadow, Skipped, Failed), KpiCard,
   DataTable (TanStack Table, server pagination), Stepper, ConfidenceBar, Timeline, EmptyState,
   SidebarLayout, PageHeader.

6. apps/web marketing routes (route group (marketing)): /, /product/helpdesk, /product/send,
   /industries/[slug], /pricing, /security, /demo, /login, /signup, /legal/{terms,privacy,aup}.
   Pricing + industries + nav content come from typed config files in packages/config (pricing per
   §4 of this brief). SEO metadata, sitemap, robots, OG image.
   /demo form → POST /v1/leads (zod, Cloudflare Turnstile token check) → leads table → notify the team
   by email + optional Slack webhook → confirmation email to the requester.

7. apps/web onboarding after sign-up: workspace details → "What brings you here?" (Helpdesk / Send / Both)
   → lands in the app shell (sidebar per §5 of this brief, empty states).

8. Observability: pino logs, Sentry in web/api/worker, /health endpoints.

Deploy to Render staging. No lorem ipsum.
```

### Acceptance checklist
- [ ] Website pages live on the staging domain, mobile-responsive, Lighthouse ≥ 90 on Home/Pricing
- [ ] Book-a-demo stores a lead, notifies the team, emails the requester
- [ ] Sign-up → verify → workspace created → app shell; TOTP works; owner/admin MFA enforced
- [ ] RLS test suite green; CI green; Sentry receiving errors
- [ ] Pricing editable only via the config file
- [ ] /design-system page shows all tokens + components in light/dark; Design QA checklist (Prompt 0D) passes on every page

**Out of scope:** live email, AI, Send, billing.

---

## D2. Helpdesk Portal on Seeded Data (Weeks 2–3)

### Stitch prompt (design)
```text
[Paste the Stitch Design Preamble first]

Design the Mailnitio portal using the same design system. Left sidebar groups:
Overview (Dashboard) · Helpdesk (Tickets, Inbox Log, Needs Review, Customers) · Insights (Insight Report)
· Send (Campaigns, Audiences & Templates) · Setup (Mailboxes & Connections, Teams, Rules & Categories)
· Admin (Users & Audit, Usage).
Top bar: workspace switcher, global search (sender / subject / ticket number), alerts bell, profile.

Screens:
1) Dashboard: KPI cards (processed today, new vs appended tickets, reroute %, Needs Review, failures,
   AI cost), category bar chart, tickets by team, mailbox health list with shadow/live badges.
2) Tickets: views tabs (My tickets, Unassigned, Team queues, Escalations, All), dense table (key MN-1042,
   subject, customer, team, assignee, priority, status, SLA timer, updated), filters, bulk actions.
3) Ticket view: three columns: left thread (inbound, outbound, internal notes in yellow), composer with
   Reply / Note tabs and canned responses; right panel: status, priority, team, assignee, tags, linked
   tickets, customer card, AI card (category, confidence bar, reason, reply type).
4) Inbox Log: dense table with status chips (Processed, Rerouted, Needs Review, Escalated, Shadow, Skipped,
   Failed), category, confidence, team, action (Created ticket / Appended / Linked / Skipped).
5) Email Detail: vertical decision timeline (received → filtered → thread matched → customer found →
   classified → routed → ticket → acknowledged) with timestamps; AI card; thread with rolling summary;
   linked ticket.
6) Needs Review: split view (list left, detail right) with actions Approve / Change category /
   Change team / Link to ticket / Split / Set customer.
7) Customers: list + profile with ticket history.
8) Setup screens: Mailboxes & Connections (status, test, mode shadow/live/paused, ack toggle);
   Teams, Rules & Categories (simple forms).
9) Users & Audit; Usage.
Sample workspace: Acme Asset Management; ticket keys MN-1042; teams Complaints, Enquiries, Redemptions,
KYC, Statements, Escalations.
```

### Build prompt (coding agent)
```text
[Paste Prompt 0 + Prompt 0D first]

TASK D2: Helpdesk portal on seeded data. Build every demo screen against real APIs and DB data.

1. Schema (Drizzle + RLS), from docs/specs/mailnitio-platform-plan.md §13.4 and docs/specs/mailnitio-middleware-spec.md §6:
   mailboxes, connections, config_versions (tenant config JSON validated by zod),
   email_log (with step flags + decision fields), email_threads, message_index, agent_runs,
   reviews, overrides, teams, team_members, tickets, ticket_messages, ticket_events, customers,
   customer_emails, canned_responses, saved_views, notifications, sla_policies, business_hours.
   Ticket keys MN-<n> unique per workspace (sequence per workspace).

2. Tenant config schema (packages/config): categories (key, description, include/exclude signals, team,
   default priority), thresholds (high/low/spam/context), escalation terms + team, threading (ticket regex
   for MN-keys, reopen days, closure phrases), ack templates per category, mailbox default category.

3. Industry packs (packages/config/packs): financial-services, utilities, generic. Each: config, teams,
   ack templates, canned responses, 5–10 KB entries, and ~500 synthetic emails with decisions, threads,
   tickets, customers, some replies/notes, some Needs Review/escalations/failures, spread over 30 days.
   CLI: `pnpm mailnitio seed --pack financial-services --workspace "Acme Asset Management"` (idempotent;
   --reset option).

4. API endpoints (/v1, role-checked, RLS):
   dashboard; emails (list/filter/search, detail, timeline); tickets (views, list, detail, update status/
   priority/team/assignee/tags, merge/split/link, bulk); ticket messages (reply → for D2 store as outbound
   with sent_status='simulated'; note); reviews (list, approve, override → writes overrides + audit +
   applies to ticket); customers (list, detail); mailboxes (list, update mode/ack); teams, categories,
   canned responses (CRUD); users/invitations; audit; usage.

5. Portal UI (apps/web (app) group): all screens in §5 of this brief using packages/ui components.
   Real endpoints only. Polling (5s) on Dashboard, Inbox Log, Needs Review, Tickets.

6. Email Simulator (staff/admin only): form + "pick a sample" (from the pack) that injects an email into
   the SAME pipeline entry point D3 will use (enqueue process-email with source='simulator'). For D2,
   implement a stub processor that applies pre-computed decisions from the sample so the UI updates
   end to end; D3 replaces it with the real AI pipeline.

7. Notifications (in-app): assignment, customer reply, mention.

Tests: RLS for all new tables; override flow writes audit; ticket key sequence per workspace.
```

### Acceptance checklist
- [ ] Seed command builds a full demo workspace per pack in < 2 minutes
- [ ] Every screen in §5 works on seeded data via real APIs (no mock JSON)
- [ ] Override in Needs Review updates the ticket + creates audit + override rows
- [ ] Email Simulator injects an email and it appears in Inbox Log + Tickets
- [ ] Full click-through of demo story steps 3–8 without live email
- [ ] Design QA checklist passes on every portal screen (desktop 1440, tablet 768, mobile 390, light + dark)

**Out of scope:** Graph/Gmail, real AI, SES, insight pipeline (Insight Report can show a seeded sample report).

---

## D3. Live Email + AI Agent (Weeks 4–5)

### Build prompt (coding agent)
```text
[Paste Prompt 0 + Prompt 0D first]

TASK D3: Live email + AI agent driving the native Helpdesk. Follow docs/specs/mailnitio-middleware-spec.md §7–§12 and
§13.1, simplified for the demo. Replace the D2 stub processor.

1. Microsoft Graph connector (packages/connectors/email-graph), demo M365 tenant:
   - MSAL client credentials (cert or secret from encrypted connection secrets); testConnection().
   - Subscriptions per mailbox on users/{mailbox}/mailFolders('inbox')/messages (changeType=created),
     clientState per subscription (hashed), lifecycleNotificationUrl; renew when < 48h left (job every 6h);
     handle reauthorizationRequired / subscriptionRemoved / missed.
   - POST /webhooks/graph: echo validationToken (text/plain); verify clientState; INSERT
     inbound_notification + enqueue pg-boss 'process-email' in ONE transaction; return 202 in < 3s.
   - Delta reconciliation per mailbox every 15 min (enqueue messages missing from email_log).
   - fetchMessage with $select incl. uniqueBody, internetMessageHeaders, conversationId,
     internetMessageId; sendReply via createReply → patch → send, adding headers
     Auto-Submitted: auto-replied and X-Mailnitio-Ref.
   - Optional (if time): Gmail connector for a demo Google Workspace mailbox using an INTERNAL OAuth app
     (users.watch + Pub/Sub push + history API), behind the same EmailConnector interface.

2. Worker 'process-email' (packages/middleware):
   withTenant → fetch → write-ahead upsert email_log on (workspace_id, source_key) → advisory lock per
   conversation → pre-filter (Auto-Submitted, X-Autoreply, Precedence, OOO/bounce subjects, mailer-daemon,
   own mailboxes, X-Mailnitio-Ref) → thread resolver (MN-key regex → In-Reply-To/References via
   message_index → conversationId → heuristic) → Context Agent (only if thread/candidates) → customer
   resolver (customers by email; create if new) → Classifier (new tickets only) → escalation rules →
   router (decision table: hard rules → escalation → spam → confidence bands → fallback) → shadow gate →
   HelpdeskDestination (create ticket / append message / reopen / new linked ticket for new_issue|mixed /
   no-op for closure) → acknowledgement (new tickets only; template per category; loop limits + breaker) →
   finalize (thread summary, message_index, usage_events, status=processed). Step flags make retries safe.

3. LLM gateway (packages/llm): Anthropic + OpenAI providers, per-agent model config, zod-validated JSON,
   one repair retry, timeouts, metering into agent_runs (tokens, cost, latency) + usage_events, per-workspace
   monthly budget. PII masking (11-digit IDs, 10-digit accounts, Luhn cards, phones, other emails, custom
   regexes) before every call. Email content is wrapped as untrusted data in the prompt.

4. Agents (packages/agents): Classifier and Context Agent with prompts BUILT FROM TENANT CONFIG
   (categories, descriptions, signals, examples, escalation terms, closure phrases). Output schemas per
   middleware spec §8.3 and §10.4. Context Agent returns decision + reply_type + updated rolling summary
   in one call.

5. Native Helpdesk wiring: agent replies from the Ticket view now SEND via Graph from the receiving mailbox
   (sent_status queued → sent/failed, retry), with the ticket key in the subject; outbound messages are
   indexed in message_index so customer replies thread back.

6. KB (demo-grade): KB entries from the pack; KB Answer + Guardrail agents produce a suggested reply on
   enquiry tickets (mode 'suggest'); mode 'send' available per topic behind a feature flag for the demo.

7. Live updates: SSE (or 2s polling) on Inbox Log, Tickets, Dashboard, Email Detail so the live-send
   moment is visible within seconds.

8. Reliability + ops: pg-boss retries/backoff/DLQ; Replay endpoint for failed emails; alerts (failures,
   DLQ, subscription expiry, no notifications in X minutes); hourly canary email to the demo mailboxes.

9. Demo safety: per-sender rate limits, ack/answer caps per sender per day, sanitised public feed (if used),
   demo data auto-cleanup after 7 days.

Tests: idempotency (duplicate notification → one ticket, one ack), thread resolver cases, router table,
loop protection, PII masking, prompt-injection email produces normal classification only.
```

### Acceptance checklist
- [ ] Enquiry to `complaints@` → classified, rerouted to Enquiries, ticket `MN-xxxx`, ack received, all on screen in < 15 s (p95), 20 consecutive runs
- [ ] Reply to the ack → appended to the same ticket, no new ack
- [ ] "Thanks, also my statement is wrong" → appended + new linked ticket
- [ ] Agent reply from the Ticket view arrives in the customer's inbox in the same thread
- [ ] Regulator-threat email → Escalations + Needs Review; override audited
- [ ] Out-of-office skipped; duplicate notification → single ticket + single ack
- [ ] Webhook down 30 min → delta reconciliation catches up
- [ ] LLM provider failure → fallback team + Needs Review; email still processed
- [ ] AI cost per email visible on the Dashboard
- [ ] Live updates highlight new rows without layout jumps; works on mobile (demo from a phone)

**Out of scope:** CRM connectors, training pipeline, Send.

---

## D4. Insights + Send Lite (Week 6)

### Stitch prompt (design)
```text
[Paste the Stitch Design Preamble first]

Design three more Mailnitio screens in the same system.
1) Insight Report: upload CSV/XLSX of past emails with column mapping (subject, body, from, to/mailbox,
   date, final queue optional, reply text optional), progress stages (Clean → Mask → Embed → Cluster →
   Label → Report), then a report: top topics by volume (bar chart), % misrouted by mailbox, reopen rate
   (if data), sample emails per topic, auto-answer candidates; Export PDF button.
2) Campaigns: 4-step builder (Audience, Content (template picker + MJML editor preview), Settings
   (from, reply-to, send-speed slider up to 100/s with ETA, schedule), Review checklist (domain verified,
   unsubscribe link, suppressed removed, audience count)).
3) Live Send Monitor: progress ring, emails per second, ETA, counters (sent, delivered, bounced,
   complained, unsubscribed), Pause/Resume, recent events stream.
```

### Build prompt (coding agent)
```text
[Paste Prompt 0 + Prompt 0D first]

TASK D4: Insights (trainer, insight-report subset) + Send lite.

A. Insights (apps/trainer, Python; docs/specs/mailnitio-middleware-spec.md §14.3–§14.6)
1. Trainer worker consumes train.* jobs from the same Postgres (pg-boss tables via SQL or a small job API).
   Stages: ingest CSV/XLSX (column mapping from the UI) → normalize (HTML→text, strip quoted replies,
   signatures, disclaimers) → mask PII → dedupe → embed (provider embeddings; cache) → UMAP + HDBSCAN →
   c-TF-IDF keywords → LLM-label clusters → reconcile with optional final_queue/mailbox columns
   (% misrouted) → report JSON + PDF (WeasyPrint or headless Chromium).
2. Tables: training_datasets, training_runs (stages + progress), insight_reports. Progress shown live in
   the portal. Cost estimate shown before running; budget cap per workspace.
3. Portal Insight Report screen per the design; Export PDF.

B. Send lite (packages/send; platform plan §15)
1. AWS via Terraform (infra/aws): SES configuration set per workspace (created by the app), SNS topic →
   SQS queue (+DLQ) for SES events, IAM least privilege. Demo sending domain verified for the demo
   workspace (DKIM + custom MAIL FROM + DMARC).
2. Domains: add domain → SES CreateEmailIdentity (Easy DKIM) + MAIL FROM → show DNS records → poll status.
3. Templates: MJML + Handlebars variables, versions, preview with sample data, test send (sandboxed render).
4. Audiences: CSV import with mapping, consent flag required, dedupe, suppression check, import report;
   static lists.
5. Campaigns: builder (audience → template → settings → review), schedule/send now; dispatch through
   pg-boss jobs with a per-workspace token-bucket rate limiter in Postgres (configurable send speed,
   capped by the SES account max send rate); each recipient → SES v2 SendEmail with config set + tags;
   headers List-Unsubscribe + List-Unsubscribe-Post (one-click) + footer unsubscribe link + physical
   address; hosted unsubscribe page.
6. Events: event-ingestor long-polls SQS → updates send_messages/send_events, suppressions (hard bounce,
   complaint, unsubscribe), send_stats_daily; Live Send Monitor via SSE.
7. Demo mode: audiences of SES mailbox simulator addresses (success@, bounce@, complaint@ variants)
   so a 10k demo send exercises delivered/bounce/complaint flows without real recipients.
   (Requires SES production access; the send speed is limited by the account's max send rate.)

Tests: import validation, suppression enforcement, unsubscribe flow, event mapping, rate limiter.
```

### Acceptance checklist
- [ ] Sample CSV (≥ 2,000 rows) → insight report with topics, % misrouted, auto-answer candidates, PDF export
- [ ] Domain verification flow works for the demo domain
- [ ] 10k campaign to SES simulator addresses: monitor shows progress, delivered/bounce/complaint counts, pause/resume
- [ ] Bounce/complaint simulator events → suppression list; unsubscribe link works end to end
- [ ] Insight Report PDF and Send screens follow the design system (Design QA checklist)

**Out of scope:** Send public API + SDKs, billing, dedicated IPs, drag-and-drop editor (MJML editor is enough).

---

# PART B: CLIENT POC (Middleware Mode, after the demo is won)

> Preconditions: signed NDA + POC agreement (scope, 2–4 weeks, success criteria, data handling), a client contact for IT and CRM, and access per `docs/specs/mailnitio-middleware-spec.md` §24.1 (test mailboxes, app registration, CRM sandbox, application user, queue GUIDs, approval for custom fields + alternate key). Decide up front: sandbox data (masked copy / synthetic / seeded by us).

## POC-1. Client Workspace & Mailbox Connection
```text
[Paste Prompt 0 + Prompt 0D first]

TASK POC-1 for tenant <client>: provision workspace "<client>" (status: shadow). Add a Microsoft Graph
connection using the CUSTOMER-OWNED app registration (their tenant ID, client ID, certificate preferred),
stored encrypted. testConnection. Add their TEST mailboxes with default categories; create subscriptions;
mode = shadow. Implement `mailnitio crm check` scaffolding (next task). Load the closest industry pack as the
starting config, then apply the client's teams/categories/escalation terms/templates/business hours.
Confirm reconciliation + canary run against their mailboxes. No CRM writes yet.
```
**Accept:** connection test passes; notifications from their test mailboxes appear in the Inbox Log in shadow mode; no emails sent; canary green.

## POC-2. CRM Connector (Dynamics 365 Sandbox)
```text
[Paste Prompt 0 + Prompt 0D first]

TASK POC-2: Implement CrmDestination for Dynamics 365 (Dataverse Web API) per docs/specs/mailnitio-middleware-spec.md
§13.2, behind the same Destination interface as HelpdeskDestination.
- Auth: same Entra app as an Application User; token per org; OData headers.
- Tenant field mapping config (case entity, custom fields, defaults, priority map, identifier field,
  unidentified contact, queue GUIDs, ticket regex for CAS-numbers).
- Idempotent case creation by alternate key: PATCH incidents(mn_sourcekey='<hash>') with
  If-None-Match: * → 412 means it exists → GET and continue.
- Contact lookup (emailaddress1/2/3, identifier field), append email activity (regarding the case, activity
  parties, mark received), AddToQueue, reopen, related-case link, update fields.
- Customer resolver against the CRM (cache in contact_map; shared-email, unknown-sender, third-party rules;
  middleware spec §9).
- `mailnitio crm check`: verifies fields, alternate key, role privileges, queues; prints a report.
- CRM reconciliation job (daily): email_log vs cases by mn_sourcekey.
- Service-protection limits: honour 429 Retry-After, cap concurrency.
Contract tests with recorded sandbox fixtures. Switch the client's test mailboxes to destination = CRM,
still shadow (decisions logged, no writes) until POC-4.
```
**Accept:** `crm check` all green; in a write-enabled sandbox test, a duplicate create returns 412 and no second case; scenarios 1–14 and 24–26 of middleware spec §20.1 pass against the sandbox.

## POC-3. Training → Knowledge Pack
```text
[Paste Prompt 0 + Prompt 0D first]

TASK POC-3: Full training run for <client> per docs/specs/mailnitio-middleware-spec.md §14 (extend the D4 trainer):
ingest 12–24 months of history (Dataverse cases + related emails, or their masked export) as full
conversations with outcomes → clean/mask/dedupe → embed → cluster → label → reconcile with CRM outcomes →
insight report → taxonomy export (XLSX) for client sign-off → import approved taxonomy → exemplars + thread
patterns → response candidates scored by outcome signals → gold set export/import (300–500 human-labelled)
→ evaluation through the production agent path (/internal/eval) → calibration → Knowledge Pack v1
(manifest, taxonomy, exemplars, rules, thread patterns, calibration, responses, eval) → activate in shadow.
Support BYOK: the client's Azure OpenAI deployment (regional/EU data zone) as the provider.
```
**Accept:** gold-set accuracy ≥ 90%, macro-F1 ≥ 0.85, complaint recall ≥ 97%, thread decision ≥ 95%; Knowledge Pack v1 exported and active in shadow; taxonomy signed off.

## POC-4. Shadow Run & Comparison Report
```text
[Paste Prompt 0 + Prompt 0D first]

TASK POC-4: Run 2 weeks of shadow mode on one client mailbox (sandbox CRM writes enabled only if agreed;
otherwise decisions-only). Build the comparison report: for each email, Mailnitio's decision (category,
queue, new vs existing case, customer match, escalation) vs the client agents' actual outcome in the CRM;
accuracy by category, misroutes avoided, duplicates prevented, reply-threading accuracy, time-to-route,
AI cost per email, Needs Review rate, top errors with reasons, recommendations. Export PDF + XLSX.
Run the full scenario suite (middleware spec §20.1) and the reconciliation test. Produce a go/no-go
summary for a production pilot.
```
**Accept:** agreed success criteria met (routing ≥ 90%, zero duplicates, threading ≥ 95%, KB answers grounded, no lost emails); client receives the report; pilot proposal drafted.

---

# PART C: LATER (Roadmap, after the demo and first POC)

| Order | Phase (platform plan) | Prompt focus |
|---|---|---|
| 1 | **Send MVP (P5)** | Public send API (`/v1/send`, batch), API keys/scopes, idempotency keys, webhooks out, docs site + Node/Python SDKs, free tier, per-workspace reputation auto-pause |
| 2 | **Billing (P6)** | Plans/entitlements from config, Paystack (NGN) + Stripe path, usage roll-ups → invoices, limits, dunning, enterprise manual subscriptions |
| 3 | **Middleware pilot → production (P7)** | Production Graph + Dataverse, BYOK, pen test fixes, go-live per mailbox, CRM reconciliation, on-call, SLA |
| 4 | **Send Campaigns full (P8)** | Contacts with custom fields, segments, drag-and-drop editor, A/B, preference centre, tracking domains, SMTP relay |
| 5 | **Helpdesk self-serve (P9)** | "Connect Microsoft 365" multi-tenant app + publisher verification, config UI, training UI (Knowledge Pack screens), onboarding wizard, SLA/reporting depth |
| 6 | **Integrations (P10)** | Public Helpdesk API, webhooks, MCP server, Zapier/Make, Gmail public app (verification + security assessment), Salesforce/HubSpot connectors, forwarding/MX intake |
| 7 | **Enterprise & scale (P11)** | SSO/SCIM, SOC 2 path, customer-hosted deployment, dedicated IPs, deliverability tooling, WhatsApp/SMS channels |

Each LATER phase gets its own Build prompt generated from the platform plan's requirement table (REQ IDs + acceptance criteria) when the phase starts.

---

## 9. Open Questions & Next Steps

**Open questions**
- [ ] Pricing: native Helpdesk per-agent vs per-email only. The plan uses per-agent for native and per-email for Middleware; confirm with 2–3 friendly prospects
- [ ] LLM provider for the demo (managed key) and the BYOK story (Azure OpenAI regional/EU deployment) for regulated clients
- [ ] Demo hosting: Render/Neon EU is fine for synthetic data; confirm the region before any real client sample
- [ ] SES production access (request now; needed for D4 and Send)
- [ ] Gmail in the demo: internal Workspace app only (no Google verification needed) or skip until later
- [ ] Prospect contacts (e.g. an asset manager, an electricity distributor): their email platform and CRM (utilities may not run Dynamics → native Helpdesk or another connector)
- [ ] Domain + branding for mailnitio (domain availability, social handles)
- [ ] If pitching to any organisation a team member works for: disclose and agree IP/commercial terms in writing first

**Next steps**
1. Review this pack and agree the demo story.
2. Run the D1 and D2 Stitch prompts; review designs as a team.
3. Request SES production access; set up the demo M365 tenant; secure the domain.
4. Build D1–D3 (weeks 1–5) and rehearse the live-send moment.
5. Build D4 (week 6); prepare the NDA, POC agreement and sample-data request.
6. Book the first prospect demos for week 6–7.
