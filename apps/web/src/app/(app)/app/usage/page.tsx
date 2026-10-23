"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  formatNumber,
  KpiCard,
  KpiCardSkeleton,
  PageHeader,
  Select,
  Skeleton,
  StackedBarChart,
} from "@mailnitio/ui";
import { useState } from "react";
import { formatUsd } from "@/components/helpdesk/display";
import { useApi } from "@/lib/use-api";

interface Usage {
  timezone: string;
  days: { day: string; emails: number; tickets: number; acks: number; cost: number; tokens: number }[];
  monthToDate: { emails: number; cost: number; tokens: number; runs: number };
  byModel: { model: string; provider: string; runs: number; cost: number }[];
}

function dayLabel(day: string, style: "short" | "long") {
  return new Intl.DateTimeFormat(
    "en-GB",
    style === "short"
      ? { day: "numeric", month: "short", timeZone: "UTC" }
      : { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
  ).format(new Date(`${day}T12:00:00Z`));
}

export default function UsagePage() {
  const [days, setDays] = useState(30);
  const usage = useApi<{ data: Usage }>(`/v1/usage?days=${days}`);
  const u = usage.data?.data;
  const totals = u?.days.reduce(
    (acc, d) => ({
      emails: acc.emails + d.emails,
      tickets: acc.tickets + d.tickets,
      acks: acc.acks + d.acks,
      cost: acc.cost + d.cost,
    }),
    { emails: 0, tickets: 0, acks: 0, cost: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage"
        description="Emails processed, AI runs and their cost. Days follow the workspace timezone."
        actions={
          <Select
            aria-label="Period"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-40"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />

      {usage.error ? (
        <ErrorState referenceId={usage.error.referenceId} onRetry={usage.refetch} />
      ) : !u || !totals ? (
        <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading usage">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      ) : (
        <>
          <section aria-label="This month" className="flex flex-col gap-3">
            <h2 className="text-overline text-text-subtle uppercase">Month to date</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Emails processed" value={formatNumber(u.monthToDate.emails)} />
              <KpiCard
                label="AI cost"
                value={formatUsd(u.monthToDate.cost)}
                context="Model usage billed at cost"
              />
              <KpiCard label="AI runs" value={formatNumber(u.monthToDate.runs)} />
              <KpiCard label="Tokens" value={formatNumber(u.monthToDate.tokens)} />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Emails processed per day</CardTitle>
              <p className="text-small text-text-muted tabular">
                {formatNumber(totals.emails)} emails · {formatNumber(totals.tickets)} tickets created ·{" "}
                {formatNumber(totals.acks)} acknowledgements in the last {days} days
              </p>
            </CardHeader>
            <CardContent>
              <StackedBarChart
                label={`Emails processed per day, last ${days} days`}
                series={[{ key: "emails", label: "Emails processed" }]}
                points={u.days.map((d) => ({
                  label: dayLabel(d.day, "short"),
                  detail: dayLabel(d.day, "long"),
                  values: { emails: d.emails },
                }))}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost by model</CardTitle>
              </CardHeader>
              <CardContent>
                {u.byModel.length === 0 ? (
                  <p className="text-body text-text-muted">No AI runs in this period.</p>
                ) : (
                  <table className="w-full text-small">
                    <caption className="sr-only">AI cost by model, last {days} days</caption>
                    <thead>
                      <tr className="text-left text-text-subtle">
                        <th scope="col" className="pb-2 font-medium">
                          Model
                        </th>
                        <th scope="col" className="pb-2 text-right font-medium">
                          Runs
                        </th>
                        <th scope="col" className="pb-2 text-right font-medium">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.byModel.map((m) => (
                        <tr key={`${m.provider}-${m.model}`} className="border-t border-border">
                          <td className="py-2">
                            <span className="font-mono text-text">{m.model}</span>
                            <span className="block text-caption font-normal text-text-subtle">
                              {m.provider === "simulated"
                                ? "Simulated (demo data, no model called)"
                                : m.provider}
                            </span>
                          </td>
                          <td className="py-2 text-right text-text tabular">{formatNumber(m.runs)}</td>
                          <td className="py-2 text-right text-text tabular">{formatUsd(m.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Daily detail</CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <table className="w-full text-small">
                  <caption className="sr-only">Usage per day</caption>
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-text-subtle">
                      <th scope="col" className="pb-2 font-medium">
                        Day
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">
                        Emails
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">
                        Tickets
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...u.days].reverse().map((d) => (
                      <tr key={d.day} className="border-t border-border">
                        <td className="py-2 text-text">{dayLabel(d.day, "short")}</td>
                        <td className="py-2 text-right text-text tabular">{formatNumber(d.emails)}</td>
                        <td className="py-2 text-right text-text tabular">{formatNumber(d.tickets)}</td>
                        <td className="py-2 text-right text-text tabular">{formatUsd(d.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
