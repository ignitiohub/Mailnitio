"use client";

import {
  Button,
  DataTable,
  FilterChip,
  PageHeader,
  Select,
  toast,
  cn,
} from "@mailnitio/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { Inbox, Search, ShieldAlert, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useShortcut } from "@/components/app/shortcuts";
import {
  canWork,
  PRIORITY_LABELS,
  PriorityBadge,
  SlaTimer,
  TICKET_STATUS_LABELS,
  TicketKey,
  TicketStatusChip,
  When,
} from "@/components/helpdesk/display";
import { useLookups } from "@/components/helpdesk/lookups";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/lib/me";
import { POLL_MS, useApi, useNewIds } from "@/lib/use-api";
import { query, usePaged } from "@/lib/use-paged";

interface TicketRow {
  id: string;
  key: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  escalated: boolean;
  needsReview: boolean;
  customerName: string | null;
  customerEmail: string | null;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  firstResponseDue: string | null;
  firstRespondedAt: string | null;
  updatedAt: string;
}

const VIEWS = [
  { id: "mine", label: "My tickets" },
  { id: "unassigned", label: "Unassigned" },
  { id: "team", label: "Team queues" },
  { id: "escalations", label: "Escalations" },
  { id: "needs_review", label: "Needs review" },
  { id: "all", label: "All" },
] as const;
type View = (typeof VIEWS)[number]["id"];

function TicketsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { me } = useMe();
  const { teams, members } = useLookups();
  const view = (VIEWS.find((v) => v.id === params.get("view"))?.id ?? "all") as View;
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [teamId, setTeamId] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<number>(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const paged = usePaged(`/v1/tickets${query({ view, status, priority, teamId, q })}`);
  const { data, error, loading, refetch } = useApi<{ data: TicketRow[]; nextCursor: string | null }>(paged.path, { pollMs: POLL_MS });
  const counts = useApi<{ data: Record<string, number> }>("/v1/tickets/counts", { pollMs: POLL_MS });
  const rows = data?.data ?? [];
  const fresh = useNewIds(data ? rows.map((r) => r.id) : undefined);
  const workable = canWork(me.role);

  useEffect(() => setActive(-1), [paged.path]);
  useShortcut("j", () => setActive((a) => Math.min(rows.length - 1, a + 1)));
  useShortcut("k", () => setActive((a) => Math.max(0, a - 1)));
  useShortcut("Enter", () => {
    const row = rows[active];
    if (row) router.push(`/app/tickets/${row.id}`);
  });
  useShortcut("e", () => {
    const row = rows[active];
    if (row && workable) void bulk([row.id], { assigneeId: me.user.id }, `${row.key} assigned to you`);
  });

  function setView(next: View) {
    router.replace(`/app/tickets?view=${next}`);
  }

  async function bulk(ids: string[], patch: Record<string, unknown>, message: string, clear?: () => void) {
    try {
      await apiFetch("/v1/tickets/bulk", { method: "POST", json: { ids, patch } });
      toast.success(message);
      clear?.();
      refetch();
      counts.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update tickets", {
        description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
      });
    }
  }

  const columns: ColumnDef<TicketRow, unknown>[] = [
    {
      id: "key",
      header: "Ticket",
      meta: { mobile: "meta", label: "Ticket" },
      cell: ({ row }) => <TicketKey value={row.original.key} />,
    },
    {
      id: "subject",
      header: "Subject",
      enableHiding: false,
      meta: { mobile: "title", label: "Subject" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 truncate font-medium text-text">
            {row.original.escalated ? <ShieldAlert aria-label="Escalated" className="size-4 shrink-0 stroke-[1.75] text-danger" /> : null}
            {row.original.needsReview ? <Wand2 aria-label="Needs review" className="size-4 shrink-0 stroke-[1.75] text-warning" /> : null}
            <span className="truncate">{row.original.subject}</span>
          </span>
          <span className="truncate text-small text-text-muted">{row.original.customerName ?? row.original.customerEmail ?? "Unknown sender"}</span>
        </div>
      ),
    },
    { id: "team", header: "Team", meta: { mobile: "meta", label: "Team" }, cell: ({ row }) => row.original.teamName ?? "No team" },
    {
      id: "assignee",
      header: "Assignee",
      meta: { mobile: "hidden", label: "Assignee" },
      cell: ({ row }) => row.original.assigneeName ?? <span className="text-text-subtle">Unassigned</span>,
    },
    { id: "priority", header: "Priority", meta: { mobile: "hidden", label: "Priority" }, cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
    { id: "status", header: "Status", meta: { mobile: "status", label: "Status" }, cell: ({ row }) => <TicketStatusChip status={row.original.status} /> },
    {
      id: "sla",
      header: "SLA",
      meta: { mobile: "meta", label: "First response" },
      cell: ({ row }) => <SlaTimer due={row.original.firstResponseDue} respondedAt={row.original.firstRespondedAt} status={row.original.status} />,
    },
    {
      id: "updated",
      header: "Updated",
      meta: { align: "right", mobile: "hidden", label: "Updated" },
      cell: ({ row }) => <When at={row.original.updatedAt} className="text-small text-text-muted" />,
    },
  ];

  const viewLabel = VIEWS.find((v) => v.id === view)?.label ?? "All";
  const countKey = (id: View) => (id === "all" ? "all" : id);
  const chips = [
    status ? { label: "Status", value: TICKET_STATUS_LABELS[status] ?? status, clear: () => setStatus("") } : null,
    priority ? { label: "Priority", value: PRIORITY_LABELS[priority] ?? priority, clear: () => setPriority("") } : null,
    teamId ? { label: "Team", value: teams.find((t) => t.id === teamId)?.name ?? "Team", clear: () => setTeamId("") } : null,
  ].filter(Boolean) as { label: string; value: string; clear: () => void }[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tickets" description="Customer emails turned into tickets and routed to your teams. Press j and k to move, Enter to open." />

      <nav aria-label="Ticket views" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-1 border-b border-border">
          {VIEWS.map((v) => {
            const n = counts.data?.data[countKey(v.id)];
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-current={view === v.id ? "page" : undefined}
                  className={cn(
                    "flex h-11 cursor-pointer items-center gap-2 border-b-2 px-3 text-body whitespace-nowrap transition-colors duration-150",
                    view === v.id ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text",
                  )}
                >
                  {v.label}
                  {n !== undefined ? <span className="rounded-full bg-surface-2 px-2 text-caption text-text-muted tabular">{n}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <DataTable
        caption={`${viewLabel} tickets`}
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        loading={loading}
        activeRowId={rows[active]?.id ?? null}
        highlightIds={fresh}
        error={error ? { message: error.message, referenceId: error.referenceId, onRetry: refetch } : null}
        empty={{
          icon: Inbox,
          title: q || chips.length ? "No tickets match these filters" : `No tickets in ${viewLabel.toLowerCase()}`,
          description: q || chips.length ? "Clear a filter or search for something else." : "New tickets appear here as emails are processed.",
          action:
            q || chips.length ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPriority("");
                  setTeamId("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined,
        }}
        onRowClick={(row) => router.push(`/app/tickets/${row.id}`)}
        filters={
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-56 flex-1 sm:max-w-80">
                <span className="sr-only">Search tickets</span>
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.75] text-text-subtle" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by MN number, subject or customer"
                  className="h-9 w-full rounded-control border border-border-strong bg-surface pr-3 pl-9 text-body text-text max-md:h-11"
                />
              </label>
              <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
                <option value="">Any status</option>
                {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-36">
                <option value="">Any priority</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select aria-label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-44">
                <option value="">{view === "team" ? "My teams" : "Any team"}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            {chips.length ? (
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <FilterChip key={c.label} label={c.label} value={c.value} onRemove={c.clear} />
                ))}
              </div>
            ) : null}
          </div>
        }
        bulkActions={
          workable
            ? (ids, clear) => (
                <>
                  <Button size="sm" variant="secondary" onClick={() => void bulk(ids, { assigneeId: me.user.id }, `${ids.length} assigned to you`, clear)}>
                    Assign to me
                  </Button>
                  <Select
                    aria-label="Assign selected to"
                    className="h-8 w-44"
                    value=""
                    onChange={(e) => {
                      const m = members.find((x) => x.userId === e.target.value);
                      if (m) void bulk(ids, { assigneeId: m.userId }, `${ids.length} assigned to ${m.name}`, clear);
                    }}
                  >
                    <option value="">Assign to…</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Set status of selected"
                    className="h-8 w-40"
                    value=""
                    onChange={(e) => e.target.value && void bulk(ids, { status: e.target.value }, `${ids.length} set to ${TICKET_STATUS_LABELS[e.target.value]}`, clear)}
                  >
                    <option value="">Set status…</option>
                    {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Set priority of selected"
                    className="h-8 w-36"
                    value=""
                    onChange={(e) => e.target.value && void bulk(ids, { priority: e.target.value }, `${ids.length} set to ${PRIORITY_LABELS[e.target.value]}`, clear)}
                  >
                    <option value="">Set priority…</option>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </>
              )
            : undefined
        }
        pagination={{
          pageSize: paged.pageSize,
          onPageSizeChange: paged.setPageSize,
          hasPrevious: paged.hasPrevious,
          hasNext: Boolean(data?.nextCursor),
          onNext: () => paged.next(data?.nextCursor),
          onPrevious: paged.previous,
          summary: `Page ${paged.page}`,
        }}
      />
      {view === "team" && teams.length > 0 && !teamId ? (
        <p className="text-small text-text-subtle">
          Showing tickets for the teams you belong to. <Link href="/app/teams" className="text-primary hover:underline">Manage teams</Link>
        </p>
      ) : null}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense>
      <TicketsScreen />
    </Suspense>
  );
}
