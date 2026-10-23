"use client";

import { Card, EmptyState, ErrorState, formatDateTime, formatNumber, KpiCard, Skeleton } from "@mailnitio/ui";
import { ArrowLeft, Inbox, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PriorityBadge, TicketKey, TicketStatusChip, When } from "@/components/helpdesk/display";
import { useLookups } from "@/components/helpdesk/lookups";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  identifiers: Record<string, string>;
  createdAt: string;
  aliases: string[];
  emailCount: number;
  firstContactAt: string | null;
  tickets: {
    id: string;
    key: string;
    subject: string;
    status: string;
    priority: string;
    category: string | null;
    teamName: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
}

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const { categoryLabel } = useLookups();
  const customer = useApi<{ data: CustomerDetail }>(`/v1/customers/${id}`);
  const c = customer.data?.data;

  if (customer.loading && !c) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading customer">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }
  if (customer.error || !c) {
    return customer.error?.status === 404 ? (
      <ErrorState
        title="Customer not found"
        description="Go back to the customer list and search for them."
      />
    ) : (
      <ErrorState referenceId={customer.error?.referenceId} onRetry={customer.refetch} />
    );
  }

  const open = c.tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length;
  const identifiers = Object.entries(c.identifiers ?? {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/app/customers"
          className="inline-flex w-fit items-center gap-1.5 text-small text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Customers
        </Link>
        <h1 className="text-h2 break-words text-text md:text-h1">{c.name ?? c.email}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-body text-text-muted">
          <span className="flex items-center gap-1.5 break-all">
            <Mail aria-hidden className="size-4 shrink-0" />
            {c.email}
          </span>
          {c.phone ? (
            <span className="flex items-center gap-1.5">
              <Phone aria-hidden className="size-4" />
              {c.phone}
            </span>
          ) : null}
          {c.company ? <span>{c.company}</span> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Tickets" value={formatNumber(c.tickets.length)} />
        <KpiCard label="Open tickets" value={formatNumber(open)} />
        <KpiCard label="Emails received" value={formatNumber(c.emailCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-h4 text-text">Tickets</h2>
          {c.tickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No tickets yet"
              description="Tickets for this customer appear here."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {c.tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/app/tickets/${t.id}`}
                    className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <TicketKey value={t.key} />
                    <span className="min-w-0 flex-1 truncate text-body text-text">{t.subject}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-small text-text-muted">
                        {t.category ? categoryLabel(t.category) : (t.teamName ?? "")}
                      </span>
                      <PriorityBadge priority={t.priority} />
                      <TicketStatusChip status={t.status} />
                      <When at={t.updatedAt} className="text-small text-text-subtle" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex flex-col gap-3 self-start p-4">
          <h2 className="text-h4 text-text">Profile</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
            <dt className="text-text-muted">Customer since</dt>
            <dd className="text-right text-text tabular">
              {formatDateTime(c.createdAt, me.workspace.timezone)}
            </dd>
            <dt className="text-text-muted">First email</dt>
            <dd className="text-right text-text tabular">
              {c.firstContactAt ? formatDateTime(c.firstContactAt, me.workspace.timezone) : "None"}
            </dd>
            {identifiers.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-text-muted capitalize">{k.replaceAll("_", " ")}</dt>
                <dd className="text-right font-mono text-text">{v}</dd>
              </div>
            ))}
          </dl>
          {c.aliases.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <p className="text-overline text-text-subtle uppercase">Other addresses</p>
              <ul className="flex flex-col gap-0.5 text-small text-text">
                {c.aliases.map((a) => (
                  <li key={a} className="break-all">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
