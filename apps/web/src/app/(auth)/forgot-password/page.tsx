"use client";

import { Banner, Button, Field, Input } from "@mailnitio/ui";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    // Same response whether or not the account exists, so addresses cannot be probed.
    setSubmitting(false);
    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      description={
        sent
          ? `If an account exists for ${email}, we have sent a link to reset the password. The link expires in 1 hour.`
          : "Enter your email and we will send you a link to choose a new password."
      }
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? null : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email" error={error}>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      {sent ? <Banner tone="info" title="Check your inbox and spam folder." /> : null}
    </AuthCard>
  );
}
