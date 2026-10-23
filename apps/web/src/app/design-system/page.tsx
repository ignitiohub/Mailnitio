"use client";

import { PIPELINE_STATUSES, TICKET_STATUSES } from "@mailnitio/shared";
import {
  AiCard,
  Badge,
  Banner,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfidenceBar,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterChip,
  Input,
  KpiCard,
  KpiCardSkeleton,
  Modal,
  PermissionState,
  Select,
  Skeleton,
  StatusChip,
  Stepper,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeSwitcher,
  Timeline,
  Tooltip,
  toast,
  useTheme,
} from "@mailnitio/ui";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Logo } from "@/components/logo";

/*
 * Internal reference for the Mailnitio design system. Example rows here demonstrate components only;
 * product screens always load real data from the API.
 */

const COLOUR_TOKENS = [
  ["bg", "App background"],
  ["surface", "Cards, tables, panels"],
  ["surface-2", "Subtle fills, table header, hover"],
  ["border", "Default borders"],
  ["border-strong", "Inputs, focused containers"],
  ["text", "Primary text"],
  ["text-muted", "Secondary text"],
  ["text-subtle", "Captions, placeholders"],
  ["primary", "Brand, buttons, links"],
  ["primary-hover", "Primary hover"],
  ["primary-soft", "Selected rows, active nav"],
  ["success", "Processed, Resolved"],
  ["success-soft", "Success chip fill"],
  ["warning", "Needs review, Pending"],
  ["warning-soft", "Warning chip fill"],
  ["danger", "Escalated, Failed"],
  ["danger-soft", "Danger chip fill"],
  ["info", "Rerouted, In progress"],
  ["info-soft", "Info chip fill"],
  ["neutral", "Shadow, Skipped"],
  ["neutral-soft", "Neutral chip fill"],
] as const;

const TYPE_SCALE = [
  ["text-display", "Display 48/56/600", "Every support email"],
  ["text-h1", "H1 30/38/600", "Operations dashboard"],
  ["text-h2", "H2 24/32/600", "Needs review"],
  ["text-h3", "H3 20/28/600", "Mailbox health"],
  ["text-h4", "H4 16/24/600", "Decision trail"],
  ["text-body-lg", "Body large 16/24", "Marketing body and mobile forms."],
  ["text-body", "Body 14/20", "The default size for the app."],
  ["text-small", "Small 13/18", "Helper text and secondary details."],
  ["text-caption", "Caption 12/16/500", "Labels and timestamps"],
  ["text-overline uppercase", "Overline 11/16/600", "Section label"],
] as const;

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64];

interface ExampleRow {
  id: string;
  key: string;
  subject: string;
  team: string;
  confidence: number;
  status: (typeof PIPELINE_STATUSES)[number];
  emails: number;
}

const exampleRows: ExampleRow[] = [
  {
    id: "1",
    key: "MN-1042",
    subject: "Transfer of ₦250,000 not received",
    team: "Payments operations",
    confidence: 0.96,
    status: "Processed",
    emails: 3,
  },
  {
    id: "2",
    key: "MN-1041",
    subject: "Request for Q3 statement",
    team: "Customer service",
    confidence: 0.74,
    status: "Needs Review",
    emails: 1,
  },
  {
    id: "3",
    key: "MN-1040",
    subject: "Unauthorised debit on my account",
    team: "Disputes",
    confidence: 0.91,
    status: "Escalated",
    emails: 2,
  },
];

