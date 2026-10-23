"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "./api";

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  /** True only while there is nothing to show yet (first load or a new path). */
  loading: boolean;
  /** A background refresh is in flight. */
  refreshing: boolean;
  refetch: () => void;
  /** Replace the cached data, e.g. for optimistic updates. */
  mutate: (updater: (current: T | null) => T | null) => void;
}

/**
 * GET hook: loading, error and data for one endpoint. With `pollMs`, it refreshes in the background
 * without clearing data or showing skeletons, and pauses while the tab is hidden.
 */
export function useApi<T>(path: string | null, options: { pollMs?: number } = {}): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const current = useRef(0);
  const lastPath = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce triggers a refetch on purpose
  useEffect(() => {
    if (!path) return;
    const request = ++current.current;
    const background = lastPath.current === path;
    lastPath.current = path;
    if (background) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }
    apiFetch<T>(path)
      .then((result) => {
        if (request !== current.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (request !== current.current) return;
        // A failed background refresh keeps showing the last good data.
        if (!background)
          setError(
            err instanceof ApiError ? err : new ApiError(0, "internal_error", "Something went wrong."),
          );
      })
      .finally(() => {
        if (request !== current.current) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, [path, nonce]);

  useEffect(() => {
    if (!path || !options.pollMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setNonce((n) => n + 1);
    }, options.pollMs);
    return () => window.clearInterval(timer);
  }, [path, options.pollMs]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((updater: (c: T | null) => T | null) => setData((c) => updater(c)), []);
  return { data, error, loading, refreshing, refetch, mutate };
}

/**
 * Ids that appeared since the previous poll (for the subtle "new" highlight). The first load highlights
 * nothing.
 */
export function useNewIds(ids: string[] | undefined): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const key = ids?.join(",") ?? "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the joined ids
  useEffect(() => {
    if (!ids) return;
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !seen.current?.has(id));
    for (const id of ids) seen.current.add(id);
    if (added.length > 0) {
      setFresh(new Set(added));
      const timer = window.setTimeout(() => setFresh(new Set()), 1600);
      return () => window.clearTimeout(timer);
    }
  }, [key]);
  return fresh;
}

export const POLL_MS = 5000;
