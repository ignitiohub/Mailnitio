"use client";

import {
  Badge,
  Banner,
  BarList,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  formatNumber,
  formatPercent,
  KpiCard,
  KpiCardSkeleton,
  PageHeader,
  Skeleton,
  StackedBarChart,
} from "@mailnitio/ui";
import { CircleAlert, CirclePause, Eye, Radio } from "lucide-react";
import Link from "next/link";
import { GettingStarted } from "@/components/app/getting-started";
import { formatUsd, When } from "@/components/helpdesk/display";
import { useMe } from "@/lib/me";
import { POLL_MS, useApi } from "@/lib/use-api";

interface Dashboard {
  timezone: string;
  kpis: {
    processedToday: { value: number; previous: number };
    newTicketsToday: { value: number; previous: number };
    appendedToday: { value: number; previous: number };
    rerouteRate7d: { value: number; previous: number };
    needsReview: { value: number; oldestAt: string | null };
    failuresToday: { value: number; previous: number };
    aiCostToday: { valueUsd: number; previousUsd: number; perEmailUsd: number };
  };
  days: { day: string; processed: number; failed: number; review: number }[];
  categories: { series: { key: string; label: string }[]; days: { day: string; counts: Record<string, number> }[] };
  teams: { id: string; name: string; open: number; atRisk: number; breached: number }[];
  mailboxes: {
    id: string;
    address: string;
    displayName: string;
    mode: string;
    health: string;
    ackEnabled: boolean;
    lastReceivedAt: string | null;
    processedToday: number;
  }[];
}

function change(value: number, previous: number) {
  if (previous === 0) return value === 0 ? 0 : 1;
  return (value - previous) / previous;
}

