"use client";

import {
  BarList,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  formatDateTime,
  formatNumber,
  formatPercent,
  KpiCard,
  KpiCardSkeleton,
  PageHeader,
  Skeleton,
} from "@mailnitio/ui";
import { ChartColumn, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface InsightReport {
  id: string;
  title: string;
  createdAt: string;
  data: {
    period: string;
    emailsAnalysed: number;
    misroutedShare: number;
    duplicateShare: number;
    autoAnswerShare: number;
    topics: {
      label: string;
      share: number;
      volume: number;
      misrouted: number;
      autoAnswerCandidate: boolean;
    }[];
    findings: string[];
  };
}

export default function InsightsPage() {
  const { me } = useMe();
  const report = useApi<{ data: InsightReport | null }>("/v1/insights");
  const r = report.data?.data;

  if (report.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Insight report" />
        <ErrorState referenceId={report.error.referenceId} onRetry={report.refetch} />
      </div>
    );
  }
  if (report.loading && !report.data) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading insight report">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    );
  }
  if (!r) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Insight report"
          description="What your historical email says about routing, duplicates and self-service."
        />
        <Card>
          <EmptyState
            icon={ChartColumn}
            title="No insight report yet"
            description="Share a sample of past emails and Mailnitio analyses topics, misrouting and duplicates before you go live."
            action={
              <Button asChild>
                <Link href="/demo?offer=insight">Request an insight report</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const d = r.data;
  const topics = [...d.topics].sort((a, b) => b.share - a.share);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={r.title}
        description={`${d.period}. Prepared ${formatDateTime(r.createdAt, me.workspace.timezone)}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Emails analysed" value={formatNumber(d.emailsAnalysed)} />
        <KpiCard
          label="Reached the wrong mailbox"
          value={formatPercent(d.misroutedShare)}
          context="Would be rerouted automatically"
        />
        <KpiCard
          label="Follow-ups creating duplicates"
          value={formatPercent(d.duplicateShare)}
          context="Would thread onto the existing ticket"
        />
        <KpiCard label="Could be answered from the knowledge base" value={formatPercent(d.autoAnswerShare)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Topics by share of email</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              label="Topics by share of email"
              items={topics.map((t) => ({
                key: t.label,
                label: t.autoAnswerCandidate ? `${t.label} (self-service candidate)` : t.label,
                value: t.share,
                detail: `${formatNumber(t.volume)} emails`,
              }))}
              valueLabel={(v) => formatPercent(v)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Misrouting by topic</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              label="Share of each topic that reached the wrong mailbox"
              items={[...topics]
                .sort((a, b) => b.misrouted - a.misrouted)
                .map((t) => ({ key: t.label, label: t.label, value: t.misrouted }))}
              valueLabel={(v) => formatPercent(v)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {d.findings.map((f) => (
              <li key={f} className="flex gap-3 text-body text-text">
                <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-primary" />
                <span className="prose-width">{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-small text-text-subtle">
        This sample report was prepared from anonymised demo data. A live report uses your own email history.
      </p>
    </div>
  );
}
