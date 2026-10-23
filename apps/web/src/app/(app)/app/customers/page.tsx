"use client";

import { Button, DataTable, formatNumber, PageHeader } from "@mailnitio/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { Contact, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { When } from "@/components/helpdesk/display";
import { useApi } from "@/lib/use-api";
import { query, usePaged } from "@/lib/use-paged";

interface CustomerRow {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  ticketCount: number;
  openCount: number;
  lastContactAt: string | null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const paged = usePaged(`/v1/customers${query({ q })}`);
  const { data, error, loading, refetch } = useApi<{ data: CustomerRow[]; nextCursor: string | null }>(
    paged.path,
  );
  const rows = data?.data ?? [];

  const columns: ColumnDef<CustomerRow, unknown>[] = [
    {
      id: "customer",
      header: "Customer",
      enableHiding: false,
      meta: { mobile: "title", label: "Customer" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-text">{row.original.name ?? row.original.email}</span>
          <span className="truncate text-small text-text-muted">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "company",
      header: "Company",
      meta: { mobile: "meta", label: "Company" },
      cell: ({ row }) => row.original.company ?? <span className="text-text-subtle">None</span>,
    },
    {
      id: "tickets",
      header: "Tickets",
      meta: { align: "right", mobile: "meta", label: "Tickets" },
      cell: ({ row }) => <span className="tabular">{formatNumber(row.original.ticketCount)}</span>,
    },
    {
      id: "open",
      header: "Open",
      meta: { align: "right", mobile: "hidden", label: "Open" },
      cell: ({ row }) => <span className="tabular">{formatNumber(row.original.openCount)}</span>,
    },
    {
      id: "last",
      header: "Last contact",
      meta: { align: "right", mobile: "meta", label: "Last contact" },
      cell: ({ row }) =>
        row.original.lastContactAt ? (
          <When at={row.original.lastContactAt} className="text-small text-text-muted" />
        ) : (
          <span className="text-text-subtle">None</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Customers" description="The people who email you, with their ticket history." />
      <DataTable
        caption="Customers"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        loading={loading}
        error={error ? { message: error.message, referenceId: error.referenceId, onRetry: refetch } : null}
        empty={{
          icon: Contact,
          title: q ? "No customers match this search" : "No customers yet",
          description: q
            ? "Search by another name, email or company."
            : "Customers are created automatically from the emails Mailnitio processes.",
          action: q ? (
            <Button variant="secondary" onClick={() => setSearch("")}>
              Clear search
            </Button>
          ) : undefined,
        }}
        onRowClick={(row) => router.push(`/app/customers/${row.id}`)}
        filters={
          <label className="relative w-full sm:max-w-80">
            <span className="sr-only">Search customers</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.75] text-text-subtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or company"
              className="h-9 w-full rounded-control border border-border-strong bg-surface pr-3 pl-9 text-body text-text max-md:h-11"
            />
          </label>
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