const exampleColumns: ColumnDef<ExampleRow, unknown>[] = [
  {
    id: "key",
    header: "Ticket",
    meta: { mobile: "meta", label: "Ticket" },
    cell: ({ row }) => <span className="font-mono text-small text-text-muted">{row.original.key}</span>,
  },
  {
    id: "subject",
    header: "Subject",
    enableHiding: false,
    meta: { mobile: "title", label: "Subject" },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: "team",
    header: "Team",
    meta: { mobile: "meta", label: "Team" },
    cell: ({ row }) => row.original.team,
  },
  {
    id: "emails",
    header: "Emails",
    meta: { align: "right", mobile: "hidden", label: "Emails" },
    cell: ({ row }) => row.original.emails,
  },
  {
    id: "confidence",
    header: "Confidence",
    meta: { mobile: "hidden", label: "Confidence" },
    cell: ({ row }) => <ConfidenceBar value={row.original.confidence} className="w-32" />,
  },
  {
    id: "status",
    header: "Status",
    meta: { mobile: "status", label: "Status" },
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
];

function Swatches() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {COLOUR_TOKENS.map(([token, use]) => (
        <div key={token} className="flex items-center gap-3">
          <span
            className="size-10 shrink-0 rounded-control border border-border"
            style={{ background: `var(--${token})` }}
          />
          <span className="min-w-0">
            <span className="block truncate font-mono text-caption text-text">--{token}</span>
            <span className="block truncate text-caption font-normal text-text-subtle">{use}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Renders children in both themes side by side, by scoping data-theme on each panel. */
function BothThemes({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {(["light", "dark"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="rounded-card border border-border bg-bg p-4 text-text md:p-6"
        >
          <p className="mb-4 text-overline text-text-subtle uppercase">{theme} theme</p>
          {children}
        </div>
      ))}
    </div>
  );
}

function Block({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 id={`${id}-title`} className="text-h2 text-text">
          {title}
        </h2>
        {description ? <p className="prose-width text-body text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const SECTIONS = [
  ["colour", "Colour"],
  ["type", "Typography"],
  ["space", "Spacing, radius, elevation"],
  ["motion", "Motion"],
  ["buttons", "Buttons"],
  ["inputs", "Inputs"],
  ["status", "Status chips"],
  ["kpi", "KPI cards"],
  ["table", "Data table"],
  ["ai", "Timeline, confidence, AI card"],
  ["overlays", "Drawer, modal, toast"],
  ["states", "States"],
  ["navigation", "Navigation"],
] as const;

export default function DesignSystemPage() {
  const { density, setDensity } = useTheme();
  const [tableState, setTableState] = useState<"data" | "loading" | "empty" | "error">("data");
  const [loadingButton, setLoadingButton] = useState(false);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 md:px-6">
          <Link href="/" aria-label="Mailnitio home">
            <Logo />
          </Link>
          <Badge tone="outline">Design system</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            >
              Density: {density === "compact" ? "Compact" : "Comfortable"}
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Design system sections" className="hidden lg:block">
          <ul className="sticky top-20 flex flex-col gap-1">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-control px-3 py-1.5 text-body text-text-muted hover:bg-surface-2 hover:text-text"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-col gap-16">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 text-text">Mailnitio design system</h1>
            <p className="prose-width text-body-lg text-text-muted">
              Tokens and components from <span className="font-mono text-body">packages/ui</span>. Every
              product screen is built only from these. Switch theme and density in the header; sections below
              also render both themes side by side.
            </p>
          </div>

          <Block
            id="colour"
            title="Colour"
            description="CSS variables in packages/ui/src/styles.css. Components never use raw hex values. Colour is never the only signal."
          >
            <BothThemes>
              <Swatches />
            </BothThemes>
            <Card className="p-4">
              <p className="mb-3 text-caption text-text-muted">
                Chart palette (ordered; max 6 series per chart)
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <span
                    key={n}
                    className="flex items-center gap-2 rounded-control border border-border px-2 py-1 font-mono text-caption"
                  >
                    <span className="size-4 rounded-[4px]" style={{ background: `var(--chart-${n})` }} />
                    chart-{n}
                  </span>
                ))}
              </div>
            </Card>
          </Block>

          <Block
            id="type"
            title="Typography"
            description="Inter for UI with tabular numerals for data; JetBrains Mono for IDs, keys and code."
          >
            <Card className="divide-y divide-border">
              {TYPE_SCALE.map(([cls, label, sample]) => (
                <div key={cls} className="flex flex-col gap-1 p-4 md:flex-row md:items-baseline md:gap-6">
                  <span className="w-44 shrink-0 font-mono text-caption text-text-subtle">{label}</span>
                  <span className={`${cls} text-text`}>{sample}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1 p-4 md:flex-row md:items-baseline md:gap-6">
                <span className="w-44 shrink-0 font-mono text-caption text-text-subtle">Mono / tabular</span>
                <span className="text-body text-text">
                  <span className="font-mono">MN-1042</span> · <span className="tabular">₦14,280.00</span> ·{" "}
                  <span className="tabular">22 Oct 2026, 14:05</span>
                </span>
              </div>
            </Card>
          </Block>

          <Block
            id="space"
            title="Spacing, radius, elevation"
            description="4px base on an 8px grid. Borders first; shadows only on overlays."
          >
            <Card className="flex flex-col gap-6 p-6">
              <div className="flex flex-wrap items-end gap-4">
                {SPACING.map((px) => (
                  <div key={px} className="flex flex-col items-center gap-2">
                    <span className="bg-primary" style={{ width: px, height: px }} />
                    <span className="font-mono text-caption text-text-subtle tabular">{px}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  ["rounded-control", "6px controls"],
                  ["rounded-card", "8px cards"],
                  ["rounded-modal", "12px modals"],
                  ["rounded-full", "Full pills"],
                ].map(([cls, label]) => (
                  <div
                    key={cls}
                    className={`flex h-16 w-32 items-center justify-center border border-border-strong bg-surface-2 text-caption ${cls}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-6">
                {["shadow-sm", "shadow-md", "shadow-lg"].map((cls) => (
                  <div
                    key={cls}
                    className={`flex h-16 w-32 items-center justify-center rounded-card border border-border bg-surface font-mono text-caption ${cls}`}
                  >
                    {cls}
                  </div>
                ))}
              </div>
            </Card>
          </Block>

          <Block
            id="motion"
            title="Motion"
            description="150–200ms ease-out for hover and expand, 200–250ms for drawers and modals. Reduced motion is respected."
          >
            <Card className="grid gap-4 p-6 sm:grid-cols-3">
              {[
                ["--duration-fast", "150ms", "Hover, focus"],
                ["--duration-base", "200ms", "Expand, fade"],
                ["--duration-slow", "250ms", "Drawers, modals"],
              ].map(([token, value, use]) => (
                <div key={token} className="flex flex-col gap-1">
                  <span className="font-mono text-caption text-text">{token}</span>
                  <span className="text-h3 text-text tabular">{value}</span>
                  <span className="text-small text-text-muted">{use}</span>
                </div>
              ))}
            </Card>
          </Block>

          <Block
            id="buttons"
            title="Buttons"
            description="One primary action per view. Icon-only buttons have a tooltip and an accessible name."
          >
            <BothThemes>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Tooltip content="Add mailbox">
                    <Button size="icon" variant="secondary" aria-label="Add mailbox">
                      <Plus aria-hidden />
                    </Button>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    loading={loadingButton}
                    onClick={() => {
                      setLoadingButton(true);
                      setTimeout(() => setLoadingButton(false), 1500);
                    }}
                  >
                    {loadingButton ? "Saving" : "Click to load"}
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="secondary" disabled>
                    Disabled
                  </Button>
                </div>
              </div>
            </BothThemes>
          </Block>

          <Block
            id="inputs"
            title="Inputs"
            description="Label above, helper below, inline validation on blur, required marker. Placeholders are never labels."
          >
            <BothThemes>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Mailbox address" required helper="The address customers already email.">
                  <Input defaultValue="support@acmeasset.ng" />
                </Field>
                <Field label="Work email" required error="Use your work email address">
                  <Input defaultValue="adaeze@gmail.com" />
                </Field>
                <Field label="Default team">
                  <Select defaultValue="Customer service">
                    <option>Customer service</option>
                    <option>Payments operations</option>
                  </Select>
                </Field>
                <Field label="Disabled">
                  <Input disabled defaultValue="Read only value" />
                </Field>
                <Field label="Acknowledgement message" optional className="md:col-span-2">
                  <Textarea defaultValue="Thank you for contacting Acme Asset Management. Your reference is {{ticket_key}}." />
                </Field>
                <Checkbox
                  label="Send acknowledgements"
                  description="Reply to new emails with the ticket number."
                  defaultChecked
                />
              </div>
            </BothThemes>
          </Block>

          <Block
            id="status"
            title="Status chips"
            description="Fixed vocabulary. Soft background, strong text and an icon, so status never relies on colour alone."
          >
            <BothThemes>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {PIPELINE_STATUSES.map((s) => (
                    <StatusChip key={s} status={s} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {TICKET_STATUSES.map((s) => (
                    <StatusChip key={s} status={s} variant="dot" />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="primary">Primary</Badge>
                  <Badge tone="outline">Outline</Badge>
                  <FilterChip
                    label="Team"
                    value="Payments operations"
                    onRemove={() => toast("Filter removed")}
                  />
                </div>
              </div>
            </BothThemes>
          </Block>

          <Block
            id="kpi"
            title="KPI cards"
            description="Caption label, tabular value, delta with direction in text and colour, optional sparkline."
          >
            <BothThemes>
              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard
                  label="Emails processed today"
                  value="3,842"
                  delta={{ value: 0.184 }}
                  sparkline={[12, 18, 15, 22, 19, 28, 31]}
                  context="3,110 handled automatically"
                />
                <KpiCard
                  label="Spam complaint rate"
                  value="0.024%"
                  delta={{ value: 0.12, goodDirection: "down" }}
                  context="Ceiling 0.100%"
                />
                <KpiCard label="Needs review" value="14" delta={{ value: 0 }} context="Average wait 4 min" />
                <KpiCardSkeleton />
              </div>
            </BothThemes>
          </Block>

          <Block
            id="table"
            title="Data table"
            description="Sticky header, sortable columns, column visibility, selection with a bulk-action bar, server pagination. Stacked cards below 768px."
          >
            <Tabs value={tableState} onValueChange={(v) => setTableState(v as typeof tableState)}>
              <TabsList aria-label="Table state">
                <TabsTrigger value="data">With data</TabsTrigger>
                <TabsTrigger value="loading">Loading</TabsTrigger>
                <TabsTrigger value="empty">Empty</TabsTrigger>
                <TabsTrigger value="error">Error</TabsTrigger>
              </TabsList>
              <TabsContent value={tableState}>
                <DataTable
                  caption="Example tickets"
                  columns={exampleColumns}
                  data={tableState === "data" ? exampleRows : []}
                  getRowId={(r) => r.id}
                  loading={tableState === "loading"}
                  error={
                    tableState === "error"
                      ? { referenceId: "req_7f3a9c21e4b80d15", onRetry: () => setTableState("data") }
                      : null
                  }
                  empty={{
                    icon: Inbox,
                    title: "No tickets yet",
                    description:
                      "Connect a support mailbox and Mailnitio will create tickets from new emails.",
                    action: <Button>Connect a mailbox</Button>,
                  }}
                  onRowClick={(row) => toast(`Opened ${row.key}`)}
                  filters={
                    <FilterChip label="Status" value="Open" onRemove={() => toast("Filter removed")} />
                  }
                  bulkActions={(ids, clear) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        toast.success(`Assigned ${ids.length} tickets to you`, {
                          action: { label: "Undo", onClick: () => toast("Assignment undone") },
                        });
                        clear();
                      }}
                    >
                      Assign to me
                    </Button>
                  )}
                  pagination={{
                    pageSize: 25,
                    hasNext: true,
                    hasPrevious: false,
                    onNext: () => toast("Next page"),
                    onPrevious: () => undefined,
                    onPageSizeChange: () => undefined,
                    summary: "Showing 1–3",
                  }}
                />
              </TabsContent>
            </Tabs>
          </Block>

          <Block
            id="ai"
            title="Timeline, confidence, AI card"
            description="Decision trail with failed steps in danger; confidence always shows the number."
          >
            <BothThemes>
              <div className="grid gap-4 md:grid-cols-2">
                <AiCard
                  category="Failed transfer"
                  confidence={0.96}
                  reason="Customer reports a ₦250,000 transfer that has not arrived; matches open ticket MN-1027."
                  replyType="Acknowledge and link"
                  model="claude-sonnet"
                  cost="₦3.71"
                />
                <div className="flex flex-col gap-4">
                  <Card className="p-4">
                    <Timeline
                      steps={[
                        {
                          id: "1",
                          label: "Email received",
                          timestamp: "14:05:01",
                          detail: "support@acmeasset.ng",
                        },
                        { id: "2", label: "Personal data masked", timestamp: "14:05:01" },
                        {
                          id: "3",
                          label: "Classification failed",
                          timestamp: "14:05:03",
                          state: "failed",
                          detail: "Invalid model response after one repair attempt",
                        },
                        {
                          id: "4",
                          label: "Sent to Needs review",
                          timestamp: "14:05:03",
                          detail: "Fallback: Customer service",
                        },
                        { id: "5", label: "Awaiting reviewer", state: "pending" },
                      ]}
                    />
                  </Card>
                  <Card className="flex flex-col gap-3 p-4">
                    <ConfidenceBar value={0.92} />
                    <ConfidenceBar value={0.72} />
                    <ConfidenceBar value={0.41} />
                  </Card>
                </div>
              </div>
            </BothThemes>
          </Block>

          <Block
            id="overlays"
            title="Drawer, modal, toast"
            description="Drawers for detail and edit (full screen on mobile); modals for confirmations and short forms; toasts bottom-right, top on mobile."
          >
            <Card className="flex flex-wrap gap-2 p-6">
              <Drawer
                title="MN-1042 · Transfer of ₦250,000 not received"
                description="Payments operations · Opened 3 min ago"
                trigger={<Button variant="secondary">Open drawer</Button>}
                footer={<Button>Assign to me</Button>}
              >
                <Timeline
                  steps={[
                    { id: "1", label: "Email received", timestamp: "14:05:01" },
                    { id: "2", label: "Routed to Payments operations", timestamp: "14:05:04" },
                  ]}
                />
              </Drawer>
              <Modal
                title="Remove member?"
                description="Ibrahim Musa will lose access to Acme Asset Management immediately."
                trigger={
                  <Button variant="destructive">
                    <Trash2 aria-hidden />
                    Open confirmation
                  </Button>
                }
                footer={<Button variant="destructive">Remove member</Button>}
              />
              <Modal
                title="Invite a member"
                trigger={
                  <Button variant="secondary">
                    <UserPlus aria-hidden />
                    Open form modal
                  </Button>
                }
                footer={<Button>Send invitation</Button>}
              >
                <Field label="Email" required>
                  <Input type="email" />
                </Field>
              </Modal>
              <Button variant="secondary" onClick={() => toast.success("Workspace details saved")}>
                Success toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.error("Could not save changes", { description: "Reference req_7f3a9c21e4b80d15" })
                }
              >
                Error toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast("Ticket closed", {
                    action: { label: "Undo", onClick: () => toast("Ticket reopened") },
                  })
                }
              >
                Toast with undo
              </Button>
            </Card>
          </Block>

          <Block
            id="states"
            title="States"
            description="Every screen implements loading, empty, error, degraded and permission states."
          >
            <BothThemes>
              <div className="flex flex-col gap-4">
                <Banner
                  tone="warning"
                  title="Shadow mode is on for support@acmeasset.ng"
                  action={<Button size="sm">Go live</Button>}
                >
                  Mailnitio records what it would do, without creating tickets or sending replies.
                </Banner>
                <Banner tone="info" title="AI fallback active">
                  Low-confidence emails are going to Needs review while the AI provider recovers.
                </Banner>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <EmptyState
                      icon={Mail}
                      title="No mailboxes connected"
                      description="Connect the address your customers already email."
                      action={<Button>Connect a mailbox</Button>}
                    />
                  </Card>
                  <Card>
                    <ErrorState referenceId="req_7f3a9c21e4b80d15" onRetry={() => toast("Retrying")} />
                  </Card>
                  <Card>
                    <PermissionState requiredRole="admin" />
                  </Card>
                  <Card
                    className="flex flex-col gap-3 p-6"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading"
                  >
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-24 w-full" />
                  </Card>
                </div>
              </div>
            </BothThemes>
          </Block>

          <Block
            id="navigation"
            title="Navigation"
            description="Sidebar (248px, collapsible to a 64px rail), 56px top bar, stepper, and the mobile bottom tab bar."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Stepper</CardTitle>
                </CardHeader>
                <CardContent>
                  <Stepper
                    steps={["Workspace details", "What brings you here?", "Connect a mailbox"]}
                    current={1}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Mobile bottom tab bar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-card border border-border">
                    <div className="h-24 bg-bg" />
                    <nav
                      aria-label="Example bottom tab bar"
                      className="grid h-16 grid-cols-4 border-t border-border bg-surface"
                    >
                      {[
                        [LayoutDashboard, "Dashboard", true],
                        [Inbox, "Tickets", false],
                        [ListChecks, "Review", false],
                        [MoreHorizontal, "More", false],
                      ].map(([Icon, label, active]) => {
                        const I = Icon as typeof Inbox;
                        return (
                          <span
                            key={label as string}
                            className={`flex flex-col items-center justify-center gap-1 text-caption ${active ? "text-primary" : "text-text-muted"}`}
                          >
                            <I aria-hidden className="size-5 stroke-[1.75]" />
                            {label as string}
                          </span>
                        );
                      })}
                    </nav>
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-body text-text-muted">
              The full app shell is live in the product at{" "}
              <Link href="/app" className="text-primary hover:underline">
                /app
              </Link>{" "}
              (sign in required).
            </p>
          </Block>
        </main>
      </div>
    </div>
  );
}
