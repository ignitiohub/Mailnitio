"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Rendered when the root layout itself fails, so it cannot rely on the app's CSS or components.
export default function GlobalError({
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
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
        <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
        <p>Mailnitio could not load. Try again, and contact support if it keeps happening.</p>
        {error.digest ? <p>Reference: {error.digest}</p> : null}
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