/** Day buckets are already in the workspace timezone (YYYY-MM-DD), so format them as plain dates. */
function dayLabel(day: string, style: "short" | "long") {
  const date = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat(
    "en-GB",
    style === "short" ? { weekday: "short", timeZone: "UTC" } : { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" },
  ).format(date);
}

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "live")
    return (
      <Badge tone="success">
        <Radio aria-hidden />
        Live
      </Badge>
    );
  if (mode === "shadow")
    return (
      <Badge tone="neutral" className="border border-dashed border-neutral/40">
        <Eye aria-hidden />
        Shadow
      </Badge>
    );
  return (
    <Badge tone="warning">
      <CirclePause aria-hidden />
      Paused
    </Badge>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 w-full rounded-card" />
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { me } = useMe();
  const helpdesk = me.workspace.productInterest !== "send";
  const { data, error, loading, refetch } = useApi<{ data: Dashboard }>(helpdesk ? "/v1/dashboard" : null, { pollMs: POLL_MS });
  const d = data?.data;

  if (!helpdesk) return <GettingStarted />;
  if (error?.status === 404 || (d && d.mailboxes.length === 0)) return <GettingStarted />;

  const shadow = d?.mailboxes.filter((m) => m.mode === "shadow") ?? [];
  const k = d?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations dashboard"
        description={`${me.workspace.name} · today in ${d?.timezone.replace("_", " ") ?? me.workspace.timezone}`}
        actions={
          <Button asChild>
            <Link href="/app/review">Open needs review</Link>
          </Button>
        }
      />

      {shadow.length > 0 ? (
        <Banner
          tone="warning"
          title={`Shadow mode is on for ${shadow.map((m) => m.address).join(", ")}`}
          action={
            me.role === "owner" || me.role === "admin" ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/app/mailboxes">Manage mailboxes</Link>
              </Button>
            ) : undefined
          }
        >
          Mailnitio records what it would do for these mailboxes, without creating tickets or sending replies.
        </Banner>
      ) : null}

      {error ? (
        <Card>
          <ErrorState description={error.message} referenceId={error.referenceId} onRetry={refetch} />
        </Card>
      ) : loading || !d || !k ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Emails processed today"
              value={formatNumber(k.processedToday.value)}
              delta={{ value: change(k.processedToday.value, k.processedToday.previous), label: "vs yesterday" }}
              sparkline={d.days.map((x) => x.processed)}
            />
            <KpiCard
              label="New vs appended tickets today"
              value={
                <>
                  {formatNumber(k.newTicketsToday.value)}
                  <span className="text-h4 font-normal text-text-muted"> new · {formatNumber(k.appendedToday.value)} appended</span>
                </>
              }
              context={`${formatNumber(k.appendedToday.value)} follow-ups joined an existing ticket instead of opening a duplicate`}
            />
            <KpiCard
              label="Rerouted by AI (7 days)"
              value={formatPercent(k.rerouteRate7d.value)}
              context={`Arrived in the wrong mailbox and moved to the right team · previous 7 days ${formatPercent(k.rerouteRate7d.previous)}`}
            />
            <KpiCard
              label="Needs review"
              value={formatNumber(k.needsReview.value)}
              context={
                k.needsReview.oldestAt ? (
                  <>
                    Oldest waiting <When at={k.needsReview.oldestAt} />
                  </>
                ) : (
                  "Nothing waiting"
                )
              }
            />
            <KpiCard
              label="Failures today"
              value={formatNumber(k.failuresToday.value)}
              delta={{ value: change(k.failuresToday.value, k.failuresToday.previous), goodDirection: "down", label: "vs yesterday" }}
              context={k.failuresToday.value > 0 ? "Failed emails can be replayed from the inbox log" : "No processing failures"}
            />
            <KpiCard
              label="AI cost today"
              value={formatUsd(k.aiCostToday.valueUsd)}
              delta={{ value: change(k.aiCostToday.valueUsd, k.aiCostToday.previousUsd), goodDirection: "down", label: "vs yesterday" }}
              context={`${formatUsd(k.aiCostToday.perEmailUsd)} per email processed`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Emails by category</CardTitle>
                  <p className="text-small text-text-muted">Last 7 days, processed and shadow emails</p>
                </div>
              </CardHeader>
              <CardContent>
                {d.categories.series.length === 0 ? (
                  <p className="py-12 text-center text-body text-text-muted">No classified emails in the last 7 days.</p>
                ) : (
                  <StackedBarChart
                    label="Emails by category, last 7 days"
                    series={d.categories.series}
                    points={d.categories.days.map((day) => ({
                      label: dayLabel(day.day, "short"),
                      detail: dayLabel(day.day, "long"),
                      values: day.counts,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Open tickets by team</CardTitle>
                  <p className="text-small text-text-muted">First-response SLA at risk or breached</p>
                </div>
              </CardHeader>
              <CardContent>
                <BarList
                  label="Open tickets by team"
                  items={d.teams.map((t) => ({
                    key: t.id,
                    label: t.name,
                    value: t.open,
                    detail: t.breached > 0 ? `${t.breached} overdue` : t.atRisk > 0 ? `${t.atRisk} at risk` : undefined,
                  }))}
                  valueLabel={(v) => formatNumber(v)}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Mailbox health</CardTitle>
                <p className="text-small text-text-muted">Connection, mode and today's volume per mailbox</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-0">
              <ul className="divide-y divide-border">
                {d.mailboxes.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 md:px-6">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-medium text-text">{m.address}</span>
                      <span className="text-small text-text-muted">
                        Last email <When at={m.lastReceivedAt} />
                        {m.ackEnabled ? " · Acknowledgements on" : " · Acknowledgements off"}
                      </span>
                    </div>
                    <span className="text-small text-text-muted tabular">{formatNumber(m.processedToday)} today</span>
                    {m.health !== "ok" ? (
                      <Badge tone="danger">
                        <CircleAlert aria-hidden />
                        Connection error
                      </Badge>
                    ) : null}
                    <ModeBadge mode={m.mode} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
