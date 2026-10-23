"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Cursor pagination state for list screens. Changing the filters (`base`) returns to the first page.
 * Builds `${base}&limit=..&cursor=..` paths for useApi.
 */
export function usePaged(base: string, initialSize = 25) {
  const [cursors, setCursors] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(initialSize);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the filters change
  useEffect(() => setCursors([]), [base, pageSize]);

  const path = useMemo(() => {
    const cursor = cursors.at(-1);
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  }, [base, cursors, pageSize]);

  return {
    path,
    page: cursors.length + 1,
    pageSize,
    setPageSize,
    hasPrevious: cursors.length > 0,
    next: (cursor: string | null | undefined) => cursor && setCursors((c) => [...c, cursor]),
    previous: () => setCursors((c) => c.slice(0, -1)),
  };
}

/** Build a query string from defined, non-empty values. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
