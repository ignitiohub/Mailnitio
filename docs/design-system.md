# Design system & UX standards: Mailnitio

Apply to every screen, component and page.

## Audience & personality

- Users: business administrators, CX/support managers, supervisors, agents, IT and marketing staff at
  enterprises and growing companies. They use the app for hours a day on desktop, and check it on mobile.
- Personality: professional, premium, calm, trustworthy, precise. Think "enterprise financial software",
  not "consumer startup". Confidence through restraint: clean layouts, clear hierarchy, quality details.
- Never: playful illustrations in the app, emoji in UI, neon colours, heavy gradients, glassmorphism,
  drop-shadow-heavy cards, cartoon icons, decorative animation, cramped or cluttered screens.

## Colour tokens

CSS variables in packages/ui; Tailwind theme maps to them; never hard-code hex in components.

Light theme:

| Token            | Value             | Use                                              |
| ---------------- | ----------------- | ------------------------------------------------ |
| --bg             | #F7F8FA           | app background                                   |
| --surface        | #FFFFFF           | cards, tables, panels                            |
| --surface-2      | #F1F3F7           | subtle fills, table header, hover rows           |
| --border         | #E3E6EC           | default borders/dividers                         |
| --border-strong  | #CDD2DB           | inputs, focused containers                       |
| --text           | #0E1525           | primary text                                     |
| --text-muted     | #4A5568           | secondary text (AA on white)                     |
| --text-subtle    | #6B7385           | captions, placeholders (AA for ≥14px)            |
| --primary        | #3B3FC4           | brand indigo (buttons, links, active nav)        |
| --primary-hover  | #3236A8           |                                                  |
| --primary-soft   | #EEF0FF           | selected rows, active nav background, info chips |
| --primary-fg     | #FFFFFF           |                                                  |
| --success / soft | #0F8A5F / #E7F6EF | Processed, Delivered, Resolved                   |
| --warning / soft | #B7791F / #FDF5E6 | Needs Review, Pending, SLA at risk               |
| --danger / soft  | #C53030 / #FDECEC | Escalated, Failed, Bounced, SLA breached         |
| --info / soft    | #2563EB / #EAF1FE | Rerouted, In progress                            |
| --neutral / soft | #64748B / #F1F5F9 | Shadow, Skipped, Draft                           |

Dark theme (same token names): --bg #0B0F19, --surface #121826, --surface-2 #1A2132, --border #252D3F,
--border-strong #343D52, --text #E8ECF4, --text-muted #A7B0C2, --text-subtle #7F899D,
--primary #7B7FF0, --primary-hover #8D91F5, --primary-soft #1E2142, status colours lightened for AA.

Chart palette (ordered, colour-blind-aware): #3B3FC4, #0F8A5F, #B7791F, #2563EB, #7C3AED, #0E7490,
#C53030, #64748B. Max 6 series per chart; label directly where possible.

Rule: colour is never the only signal; status always has text (+ icon where useful).

## Typography

- Font: Inter (variable) for UI and marketing; tabular numerals (font-variant-numeric: tabular-nums) for
  all numbers, KPIs, tables, timestamps. Mono: JetBrains Mono for IDs (MN-1042), API keys, code, headers.
- Scale (px / line-height / weight):
  Display 48/56/600 (marketing hero only) · H1 30/38/600 · H2 24/32/600 · H3 20/28/600 · H4 16/24/600 ·
  Body 14/20/400 (app default) · Body-lg 16/24/400 (marketing, forms on mobile) · Small 13/18/400 ·
  Caption 12/16/500 · Overline 11/16/600 uppercase tracking 0.06em (section labels, table group headers)
- Letter-spacing: -0.02em on Display/H1/H2. Max line length ~72ch for prose.

## Spacing, layout, shape

- 4px base, 8px grid. Common gaps: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 6px inputs/buttons/chips, 8px cards/panels, 12px modals/drawers, full for avatars/pills.
- Elevation: borders first; shadows only for overlays (dropdowns, popovers, modals, drawers):
  sm 0 1px 2px rgb(16 24 40 / .06); md 0 4px 12px rgb(16 24 40 / .08); lg 0 12px 32px rgb(16 24 40 / .12).
- App shell: left sidebar 248px (collapsible to 64px icon rail), top bar 56px, content max-width 1440px,
  page padding 24px (desktop) / 16px (mobile). Page header: title + description + primary action right.
- Density: comfortable by default (table rows 44px); "compact" toggle (36px) for power users, persisted.

