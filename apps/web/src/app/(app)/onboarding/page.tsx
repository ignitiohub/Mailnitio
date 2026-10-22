"use client";

import { industries, LEAD_COUNTRIES } from "@mailnitio/config";
import { Banner, Button, Card, cn, Field, Input, Select, Stepper } from "@mailnitio/ui";
import { Check, Inbox, Layers, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetch, fieldErrors } from "@/lib/api";
import { canManageWorkspace, useMe } from "@/lib/me";

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
];

const INTERESTS = [
  {
    value: "helpdesk",
    icon: Inbox,
    title: "Helpdesk",
    body: "Route and ticket inbound customer emails with AI.",
  },
  {
    value: "send",
    icon: Send,
    title: "Send",
    body: "Templates, audiences and bulk email.",
  },
  {
    value: "both",
    icon: Layers,
    title: "Both",
    body: "Inbound support and outbound email in one workspace.",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { me } = useMe();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({
    name: me.workspace.name,
    country: me.workspace.country ?? "Nigeria",
    industry: me.workspace.industry ?? "",
    timezone: me.workspace.timezone,
  });
  const [interest, setInterest] = useState<"helpdesk" | "send" | "both" | null>(me.workspace.productInterest);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ message: string; referenceId?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!canManageWorkspace(me.role)) {
    return (
      <Card className="p-6 md:p-8">
        <h1 className="text-h2 text-text">Your workspace is being set up</h1>
        <p className="mt-2 text-body text-text-muted">
          An owner or admin of {me.workspace.name} needs to finish setting up the workspace. Ask them to sign
          in and complete the setup.
        </p>
      </Card>
    );
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (details.name.trim().length < 2) nextErrors.name = "Enter a workspace name";
    if (!details.industry) nextErrors.industry = "Choose your industry";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/v1/workspace", { method: "PATCH", json: { ...details, name: details.name.trim() } });
      setStep(1);
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(
        error instanceof ApiError
          ? { message: error.message, referenceId: error.referenceId }
          : { message: "Something went wrong." },
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function finish() {
    if (!interest) {
      setFormError({ message: "Choose what brings you to Mailnitio." });
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/v1/workspace/onboarding", { method: "POST", json: { productInterest: interest } });
      router.replace("/app");
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? { message: error.message, referenceId: error.referenceId }
          : { message: "Something went wrong." },
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={["Workspace details", "What brings you here?"]} current={step} />
      <Card className="p-6 md:p-8">
        {step === 0 ? (
          <form noValidate onSubmit={saveDetails} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-h2 text-text">Tell us about your workspace</h1>
              <p className="text-body text-text-muted">
                This helps us tailor categories and examples to your business.
              </p>
            </div>
            <Field
              label="Workspace name"
              required
              helper="Usually your company or team name."
              error={errors.name}
            >
              <Input
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Country" required error={errors.country}>
                <Select
                  value={details.country}
                  onChange={(e) => setDetails({ ...details, country: e.target.value })}
                >
                  {LEAD_COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Industry" required error={errors.industry}>
                <Select
                  value={details.industry}
                  onChange={(e) => setDetails({ ...details, industry: e.target.value })}
                >
                  <option value="">Choose your industry</option>
                  {industries.map((i) => (
                    <option key={i.slug} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </Select>
              </Field>
            </div>
            <Field
              label="Timezone"
              required
              helper="Dates, SLAs and reports use this timezone."
              error={errors.timezone}
            >
              <Select
                value={details.timezone}
                onChange={(e) => setDetails({ ...details, timezone: e.target.value })}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
            {formError ? <Banner tone="danger" title={formError.message} /> : null}
            <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto sm:self-end">
              Continue
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-h2 text-text">What brings you here?</h1>
              <p className="text-body text-text-muted">
                We will set up your workspace around it. You can add the other product later.
              </p>
            </div>
            <div role="radiogroup" aria-label="What brings you here?" className="flex flex-col gap-3">
              {INTERESTS.map((option) => {
                const selected = interest === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setInterest(option.value)}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-4 rounded-card border p-4 text-left transition-colors duration-150",
                      selected ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-primary">
                      <option.icon aria-hidden className="size-5 stroke-[1.75]" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-h4 text-text">{option.title}</span>
                      <span className="text-body text-text-muted">{option.body}</span>
                    </span>
                    {selected ? <Check aria-hidden className="size-5 stroke-[1.75] text-primary" /> : null}
                  </button>
                );
              })}
            </div>
            {formError ? <Banner tone="danger" title={formError.message} /> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button size="lg" loading={submitting} onClick={() => void finish()}>
                Go to my workspace
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
