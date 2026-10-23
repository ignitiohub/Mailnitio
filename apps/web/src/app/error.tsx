"use client";

import { ErrorState } from "@mailnitio/ui";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="flex min-h-[60dvh] items-center justify-center px-4">
      <ErrorState referenceId={error.digest} onRetry={reset} />
    </main>
  );
}
