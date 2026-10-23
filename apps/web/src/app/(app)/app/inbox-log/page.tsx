"use client";

import { Button, ConfidenceBar, cn, DataTable, FilterChip, PageHeader, Select } from "@mailnitio/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useShortcut } from "@/components/app/shortcuts";
import { ACTION_LABELS, canAdmin, EmailChip, TicketKey, When } from "@/components/helpdesk/display";
import { useLookups } from "@/components/helpdesk/lookups";
import { useMe } from "@/lib/me";
import { POLL_MS, useApi, useNewIds } from "@/lib/use-api";
import { query, usePaged } from "@/lib/use-paged";

interface EmailRow {
  id: string;
  receivedAt: string;
  sender: string;
  senderName: string | null;
  subject: string;
  chip: string;
  status: string;
  action: string | null;
  category: string | null;
  confidence: number | null;
  routedTeam: string | null;
  originalTeam: string | null;
  teamName: string | null;
  ticketId: string | null;
  ticketKey: string | null;
  mailbox: string | null;
  skipReason: string | null;
}

const CHIPS = ["Processed", "Rerouted", "Needs Review", "Escalated", "Shadow", "Skipped", "Failed"] as const;

function InboxLogScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { me } = useMe();
  const { config, teams, categoryLabel, teamByKey } = useLookups();
  const chip = CHIPS.find((c) => c === params.get("chip")) ?? "";
  const [category, setCategory] = useState("");
  const [team, setTeam] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const paged = usePaged(`/v1/emails${query({ chip, category, team, q })}`);
  const { data, error, loading, refetch } = useApi<{ data: EmailRow[]; nextCursor: string | null }>(paged.path, { pollMs: POLL_MS });
  const rows = data?.data ?? [];
  const fresh = useNewIds(data ? rows.map((r) => r.id) : undefined);
  const thresholds = config?.thresholds;

  useEffect(() => setActive(-1), [paged.path]);
  useShortcut("j", () => setActive((a) => Math.min(rows.length - 1, a + 1)));
  useShortcut("k", () => setActive((a) => Math.max(0, a - 1)));
  useShortcut("Enter", () => {
    const row = rows[active];
    if (row) router.push(`/app/inbox-log/${row.id}`);
  });

  function setChip(next: string) {
    router.replace(next ? `/app/inbox-log?chip=${encodeURIComponent(next)}` : "/app/inbox-log");
  }

  const columns: ColumnDef<EmailRow, unknown>[] = [
    {
      id: "received",
      header: "Received",
      meta: { mobile: "meta", label: "Received" },
      cell: ({ row }) => <When at={row.original.receivedAt} className="text-small whitespace-nowrap text-text-muted" />,
    },
    {
      id: "email",
      header: "Email",
      enableHiding: false,
      meta: { mobile: "title", label: "Email" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-text">{row.original.subject}</span>
          <span className="truncate text-small text-text-muted">{row.original.senderName ?? row.original.sender}</span>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      meta: { mobile: "meta", label: "Category" },
      cell: ({ row }) =>
        row.original.category ? (
          categoryLabel(row.original.category)
        ) : (
          <span className="text-text-subtle">{row.original.skipReason ? "Not classified" : "None"}</span>
        ),
    },
    {
      id: "confidence",
      header: "Confidence",
      meta: { mobile: "hidden", label: "Confidence" },
      cell: ({ row }) =>
        row.original.confidence !== null ? (
          <ConfidenceBar value={row.original.confidence} high={thresholds?.high} low={thresholds?.low} className="w-32" />
        ) : (
          <span className="text-text-subtle">None</span>
        ),
    },
    {
      id: "team",
      header: "Routed to",
      meta: { mobile: "hidden", label: "Routed to" },
      cell: ({ row }) => {
        const r = row.original;
        if (!r.routedTeam) return <span className="text-text-subtle">None</span>;
        const from = r.originalTeam && r.originalTeam !== r.routedTeam ? teamByKey(r.originalTeam)?.name ?? r.originalTeam : null;
        return (
          <span className="flex flex-col">
            <span>{r.teamName ?? r.routedTeam}</span>
            {from ? <span className="text-small text-text-subtle">from {from}</span> : null}
          </span>
        );
      },
    },
    {
      id: "action",
      header: "Action",
      meta: { mobile: "hidden", label: "Action" },
      cell: ({ row }) => {
        const r = row.original;
        if (r.status === "skipped") return <span className="text-text-muted">{r.skipReason ?? "Skipped"}</span>;
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            {r.action ? ACTION_LABELS[r.action] ?? r.action : <span className="text-text-subtle">None</span>}
            {r.ticketKey ? <TicketKey value={r.ticketKey} /> : null}
          </span>
        );
      },
    },
    { id: "chip", header: "Status", meta: { mobile: "status", label: "Status" }, cell: ({ row }) => <EmailChip chip={row.original.chip} /> },
  ];

  const filtered = Boolean(q || chip || category || team);
  const chips = [
    category ? { label: "Category", value: categoryLabel(category), clear: () => setCategory("") } : null,
    team ? { label: "Team", value: teamByKey(team)?.name ?? team, clear: () => setTeam("") } : null,
  ].filter(Boolean) as { label: string; value: string; clear: () => void }[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inbox log"
        description="Every email Mailnitio has read, with its category, confidence and decision. Updates every few seconds."
        actions={
          canAdmin(me.role) ? (
            <Button asChild variant="secondary">
              <Link href="/app/simulator">
                Send a test email
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-1 border-b border-border">
          {["", ...CHIPS].map((c) => (
            <li key={c || "all"}>
              <button
                type="button"
                onClick={() => setChip(c)}
                aria-current={chip === c ? "page" : undefined}
                className={cn(
                  "flex h-11 cursor-pointer items-center border-b-2 px-3 text-body whitespace-nowrap transition-colors duration-150",
                  chip === c ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {c || "All"}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <DataTable
        caption={chip ? `${chip} emails` : "All emails"}
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        loading={loading}
        activeRowId={rows[active]?.id ?? null}
        highlightIds={fresh}
        error={error ? { message: error.message, referenceId: error.referenceId, onRetry: refetch } : null}
        empty={{
          icon: ScrollText,
          title: filtered ? "No emails match these filters" : "No emails processed yet",
          description: filtered
            ? "Clear a filter or search for something else."
            : "Each email Mailnitio reads appears here with its decision trail.",
          action: filtered ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setCategory("");
                setTeam("");
                setChip("");
              }}
            >
              Clear filters
            </Button>
          ) : undefined,
        }}
        onRowClick={(row) => router.push(`/app/inbox-log/${row.id}`)}
        filters={
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-56 flex-1 sm:max-w-80">
                <span className="sr-only">Search emails</span>
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.75] text-text-subtle" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by sender, subject or MN number"
                  className="h-9 w-full rounded-control border border-border-strong bg-surface pr-3 pl-9 text-body text-text max-md:h-11"
                />
              </label>
              <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
                <option value="">Any category</option>
                {(config?.categories ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Select aria-label="Team" value={team} onChange={(e) => setTeam(e.target.value)} className="w-44">
                <option value="">Any team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.key}>
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
    </div>
  );
}

export default function InboxLogPage() {
  return (
    <Suspense>
      <InboxLogScreen />
    </Suspense>
  );
}
