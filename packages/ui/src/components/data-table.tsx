"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  type LucideIcon,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Skeleton } from "./skeleton";
import { EmptyState, ErrorState } from "./states";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
    /** Shown on the mobile stacked card. The first column is always shown as the card title. */
    mobile?: "title" | "meta" | "status" | "hidden";
    label?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId: (row: T) => string;
  /** Server-driven state */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  loading?: boolean;
  error?: { message?: string; referenceId?: string; onRetry?: () => void } | null;
  empty?: { icon: LucideIcon; title: string; description: string; action?: ReactNode };
  /** Cursor pagination */
  pagination?: {
    pageSize: number;
    pageSizes?: number[];
    onPageSizeChange?: (size: number) => void;
    hasNext: boolean;
    hasPrevious: boolean;
    onNext: () => void;
    onPrevious: () => void;
    summary?: string;
  };
  /** Enables row selection and shows the bulk-action bar when rows are selected. */
  bulkActions?: (selectedIds: string[], clear: () => void) => ReactNode;
  filters?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Row ids to highlight briefly (new rows from live updates). */
  highlightIds?: ReadonlySet<string>;
  /** Row focused with keyboard navigation (j/k): outlined and scrolled into view. */
  activeRowId?: string | null;
  caption: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  sorting,
  onSortingChange,
  loading,
  error,
  empty,
  pagination,
  bulkActions,
  filters,
  onRowClick,
  highlightIds,
  activeRowId,
  caption,
}: DataTableProps<T>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const selectable = Boolean(bulkActions);
  const allColumns: ColumnDef<T, unknown>[] = selectable
    ? [
        {
          id: "__select",
          enableSorting: false,
          enableHiding: false,
          meta: { mobile: "hidden" },
          header: ({ table }) => (
            <input
              type="checkbox"
              aria-label="Select all rows on this page"
              className="size-4 cursor-pointer accent-[var(--primary)]"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected();
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              aria-label="Select row"
              className="size-4 cursor-pointer accent-[var(--primary)]"
              checked={row.getIsSelected()}
              onClick={(e) => e.stopPropagation()}
              onChange={row.getToggleSelectedHandler()}
            />
          ),
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: { sorting: sorting ?? [], rowSelection, columnVisibility },
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: selectable,
    onSortingChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const clearSelection = () => setRowSelection({});
  const visibleColumns = table.getVisibleLeafColumns();
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());

  let body: ReactNode;
  if (error) {
    body = <ErrorState description={error.message} referenceId={error.referenceId} onRetry={error.onRetry} />;
  } else if (!loading && data.length === 0 && empty) {
    body = <EmptyState {...empty} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {filters || hideable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">{filters}</div>
          {hideable.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="max-md:hidden">
                  <Columns3 aria-hidden />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                {hideable.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      column.toggleVisibility();
                    }}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      tabIndex={-1}
                      aria-hidden
                      checked={column.getIsVisible()}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {column.columnDef.meta?.label ?? column.id}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}

      {selectable && selectedIds.length > 0 ? (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-2 rounded-card border border-primary/30 bg-primary-soft px-3 py-2"
        >
          <span className="text-body font-medium text-text tabular">{selectedIds.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions?.(selectedIds, clearSelection)}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearSelection}>
            <X aria-hidden />
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {body ?? (
          <>
            {/* Desktop and tablet: table. The table scrolls inside its own region, never the page. */}
            <div className="overflow-x-auto max-md:hidden">
              <table className="w-full border-collapse text-body">
                <caption className="sr-only">{caption}</caption>
                <thead className="sticky top-0 z-10 bg-surface-2">
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => {
                        const align = header.column.columnDef.meta?.align;
                        const sorted = header.column.getIsSorted();
                        const canSort = header.column.getCanSort() && Boolean(onSortingChange);
                        return (
                          <th
                            key={header.id}
                            scope="col"
                            aria-sort={
                              sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                            }
                            className={cn(
                              "h-10 border-b border-border px-4 text-caption whitespace-nowrap text-text-muted",
                              align === "right" ? "text-right" : "text-left",
                              header.column.id === "__select" && "w-10 pr-0",
                            )}
                          >
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-1 rounded-control hover:text-text",
                                  align === "right" && "flex-row-reverse",
                                )}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {sorted === "asc" ? (
                                  <ArrowUp aria-hidden className="size-3.5" />
                                ) : sorted === "desc" ? (
                                  <ArrowDown aria-hidden className="size-3.5" />
                                ) : (
                                  <ArrowUpDown aria-hidden className="size-3.5 opacity-50" />
                                )}
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }, (_, i) => (
                        <tr
                          key={`skeleton-${i}`}
                          className="h-[var(--row-height)] border-b border-border last:border-0"
                        >
                          {visibleColumns.map((column) => (
                            <td key={column.id} className="px-4">
                              <Skeleton className="h-4 w-full max-w-40" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          data-state={row.getIsSelected() ? "selected" : undefined}
                          aria-current={activeRowId === row.id ? "true" : undefined}
                          ref={
                            activeRowId === row.id
                              ? (el) => el?.scrollIntoView({ block: "nearest" })
                              : undefined
                          }
                          onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                          className={cn(
                            "h-[var(--row-height)] border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface-2",
                            "data-[state=selected]:bg-primary-soft",
                            onRowClick && "cursor-pointer",
                            highlightIds?.has(row.id) && "animate-row-highlight",
                            activeRowId === row.id &&
                              "bg-surface-2 outline-2 -outline-offset-2 outline-primary",
                          )}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const align = cell.column.columnDef.meta?.align;
                            return (
                              <td
                                key={cell.id}
                                className={cn(
                                  "max-w-80 truncate px-4",
                                  align === "right" && "text-right tabular",
                                  cell.column.id === "__select" && "w-10 pr-0",
                                )}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards with key fields, status chip and chevron. */}
            <ul className="divide-y divide-border md:hidden">
              {loading
                ? Array.from({ length: 4 }, (_, i) => (
                    <li key={`skeleton-${i}`} className="flex flex-col gap-2 p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </li>
                  ))
                : table.getRowModel().rows.map((row) => {
                    const cells = row
                      .getVisibleCells()
                      .filter((c) => c.column.columnDef.meta?.mobile !== "hidden");
                    const title = cells.find((c) => c.column.columnDef.meta?.mobile === "title") ?? cells[0];
                    const status = cells.find((c) => c.column.columnDef.meta?.mobile === "status");
                    const meta = cells.filter((c) => c.column.columnDef.meta?.mobile === "meta");
                    const content = (
                      <>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 truncate text-body font-medium text-text">
                              {title ? flexRender(title.column.columnDef.cell, title.getContext()) : null}
                            </div>
                            {status ? flexRender(status.column.columnDef.cell, status.getContext()) : null}
                          </div>
                          {meta.length > 0 ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-small text-text-muted">
                              {meta.map((cell) => (
                                <span key={cell.id} className="truncate">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {onRowClick ? (
                          <ChevronRight aria-hidden className="size-4 shrink-0 text-text-subtle" />
                        ) : null}
                      </>
                    );
                    return (
                      <li key={row.id} className={cn(highlightIds?.has(row.id) && "animate-row-highlight")}>
                        {onRowClick ? (
                          <button
                            type="button"
                            onClick={() => onRowClick(row.original)}
                            className="flex min-h-11 w-full cursor-pointer items-center gap-3 p-4 text-left hover:bg-surface-2"
                          >
                            {content}
                          </button>
                        ) : (
                          <div className="flex min-h-11 items-center gap-3 p-4">{content}</div>
                        )}
                      </li>
                    );
                  })}
            </ul>
          </>
        )}
      </div>

      {pagination && !error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-small text-text-muted">
          <div className="flex items-center gap-2">
            {pagination.summary ? <span className="tabular">{pagination.summary}</span> : null}
            {pagination.onPageSizeChange ? (
              <label className="flex items-center gap-2 max-sm:hidden">
                Rows per page
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="h-8 cursor-pointer rounded-control border border-border-strong bg-surface px-2 text-small text-text"
                >
                  {(pagination.pageSizes ?? [25, 50, 100]).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={pagination.onPrevious}
              disabled={!pagination.hasPrevious || loading}
              className="max-md:h-11"
            >
              <ChevronLeft aria-hidden />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={pagination.onNext}
              disabled={!pagination.hasNext || loading}
              className="max-md:h-11"
            >
              Next
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Removable filter chip shown above tables. */
export function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface pr-1 pl-3 text-small text-text">
      <span className="text-text-muted">{label}:</span> {value}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}: ${value}`}
        className="flex size-6 cursor-pointer items-center justify-center rounded-full text-text-subtle hover:bg-surface-2 hover:text-text"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}
