"use client";

import { Banner, Button, Field, Input } from "@mailnitio/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

function safeNext(next: string | null): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("verified") === "false"
      ? "That verification link has expired. Sign in to get a new one."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/app",
    });
    if (signInError) {
      setSubmitting(false);
      setError(authErrorMessage(signInError));
      return;
    }
    // When TOTP is enabled, the client plugin redirects to /login/verify.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return;
    router.push(safeNext(params.get("next")));
  }

  return (
    <AuthCard
      title="Sign in to Mailnitio"
      footer={
        <>
          New to Mailnitio?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Link href="/forgot-password" className="-mt-2 self-end text-small text-primary hover:underline">
          Forgot password?
        </Link>
        {error ? <Banner tone="danger" title={error} /> : null}
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
