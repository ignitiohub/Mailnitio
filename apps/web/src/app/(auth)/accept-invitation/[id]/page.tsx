"use client";

import { Banner, Button, Skeleton } from "@mailnitio/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export default function AcceptInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const next = encodeURIComponent(`/accept-invitation/${id}`);

  async function accept() {
    setAccepting(true);
    setError(null);
    const { error: acceptError } = await authClient.organization.acceptInvitation({ invitationId: id });
    if (acceptError) {
      setAccepting(false);
      setError(
        acceptError.status === 400 || acceptError.status === 404
          ? "This invitation is no longer valid. Ask for a new one."
          : authErrorMessage(acceptError),
      );
      return;
    }
    router.replace("/app");
  }

  if (session.isPending) {
    return (
      <AuthCard title="Join workspace">
        <Skeleton className="h-10 w-full" />
      </AuthCard>
    );
  }

  if (!session.data) {
    return (
      <AuthCard
        title="Join your team on Mailnitio"
        description="Sign in or create an account with the email address the invitation was sent to."
      >
        <div className="flex flex-col gap-2">
          <Button asChild size="lg">
            <Link href={`/login?next=${next}`}>Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Create an account</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Join workspace"
      description={`You are signed in as ${session.data.user.email}. Accept the invitation to join the workspace.`}
    >
      {error ? <Banner tone="danger" title={error} /> : null}
      <Button size="lg" loading={accepting} onClick={() => void accept()} className="w-full">
        Accept invitation
      </Button>
    </AuthCard>
  );
}
