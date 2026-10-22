"use client";

import { Banner, Button, Field, Input } from "@mailnitio/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    token ? null : "This link is invalid or has expired. Request a new one.",
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setSubmitting(false);
    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    router.push("/login");
  }

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link href="/forgot-password" className="text-primary hover:underline">
          Request a new link
        </Link>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="New password" helper="At least 10 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? <Banner tone="danger" title={error} /> : null}
        <Button type="submit" size="lg" loading={submitting} disabled={!token} className="w-full">
          Save password
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
