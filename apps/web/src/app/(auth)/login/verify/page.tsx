"use client";

import { Banner, Button, Checkbox, Field, Input } from "@mailnitio/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

/** MFA step after password sign-in: 6-digit TOTP code, or a backup code. */
export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.replace(/\s/g, "");
    if (mode === "totp" && !/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: verifyError } =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice })
        : await authClient.twoFactor.verifyBackupCode({ code: trimmed, trustDevice });
    setSubmitting(false);
    if (verifyError) {
      setError(authErrorMessage(verifyError));
      return;
    }
    router.push("/app");
  }

  return (
    <AuthCard
      title="Two-factor authentication"
      description={
        mode === "totp"
          ? "Enter the 6-digit code from your authenticator app."
          : "Enter one of the backup codes you saved when you set up two-factor authentication."
      }
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={mode === "totp" ? "Authentication code" : "Backup code"}>
          <Input
            autoComplete="one-time-code"
            inputMode={mode === "totp" ? "numeric" : "text"}
            maxLength={mode === "totp" ? 7 : 32}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono tracking-[0.2em] tabular"
            autoFocus
          />
        </Field>
        <Checkbox
          label="Trust this device for 30 days"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
        />
        {error ? <Banner tone="danger" title={error} /> : null}
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Verify
        </Button>
        <button
          type="button"
          className="cursor-pointer self-start text-small text-primary hover:underline"
          onClick={() => {
            setMode(mode === "totp" ? "backup" : "totp");
            setCode("");
            setError(null);
          }}
        >
          {mode === "totp" ? "Use a backup code instead" : "Use your authenticator app instead"}
        </button>
      </form>
    </AuthCard>
  );
}
