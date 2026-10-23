"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "./api";

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  refetch: () => void;
}

/** Minimal GET hook: loading, error and data for one endpoint; refetches when the path changes. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [nonce, setNonce] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!path) return;
    const request = ++current.current;
    setLoading(true);
    setError(null);
    apiFetch<T>(path)
      .then((result) => {
        if (request === current.current) setData(result);
      })
      .catch((err: unknown) => {
        if (request !== current.current) return;
        setError(err instanceof ApiError ? err : new ApiError(0, "internal_error", "Something went wrong."));
      })
      .finally(() => {
        if (request === current.current) setLoading(false);
      });
  }, [path, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, refetch };
}
