"use client";

import { Banner, Button, Field, Input } from "@mailnitio/ui";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(10, "Use at least 10 characters").max(128, "Use at most 128 characters"),
});
type Values = z.infer<typeof schema>;

export default function SignupPage() {
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const check = (name: keyof Values) => {
    const result = schema.shape[name].safeParse(values[name]);
    setErrors((e) => ({ ...e, [name]: result.success ? undefined : result.error.issues[0]?.message }));
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Values] ??= issue.message;
      setErrors(next);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const { error } = await authClient.signUp.email({ ...parsed.data, callbackURL: "/onboarding" });
    setSubmitting(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        description={
          <>
            We sent a verification link to <span className="font-medium text-text">{sentTo}</span>. Open it to
            finish creating your workspace. The link expires in 24 hours.
          </>
        }
        footer={
          <>
            Wrong address?{" "}
            <button
              type="button"
              className="cursor-pointer text-primary hover:underline"
              onClick={() => setSentTo(null)}
            >
              Start again
            </button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-card bg-primary-soft p-4 text-body text-text">
          <MailCheck aria-hidden className="size-5 shrink-0 stroke-[1.75] text-primary" />
          Not there? Check your spam or junk folder.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your workspace"
      description="Set up Mailnitio for your team. You can invite colleagues later."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Full name" required error={errors.name}>
          <Input
            autoComplete="name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            onBlur={() => check("name")}
          />
        </Field>
        <Field label="Work email" required error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            onBlur={() => check("email")}
          />
        </Field>
        <Field label="Password" required helper="At least 10 characters." error={errors.password}>
          <Input
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            onBlur={() => check("password")}
          />
        </Field>
        {formError ? <Banner tone="danger" title={formError} /> : null}
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Create workspace
        </Button>
        <p className="text-small text-text-subtle">
          By creating a workspace you agree to our{" "}
          <Link href="/legal/terms" className="text-primary hover:underline">
            terms of service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
