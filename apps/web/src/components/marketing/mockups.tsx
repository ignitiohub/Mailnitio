import type { Status } from "@mailnitio/shared";
import { AiCard, Badge, ConfidenceBar, StatusChip, Timeline } from "@mailnitio/ui";
import { ArrowDown, ArrowRight, Building2, Inbox, Mail, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { BrowserFrame } from "./section";

/*
 * Illustrative product UI for the marketing site. Content is invented demo data for "Acme" companies,
 * rendered with the same components as the app.
 */

const inboxRows: {
  key: string;
  subject: string;
  from: string;
  category: string;
  team: string;
  confidence: number;
  status: Status;
  received: string;
}[] = [
  {
    key: "MN-1042",
    subject: "Transfer of ₦250,000 not received",
    from: "chiamaka.eze@acme-mail.ng",
    category: "Failed transfer",
    team: "Payments operations",
    confidence: 0.96,
    status: "Processed",
    received: "2 min ago",
  },
  {
    key: "MN-1041",
    subject: "Request for July to September statement",
    from: "ibrahim.musa@acme-mail.ng",
    category: "Statement request",
    team: "Customer service",
    confidence: 0.93,
    status: "Processed",
    received: "6 min ago",
  },
  {
    key: "MN-1040",
    subject: "Unauthorised debit on my account",
    from: "funmi.adeyemi@acme-mail.ng",
    category: "Card dispute",
    team: "Disputes",
    confidence: 0.91,
    status: "Escalated",
    received: "11 min ago",
  },
  {
    key: "MN-1039",
    subject: "Update BVN and home address",
    from: "kelechi.obi@acme-mail.ng",
    category: "KYC update",
    team: "Compliance",
    confidence: 0.71,
    status: "Needs Review",
    received: "14 min ago",
  },
  {
    key: "MN-1038",
    subject: "Re: Redemption of money market units",
    from: "aisha.bello@acme-mail.ng",
    category: "Redemption",
    team: "Investment operations",
    confidence: 0.88,
    status: "Rerouted",
    received: "20 min ago",
  },
];

export function InboxMockup() {
  return (
    <BrowserFrame url="app.mailnitio.com/app/tickets" className="text-left">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Inbox aria-hidden className="size-4 stroke-[1.75] text-text-muted" />
          <span className="text-body font-medium text-text">Tickets</span>
          <Badge tone="neutral" className="tabular">
            1,248 this week
          </Badge>
        </div>
        <span className="text-caption text-text-subtle">Acme Asset Management</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-body">
          <caption className="sr-only">Example tickets routed by Mailnitio</caption>
          <thead className="bg-surface-2">
            <tr className="text-caption text-text-muted">
              <th scope="col" className="h-9 px-4 text-left">
                Ticket
              </th>
              <th scope="col" className="px-4 text-left">
                Subject
              </th>
              <th scope="col" className="px-4 text-left">
                Routed to
              </th>
              <th scope="col" className="px-4 text-left">
                Confidence
              </th>
              <th scope="col" className="px-4 text-left">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {inboxRows.map((row) => (
              <tr key={row.key} className="h-11 border-t border-border">
                <td className="px-4 font-mono text-small text-text-muted">{row.key}</td>
                <td className="max-w-56 truncate px-4 text-text">
                  {row.subject}
                  <span className="block truncate text-caption font-normal text-text-subtle">
                    {row.category}
                  </span>
                </td>
                <td className="px-4 text-text-muted">{row.team}</td>
                <td className="w-36 px-4">
                  <ConfidenceBar value={row.confidence} />
                </td>
                <td className="px-4">
                  <StatusChip status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BrowserFrame>
  );
}

export function DecisionMockup() {
  return (
    <div className="grid gap-4 text-left md:grid-cols-[1fr_1.1fr]">
      <AiCard
        category="Failed transfer"
        confidence={0.96}
        reason="Customer reports a ₦250,000 transfer made on Monday that has not arrived; matches open ticket MN-1027 for the same account."
        replyType="Acknowledge and link to existing ticket"
        model="claude-sonnet"
        cost="₦3.71"
      />
      <div className="rounded-card border border-border bg-surface p-4">
        <p className="mb-4 text-overline text-text-subtle uppercase">Decision trail · MN-1042</p>
        <Timeline
          steps={[
            {
              id: "1",
              label: "Email received",
              timestamp: "14:05:01",
              detail: "support@acmeasset.ng via Microsoft 365",
            },
            {
              id: "2",
              label: "Personal data masked",
              timestamp: "14:05:01",
              detail: "Account number and phone number replaced",
            },
            {
              id: "3",
              label: "Classified",
              timestamp: "14:05:03",
              detail: "Failed transfer · 96% confidence",
            },
            {
              id: "4",
              label: "Customer matched",
              timestamp: "14:05:03",
              detail: "Chiamaka Eze · 2 open tickets",
            },
            {
              id: "5",
              label: "Routed to Payments operations",
              timestamp: "14:05:04",
              detail: "SLA: first response in 2 hours",
            },
          ]}
        />
      </div>
    </div>
  );
}

const flowSteps = [
  {
    icon: Mail,
    title: "Your mailbox",
    body: "Outlook or Gmail. Customers keep emailing the address they already use.",
  },
  {
    icon: Sparkles,
    title: "Mailnitio AI",
    body: "Masks personal data, reads the email, matches the customer and decides where it belongs.",
  },
  {
    icon: Building2,
    title: "Helpdesk or your CRM",
    body: "A ticket in Mailnitio Helpdesk, or a case in Dynamics 365 or Salesforce.",
  },
];

export function FlowDiagram() {
  return (
    <ol className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {flowSteps.map((step, index) => (
        <li key={step.title} className="contents">
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-control bg-primary-soft text-primary">
                <step.icon aria-hidden className="size-5 stroke-[1.75]" />
              </span>
              <span className="text-caption text-text-subtle tabular">Step {index + 1}</span>
            </div>
            <h3 className="text-h4 text-text">{step.title}</h3>
            <p className="text-body text-text-muted">{step.body}</p>
          </div>
          {index < flowSteps.length - 1 ? (
            <div aria-hidden className="flex items-center justify-center text-text-subtle">
              <ArrowRight className="size-5 stroke-[1.75] max-md:hidden" />
              <ArrowDown className="size-5 stroke-[1.75] md:hidden" />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function CampaignMonitorMockup() {
  const rows = [
    { label: "Delivered", value: "41,862", pct: 0.982, tone: "bg-success" },
    { label: "Opened", value: "18,407", pct: 0.44, tone: "bg-chart-1" },
    { label: "Bounced", value: "512", pct: 0.012, tone: "bg-warning" },
    { label: "Complaints", value: "9", pct: 0.0002, tone: "bg-danger" },
  ];
  return (
    <BrowserFrame url="app.mailnitio.com/app/campaigns/q3-dividend-notice" className="text-left">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-h4 text-text">Q3 dividend notice</p>
            <p className="text-small text-text-muted">Acme Asset Management · 42,631 recipients</p>
          </div>
          <Badge tone="info">
            <Wand2 aria-hidden />
            Sending · 312 per second
          </Badge>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-[94%] rounded-full bg-primary" />
        </div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="rounded-card border border-border p-3">
              <dt className="flex items-center gap-2 text-caption text-text-muted">
                <span aria-hidden className={`size-2 rounded-full ${row.tone}`} />
                {row.label}
              </dt>
              <dd className="text-h3 text-text tabular">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="flex items-center gap-2 text-small text-text-muted">
          <ShieldCheck aria-hidden className="size-4 stroke-[1.75] text-success" />
          SPF, DKIM and DMARC aligned for acmeasset.ng
        </p>
      </div>
    </BrowserFrame>
  );
}
