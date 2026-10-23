"use client";

import {
  Button,
  Card,
  ConfidenceBar,
  cn,
  Drawer,
  EmptyState,
  ErrorState,
  formatDateTime,
  PageHeader,
  Skeleton,
  useMediaQuery,
} from "@mailnitio/ui";
import { CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useShortcut } from "@/components/app/shortcuts";
import { canReview, REVIEW_REASON_LABELS, TicketKey, When } from "@/components/helpdesk/display";
import { useLookups } from "@/components/helpdesk/lookups";
import { ReviewActions } from "@/components/helpdesk/review-actions";
import { useMe } from "@/lib/me";
import { POLL_MS, useApi, useNewIds } from "@/lib/use-api";

interface ReviewRow {
  id: string;
  createdAt: string;
  reasons: string[];
  emailLogId: string;
  subject: string;
  sender: string;
  senderName: string | null;
  receivedAt: string;
  category: string | null;
  confidence: number | null;
  routedTeam: string | null;
  teamName: string | null;
  escalated: boolean;
  escalationReason: string | null;
  ticketId: string | null;
  ticketKey: string | null;
}

interface EmailForReview {
  id: string;
  subject: string;
  sender: string;
  senderName: string | null;
  receivedAt: string;
  category: string | null;
  categoryConfidence: number | null;
  aiReason: string | null;
  summary: string | null;
  routedTeam: string | null;
  escalationReason: string | null;
  ticket: { id: string; key: string } | null;
  customer: { id: string; name: string | null; email: string } | null;
  messages: { id: string; bodyText: string; emailLogId: string | null }[];
  thread: { rollingSummary: string | null } | null;
}