## Components

shadcn/ui-based, wrapped in packages/ui; one source of truth.
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

## States (every screen and component must implement)

- Loading: skeletons matching the final layout (no full-page spinners after first load).
- Empty: icon + one-line explanation + primary next action (e.g. "Connect a mailbox").
- Error: plain-language message + retry + support reference ID; never raw stack traces.
- Partial/degraded: banners for shadow mode, paused mailbox, AI fallback, plan limits (warning style).
- Permission: hide actions the role can't perform; if a page is restricted, explain and suggest who to ask.

## Interactivity & motion

- Hover, focus, active, disabled styles on every interactive element; cursor pointer only on clickables.
- Visible focus ring: 2px --primary + 2px offset; full keyboard navigation; logical tab order.
- Keyboard shortcuts (shown in tooltips + "?" help dialog): ⌘/Ctrl+K command palette, / search,
  g d dashboard, g t tickets, j/k next/prev row, e assign to me, r reply, n note, ⌘/Ctrl+Enter send.
- Optimistic updates for status/assignee changes with rollback on error.
- Live data: subtle "new" highlight (fade 1.5s) on rows arriving via SSE/polling; never jump scroll.
- Motion: 150–200ms ease-out for hover/expand, 200–250ms for drawers/modals; respect prefers-reduced-motion.
- Inline editing where safe (tags, assignee, status); autosave drafts (reply composer) with "Saved" state.

## Responsive

Mobile-first CSS, designed desktop-first for power use.
- Breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
- ≥ lg: full sidebar + multi-column layouts (e.g. ticket thread + side panel).
- md: collapsible icon rail; side panels become drawers.
- < md: sidebar becomes a drawer via hamburger; bottom tab bar for 4 key areas (Dashboard, Tickets,
  Review, More); tables become stacked cards (key fields + status chip + chevron); filters in a bottom
  sheet; sticky primary action at the bottom; touch targets ≥ 44×44px; no horizontal page scroll
  (only inside explicitly scrollable regions).
- Test at 390px, 768px, 1024px, 1440px.

## Accessibility (WCAG 2.1 AA minimum)

- Contrast ≥ 4.5:1 text, ≥ 3:1 UI components and large text, in both themes.
- Semantic HTML, landmarks, labelled form controls, aria-live for toasts/live feeds, alt text, table
  headers with scope, accessible names for icon buttons, focus trapping in modals/drawers.

## Content & tone

- Clear, concise, professional British/Nigerian business English; sentence case for UI labels and buttons
  ("Assign to me", not "ASSIGN TO ME"); verbs on buttons; no jargon on customer-facing pages.
- Numbers: thousands separators, currency with code/symbol (₦, $), dates "22 Oct 2026, 14:05" in the
  workspace timezone; relative times in lists ("3 min ago") with absolute on hover.
- Error and empty-state copy explains what happened and what to do next.

## Marketing site specifics

- Premium corporate look: generous whitespace, strong typographic hierarchy (Display/H1), restrained
  colour (white/very light grey sections alternating, indigo accents), real product screenshots/UI
  mockups in subtle device or browser frames, thin dividers, customer-logo strip in greyscale.
- Max content width 1200px; 12-column grid; sections 96px (desktop) / 64px (mobile) vertical padding.
- One primary CTA per section ("Book a demo"); secondary as text/outline button.
- Subtle, purposeful motion only (fade/slide 8px on scroll, ≤ 300ms); no parallax, no autoplaying video
  with sound. Lighthouse ≥ 90 (performance, accessibility, best practices, SEO).

## Theming

- Light theme default; dark theme available via user preference (system/light/dark), persisted.
- Workspace branding (later): logo in the sidebar + acknowledgement templates only; product UI colours
  stay Mailnitio.

## Design QA checklist (must pass before a screen is "done")

- [ ] Uses only tokens and packages/ui components (no ad-hoc colours, sizes or one-off components)
- [ ] Loading, empty, error, permission states implemented
- [ ] Works at 390 / 768 / 1024 / 1440 px with no horizontal page scroll; touch targets ≥ 44px on mobile
- [ ] Keyboard-only usable; visible focus; screen-reader labels on icon buttons
- [ ] Contrast AA in light and dark themes
- [ ] Numbers tabular and right-aligned; IDs monospace; dates in workspace timezone
- [ ] Copy in sentence case, clear verbs, no lorem ipsum
- [ ] Matches the approved Stitch design (spacing, hierarchy, states)
