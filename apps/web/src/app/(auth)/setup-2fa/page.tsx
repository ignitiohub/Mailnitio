"use client";

import { Banner, Button, Field, Input, Stepper, toast } from "@mailnitio/ui";
import { Copy, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

const STEPS = ["Confirm password", "Scan code", "Save backup codes"];

function secretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export default function SetupTwoFactorPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirmPassword(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: enableError } = await authClient.twoFactor.enable({ password, issuer: "Mailnitio" });
    setSubmitting(false);
    if (enableError || !data || !("totpURI" in data)) {
      setError(
        enableError?.status === 401
          ? "Your session has ended. Sign in again."
          : authErrorMessage(enableError),
      );
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes);
    setStep(1);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code: trimmed });
    setSubmitting(false);
    if (verifyError) {
      setError(authErrorMessage(verifyError));
      return;
    }
    setStep(2);
  }

  const secret = secretFromUri(totpUri);

  return (
    <AuthCard
      title="Set up two-factor authentication"
      description="Two-factor authentication is required for workspace owners and admins. You will need an authenticator app such as Microsoft Authenticator or Google Authenticator."
    >
      <Stepper steps={STEPS} current={step} />

      {step === 0 ? (
        <form noValidate onSubmit={confirmPassword} className="flex flex-col gap-4">
          <Field label="Password" helper="Confirm it is you before changing security settings.">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <Banner tone="danger" title={error} /> : null}
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Continue
          </Button>
        </form>
      ) : null}

      {step === 1 ? (
        <form noValidate onSubmit={verifyCode} className="flex flex-col gap-4">
          <p className="text-body text-text-muted">
            Scan this code with your authenticator app, then enter the 6-digit code it shows.
          </p>
          <div className="flex justify-center rounded-card border border-border bg-white p-4">
            <QRCodeSVG value={totpUri} size={176} title="Authenticator setup code" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-small text-text-muted">Cannot scan? Enter this key instead:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-control bg-surface-2 px-3 py-2 font-mono text-small text-text">
                {secret}
              </code>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy setup key"
                onClick={() => {
                  void navigator.clipboard.writeText(secret);
                  toast.success("Setup key copied");
                }}
              >
                <Copy aria-hidden />
              </Button>
            </div>
          </div>
          <Field label="Authentication code">
            <Input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono tracking-[0.2em] tabular"
            />
          </Field>
          {error ? <Banner tone="danger" title={error} /> : null}
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Verify and turn on
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <Banner tone="warning" title="Save your backup codes">
            Each code works once. Use them if you lose access to your authenticator app. We will not show them
            again.
          </Banner>
          <ul className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface-2 p-4 font-mono text-body text-text">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                void navigator.clipboard.writeText(backupCodes.join("\n"));
                toast.success("Backup codes copied");
              }}
            >
              <Copy aria-hidden />
              Copy
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                const blob = new Blob([`Mailnitio backup codes\n\n${backupCodes.join("\n")}\n`], {
                  type: "text/plain",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mailnitio-backup-codes.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download aria-hidden />
              Download
            </Button>
          </div>
          <Button size="lg" className="w-full" onClick={() => router.push("/app")}>
            I have saved my codes
          </Button>
        </div>
      ) : null}
    </AuthCard>
  );
}