function ReviewDetail({ row, onDone }: { row: ReviewRow; onDone: () => void }) {
  const { me } = useMe();
  const { config, categoryLabel } = useLookups();
  const email = useApi<{ data: EmailForReview }>(`/v1/emails/${row.emailLogId}`);
  const e = email.data?.data;
  if (email.error) return <ErrorState referenceId={email.error.referenceId} onRetry={email.refetch} />;
  if (!e) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading email">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }
  const body = e.messages.find((m) => m.emailLogId === e.id)?.bodyText;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {row.reasons.map((r) => (
            <span
              key={r}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-caption",
                r === "escalation" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
              )}
            >
              {REVIEW_REASON_LABELS[r] ?? r}
            </span>
          ))}
        </div>
        <h2 className="text-h3 break-words text-text">{e.subject}</h2>
        <p className="text-small text-text-muted">
          {e.senderName ? `${e.senderName} <${e.sender}>` : e.sender} · {formatDateTime(e.receivedAt, me.workspace.timezone)}
        </p>
      </div>
      {e.escalationReason ? (
        <p className="flex items-start gap-2 rounded-card border border-danger/30 bg-danger-soft p-3 text-small text-text">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          {e.escalationReason}
        </p>
      ) : null}
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-caption text-primary">AI suggestion</p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-h4 text-text">{e.category ? categoryLabel(e.category) : "Not classified"}</span>
          <span className="text-small text-text-muted">{row.teamName ?? "No team"}</span>
        </div>
        {e.categoryConfidence !== null ? (
          <ConfidenceBar value={e.categoryConfidence} high={config?.thresholds.high} low={config?.thresholds.low} />
        ) : null}
        <p className="text-body text-text-muted">{e.aiReason ?? e.summary ?? "No reason recorded."}</p>
      </Card>
      {body ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-overline text-text-subtle uppercase">Email</h3>
          <p className="prose-width max-h-64 overflow-y-auto rounded-card border border-border bg-surface p-4 text-body whitespace-pre-wrap text-text">
            {body}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-small">
        {e.ticket ? (
          <Link href={`/app/tickets/${e.ticket.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            Open {e.ticket.key}
            <ExternalLink aria-hidden className="size-3.5" />
          </Link>
        ) : null}
        <Link href={`/app/inbox-log/${e.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          Decision trail
          <ExternalLink aria-hidden className="size-3.5" />
        </Link>
      </div>
      {canReview(me.role) ? (
        <ReviewActions
          target={{
            reviewId: row.id,
            category: e.category,
            routedTeam: e.routedTeam,
            ticketKey: e.ticket?.key ?? null,
            customer: e.customer,
          }}
          onDone={onDone}
        />
      ) : (
        <p className="rounded-card border border-border bg-surface-2 p-4 text-small text-text-muted">
          Reviewers, supervisors and admins can approve or correct AI decisions. Ask a workspace admin if you need access.
        </p>
      )}
    </div>
  );
}

function ReviewScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { categoryLabel } = useLookups();
  const list = useApi<{ data: ReviewRow[]; nextCursor: string | null }>("/v1/reviews?limit=50", { pollMs: POLL_MS });
  const rows = list.data?.data ?? [];
  const fresh = useNewIds(list.data ? rows.map((r) => r.id) : undefined);
  const itemId = params.get("item");
  const selected = rows.find((r) => r.id === itemId) ?? (desktop ? rows[0] : undefined);
  const index = selected ? rows.indexOf(selected) : -1;

  function select(id: string | null) {
    router.replace(id ? `/app/review?item=${id}` : "/app/review", { scroll: false });
  }

  // Keep the selected row in view when it moves with j/k.
  useEffect(() => {
    if (selected) document.getElementById(`review-${selected.id}`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useShortcut("j", () => {
    const next = rows[index + 1];
    if (next) select(next.id);
  });
  useShortcut("k", () => {
    const prev = index > 0 ? rows[index - 1] : undefined;
    if (prev) select(prev.id);
  });

  function done() {
    // Move to the next item so reviewers can work through the queue.
    const next = rows[index + 1] ?? rows[index - 1];
    select(next && next.id !== selected?.id ? next.id : null);
    list.refetch();
  }

  const listPane = (
    <Card className="overflow-hidden">
      {list.loading && !list.data ? (
        <ul aria-busy="true" aria-label="Loading review items" className="flex flex-col divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </li>
          ))}
        </ul>
      ) : list.error ? (
        <ErrorState referenceId={list.error.referenceId} onRetry={list.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to review"
          description="Low-confidence and escalated decisions appear here for a person to check."
          action={
            <Button asChild variant="secondary">
              <Link href="/app/inbox-log">Open the inbox log</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex max-h-[calc(100vh-240px)] flex-col divide-y divide-border overflow-y-auto" aria-label="Review queue">
          {rows.map((r) => (
            <li key={r.id} id={`review-${r.id}`}>
              <button
                type="button"
                onClick={() => select(r.id)}
                aria-current={selected?.id === r.id ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer flex-col gap-1.5 p-4 text-left transition-colors duration-150 hover:bg-surface-2",
                  selected?.id === r.id && "bg-primary-soft hover:bg-primary-soft",
                  fresh.has(r.id) && "animate-row-highlight",
                )}
              >
                <span className="flex items-center gap-2">
                  {r.escalated ? <ShieldAlert aria-label="Escalated" className="size-4 shrink-0 text-danger" /> : null}
                  <span className="min-w-0 flex-1 truncate font-medium text-text">{r.subject}</span>
                  <When at={r.receivedAt} className="shrink-0 text-caption font-normal text-text-subtle" />
                </span>
                <span className="truncate text-small text-text-muted">{r.senderName ?? r.sender}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-normal text-text-subtle">
                  <span>{r.category ? categoryLabel(r.category) : "Not classified"}</span>
                  {r.confidence !== null ? <span className="tabular">{Math.round(r.confidence * 100)}%</span> : null}
                  <span>{r.reasons.map((x) => REVIEW_REASON_LABELS[x] ?? x).join(", ")}</span>
                  {r.ticketKey ? <TicketKey value={r.ticketKey} className="text-caption" /> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Needs review"
        description={`Check AI decisions before they stick. Approve, or correct the category, team, ticket or customer.${rows.length ? ` ${rows.length} waiting.` : ""}`}
      />
      {desktop ? (
        <div className="grid grid-cols-[380px_minmax(0,1fr)] items-start gap-6">
          {listPane}
          <Card className="p-6">
            {selected ? (
              <ReviewDetail key={selected.id} row={selected} onDone={done} />
            ) : (
              <EmptyState icon={CheckCircle2} title="Choose an item" description="Pick an email on the left to review it." />
            )}
          </Card>
        </div>
      ) : (
        <>
          {listPane}
          <Drawer open={Boolean(selected)} onOpenChange={(o) => !o && select(null)} title="Review decision">
            {selected ? <ReviewDetail key={selected.id} row={selected} onDone={done} /> : null}
          </Drawer>
        </>
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewScreen />
    </Suspense>
  );
}
