"use client";

import { ErrorState, Skeleton } from "@mailnitio/ui";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { type Me, MeProvider } from "@/lib/me";
import { useApi } from "@/lib/use-api";

/**
 * Loads /v1/me and sends the user where they need to be: sign in, two-factor setup, onboarding, or the app.
 */
export function SessionGate({
  children,
  requireOnboarded,
}: {
  children: ReactNode;
  requireOnboarded: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, loading, refetch } = useApi<{ data: Me }>("/v1/me");
  const me = data?.data;

  const redirect = (() => {
    if (error?.status === 401) return `/login?next=${encodeURIComponent(pathname)}`;
    if (!me) return null;
    if (me.mfaRequired) return "/setup-2fa";
    if (requireOnboarded && !me.workspace.onboardedAt) return "/onboarding";
    if (!requireOnboarded && me.workspace.onboardedAt) return "/app";
    return null;
  })();

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (loading || redirect) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-bg"
        role="status"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="flex w-full max-w-md flex-col gap-3 px-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <ErrorState
          description={error?.message ?? "We could not load your workspace."}
          referenceId={error?.referenceId}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <MeProvider me={me} refresh={refetch}>
      {children}
    </MeProvider>
  );
}
