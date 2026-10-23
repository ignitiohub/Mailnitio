"use client";

import {
  AiCard,
  Banner,
  Card,
  ErrorState,
  formatDateTime,
  formatNumber,
  Skeleton,
  Timeline,
  type TimelineStep,
} from "@mailnitio/ui";
import { ArrowLeft, MinusCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ACTION_LABELS,
  canReview,
  EmailChip,
  formatUsd,
  REVIEW_REASON_LABELS,
  TicketKey,
  TicketStatusChip,
} from "@/components/helpdesk/display";
import { useLookups } from "@/components/helpdesk/lookups";
import { ReviewActions } from "@/components/helpdesk/review-actions";
import { useMe } from "@/lib/me";
import { POLL_MS, useApi } from "@/lib/use-api";

interface EmailDetail {
  id: string;
  internetMessageId: string;
  source: string;
  sender: string;
  senderName: string | null;
  toAddrs: string[];
  subject: string;
  receivedAt: string;
  status: string;
  chip: string;
  skipReason: string | null;
  action: string | null;
  matchMethod: string | null;
  replyType: string | null;
  customerMatchMethod: string | null;
  category: string | null;
  categoryConfidence: number | null;
  priority: string | null;
  summary: string | null;
  aiReason: string | null;
  escalated: boolean;
  escalationReason: string | null;
  originalTeam: string | null;
  routedTeam: string | null;
  rerouted: boolean;
  needsReview: boolean;
  reviewReasons: string[];
  ackSent: boolean;
  timeline: {
    step: string;
    label: string;
    at: string;
    detail?: string;
    state: "done" | "failed" | "skipped";
  }[];
  configVersion: number | null;
  lastError: string | null;
  mailbox: string | null;
  mailboxMode: string | null;
  agentRuns: {
    id: string;
    agentType: string;
    model: string;
    provider: string;
    ok: boolean;
    error: string | null;
    latencyMs: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
    createdAt: string;
  }[];
  ticket: {
    id: string;
    key: string;
    subject: string;
    status: string;
    priority: string;
    teamName: string | null;
  } | null;
  relatedTicket: { id: string; key: string } | null;
  thread: { id: string; rollingSummary: string | null; messageCount: number } | null;
  messages: {
    id: string;
    direction: string;
    fromAddr: string | null;
    fromName: string | null;
    bodyText: string;
    emailLogId: string | null;
    createdAt: string;
  }[];
  customer: { id: string; name: string | null; email: string } | null;
  review: { id: string; status: string; reasons: string[] } | null;
  overrides: {
    id: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    note: string | null;
    createdAt: string;
    userName: string | null;
  }[];
}

const MATCH_LABELS: Record<string, string> = {
  token: "Ticket number in the subject",
  headers: "Reply headers",
  conversation: "Mailbox conversation",
  heuristic: "Same sender and subject",
  none: "New conversation",
};
const CUSTOMER_MATCH: Record<string, string> = {
  existing: "Existing customer",
  created: "New customer created",
  unidentified: "Not identified",
};
const AGENT_LABELS: Record<string, string> = {
  classifier: "Classifier",
  context: "Thread context",
};
const OVERRIDE_FIELDS: Record<string, string> = {
  category: "Category",
  team: "Team",
  customer: "Customer",
  ticket_link: "Linked to ticket",
  split: "Split into",
};

function EmailSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading email">
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-96 w-full rounded-card" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    </div>
  );
}

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const { categoryLabel, teamByKey, config } = useLookups();
  const email = useApi<{ data: EmailDetail }>(`/v1/emails/${id}`, { pollMs: POLL_MS });
  const e = email.data?.data;
  const tz = me.workspace.timezone;

  if (email.loading && !e) return <EmailSkeleton />;
  if (email.error || !e) {
    return email.error?.status === 404 ? (
      <ErrorState
        title="Email not found"
        description="It may belong to another workspace. Go back to the inbox log and search for it."
      />
    ) : (
      <ErrorState referenceId={email.error?.referenceId} onRetry={email.refetch} />
    );
  }

  const steps: TimelineStep[] = e.timeline.map((s, i) => ({
    id: `${s.step}-${i}`,
    label: s.label,
    detail: s.detail,
    dateTime: s.at,
    timestamp: formatDateTime(s.at, tz),
    state: s.state === "failed" ? "failed" : s.state === "skipped" ? "pending" : "done",
    icon: s.state === "skipped" ? MinusCircle : undefined,
  }));
  const run = e.agentRuns.find((r) => r.agentType === "classifier") ?? e.agentRuns[0];
  const cost = e.agentRuns.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  const teamName = (key: string | null) => (key ? (teamByKey(key)?.name ?? key) : "None");
  const openReview = e.review?.status === "open" && canReview(me.role);
  const thisMessage = e.messages.find((m) => m.emailLogId === e.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/app/inbox-log"
          className="inline-flex w-fit items-center gap-1.5 text-small text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Inbox log
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <EmailChip chip={e.chip} />
          {e.action ? (
            <span className="text-small text-text-muted">{ACTION_LABELS[e.action] ?? e.action}</span>
          ) : null}
          {e.ticket ? (
            <Link href={`/app/tickets/${e.ticket.id}`} className="hover:underline">
              <TicketKey value={e.ticket.key} />
            </Link>
          ) : null}
        </div>
        <h1 className="text-h3 break-words text-text md:text-h2">{e.subject}</h1>
        <p className="text-body text-text-muted">
          From <span className="text-text">{e.senderName ? `${e.senderName} <${e.sender}>` : e.sender}</span>{" "}
          to {e.mailbox ?? e.toAddrs.join(", ")} ·{" "}
          <time dateTime={e.receivedAt} className="tabular">
            {formatDateTime(e.receivedAt, tz)}
          </time>
        </p>
      </div>

      {e.status === "failed" ? (
        <Banner tone="danger" title="Processing failed">
          {e.lastError ?? "Mailnitio could not finish processing this email."} The email is kept and will be
          retried; nothing was lost.
        </Banner>
      ) : null}
      {e.status === "skipped" ? (
        <Banner tone="info" title="Skipped">
          {e.skipReason ?? "This email did not need a ticket."}
        </Banner>
      ) : null}
      {e.status === "shadow" ? (
        <Banner tone="warning" title="Shadow mode">
          {e.mailbox ?? "This mailbox"} is in shadow mode: the decision is recorded but no ticket action or
          acknowledgement was taken.
        </Banner>
      ) : null}
      {e.escalated ? (
        <Banner tone="danger" title="Escalated">
          {e.escalationReason ?? "An escalation term was found."} Routed to {teamName(e.routedTeam)}.
        </Banner>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {openReview && e.review ? (
            <Card className="flex flex-col gap-4 p-4 md:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-h3 text-text">Needs review</h2>
                <p className="text-body text-text-muted">
                  {e.review.reasons.map((r) => REVIEW_REASON_LABELS[r] ?? r).join(" · ")}
                </p>
              </div>
              <ReviewActions
                target={{
                  reviewId: e.review.id,
                  category: e.category,
                  routedTeam: e.routedTeam,
                  ticketKey: e.ticket?.key ?? null,
                  customer: e.customer,
                }}
                onDone={email.refetch}
              />
            </Card>
          ) : null}

          <Card className="flex flex-col gap-4 p-4 md:p-6">
            <h2 className="text-h3 text-text">Decision trail</h2>
            {steps.length > 0 ? (
              <Timeline steps={steps} />
            ) : (
              <p className="text-body text-text-muted">
                Processing has not started yet. This page updates automatically.
              </p>
            )}
          </Card>

          {thisMessage ? (
            <Card className="flex flex-col gap-3 p-4 md:p-6">
              <h2 className="text-h3 text-text">Email</h2>
              <p className="prose-width text-body whitespace-pre-wrap text-text">{thisMessage.bodyText}</p>
            </Card>
          ) : null}

          {e.thread ? (
            <Card className="flex flex-col gap-3 p-4 md:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-h3 text-text">Conversation</h2>
                <span className="text-small text-text-muted tabular">
                  {formatNumber(e.thread.messageCount)} messages
                </span>
              </div>
              {e.thread.rollingSummary ? (
                <p className="prose-width text-body text-text-muted">
                  <span className="font-medium text-text">AI suggestion: </span>
                  {e.thread.rollingSummary}
                </p>
              ) : null}
              <ol className="flex flex-col divide-y divide-border">
                {e.messages.map((m) => (
                  <li key={m.id} className="flex flex-col gap-1 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-body font-medium text-text">
                        {m.direction === "note" ? "Internal note" : (m.fromName ?? m.fromAddr ?? "Unknown")}
                        {m.emailLogId === e.id ? (
                          <span className="ml-2 text-caption text-primary">This email</span>
                        ) : null}
                      </span>
                      <time
                        dateTime={m.createdAt}
                        className="text-caption font-normal text-text-subtle tabular"
                      >
                        {formatDateTime(m.createdAt, tz)}
                      </time>
                    </div>
                    <p className="line-clamp-2 text-small text-text-muted">{m.bodyText}</p>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {e.overrides.length > 0 ? (
            <Card className="flex flex-col gap-3 p-4 md:p-6">
              <h2 className="text-h3 text-text">Corrections</h2>
              <ul className="flex flex-col gap-3">
                {e.overrides.map((o) => (
                  <li key={o.id} className="flex flex-col gap-0.5 text-body">
                    <span className="text-text">
                      {OVERRIDE_FIELDS[o.field] ?? o.field}:{" "}
                      <span className="text-text-muted line-through">
                        {o.field === "category"
                          ? categoryLabel(o.oldValue)
                          : o.field === "team"
                            ? teamName(o.oldValue)
                            : (o.oldValue ?? "None")}
                      </span>{" "}
                      →{" "}
                      <span className="font-medium">
                        {o.field === "category"
                          ? categoryLabel(o.newValue)
                          : o.field === "team"
                            ? teamName(o.newValue)
                            : (o.newValue ?? "None")}
                      </span>
                    </span>
                    <span className="text-small text-text-subtle">
                      {o.userName ?? "A teammate"} · {formatDateTime(o.createdAt, tz)}
                      {o.note ? ` · “${o.note}”` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside aria-label="Decision" className="flex flex-col gap-4">
          {e.category ? (
            <AiCard
              category={categoryLabel(e.category)}
              confidence={e.categoryConfidence ?? 0}
              reason={e.aiReason ?? e.summary ?? "No reason recorded"}
              replyType={e.replyType ?? (e.action ? (ACTION_LABELS[e.action] ?? e.action) : "None")}
              model={run ? `${run.model} (${run.provider})` : "Not recorded"}
              cost={formatUsd(cost)}
            />
          ) : null}
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-h4 text-text">Routing</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
              <dt className="text-text-muted">Routed to</dt>
              <dd className="text-right text-text">{teamName(e.routedTeam)}</dd>
              {e.rerouted ? (
                <>
                  <dt className="text-text-muted">Sent to</dt>
                  <dd className="text-right text-text">{teamName(e.originalTeam)}</dd>
                </>
              ) : null}
              <dt className="text-text-muted">Thread match</dt>
              <dd className="text-right text-text">
                {e.matchMethod ? (MATCH_LABELS[e.matchMethod] ?? e.matchMethod) : "None"}
              </dd>
              <dt className="text-text-muted">Customer</dt>
              <dd className="text-right text-text">
                {e.customer ? (
                  <Link href={`/app/customers/${e.customer.id}`} className="text-primary hover:underline">
                    {e.customer.name ?? e.customer.email}
                  </Link>
                ) : (
                  (CUSTOMER_MATCH[e.customerMatchMethod ?? ""] ?? "Not identified")
                )}
              </dd>
              <dt className="text-text-muted">Acknowledgement</dt>
              <dd className="text-right text-text">{e.ackSent ? "Recorded" : "Not sent"}</dd>
              <dt className="text-text-muted">Thresholds</dt>
              <dd className="text-right text-text tabular">
                {config
                  ? `${Math.round(config.thresholds.high * 100)}% / ${Math.round(config.thresholds.low * 100)}%`
                  : "None"}
              </dd>
              <dt className="text-text-muted">Config version</dt>
              <dd className="text-right text-text tabular">{e.configVersion ?? "None"}</dd>
            </dl>
          </Card>

          {e.ticket ? (
            <Card className="flex flex-col gap-2 p-4">
              <h2 className="text-h4 text-text">Ticket</h2>
              <Link
                href={`/app/tickets/${e.ticket.id}`}
                className="flex items-center gap-2 rounded-control p-1 hover:bg-surface-2"
              >
                <TicketKey value={e.ticket.key} />
                <span className="min-w-0 flex-1 truncate text-small text-text">{e.ticket.subject}</span>
                <TicketStatusChip status={e.ticket.status} />
              </Link>
              {e.relatedTicket ? (
                <p className="text-small text-text-muted">
                  Linked to{" "}
                  <Link
                    href={`/app/tickets/${e.relatedTicket.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {e.relatedTicket.key}
                  </Link>
                </p>
              ) : null}
            </Card>
          ) : null}

          {e.agentRuns.length > 0 ? (
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-h4 text-text">Agent runs</h2>
              <table className="w-full text-small">
                <caption className="sr-only">Agent runs for this email</caption>
                <thead>
                  <tr className="text-left text-text-subtle">
                    <th scope="col" className="pb-2 font-medium">
                      Agent
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Tokens
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {e.agentRuns.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2">
                        <span className={r.ok ? "text-text" : "text-danger"}>
                          {AGENT_LABELS[r.agentType] ?? r.agentType}
                        </span>
                        {!r.ok ? (
                          <span className="block text-caption text-danger">{r.error ?? "Failed"}</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right text-text tabular">
                        {formatNumber((r.inputTokens ?? 0) + (r.outputTokens ?? 0))}
                      </td>
                      <td className="py-2 text-right text-text tabular">{formatUsd(r.costUsd ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}
          <p className="font-mono text-caption break-all text-text-subtle">{e.internetMessageId}</p>
        </aside>
      </div>
    </div>
  );
}
