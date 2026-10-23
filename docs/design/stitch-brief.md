# Stitch design brief

The prompt used to generate the Stitch designs, plus notes on the reference mockups. Rules in
[../design-system.md](../design-system.md) take precedence where they differ.

## Prompt

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

## Reference mockups (inspiration, not pixel spec)

- [reference/stitch-operations-dashboard.png](reference/stitch-operations-dashboard.png): executive
  operations dashboard.
- [reference/stitch-landing-page.png](reference/stitch-landing-page.png): marketing landing page.

The mockups were generated under the retired product name and show "MailCart" branding. Never carry that
name into code or copy; it is always "Mailnitio".

### Take from the dashboard
- Sidebar grouping with overline labels: Overview, Support AI, Campaigns, Knowledge, Setup, Admin; count
  badges on Inbox log / Needs review; workspace switcher showing environment and shadow state; footer
  with system status and theme toggle.
- Top bar: global search with ⌘K hint, docs link, alerts, user menu. Breadcrumb + sync indicator + date
  range + export on the page header row.
- Shadow-mode banner (warning/degraded style) with a "Go live" action.
- KPI card grid (label, tabular value, delta, short context line), then charts, then operational panels
  (mailbox ingestion health, campaign queue, live triage list), then the decision trace.

### Correct when implementing
- Ticket IDs are `MN-<number>`, not `CAS-…`.
- Sentence case for labels and chips ("Needs review", "Pending override"); the mockup uses many all-caps
  chips. Overline section labels are the only uppercase text.
- One primary action per view; the mockup has several competing indigo buttons.
- Charts: max 6 series, palette from the design system, direct labels; no decorative area gradients.
- Decision trace uses the Timeline component on surface colours, not a terminal-style block.
- Avoid unverifiable claims and certifications in marketing copy (e.g. "NDPA certified", "SOC 2") unless
  confirmed.
