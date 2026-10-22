"use client";

import {
  LEAD_COUNTRIES,
  LEAD_CRMS,
  LEAD_EMAIL_PLATFORMS,
  LEAD_INTERESTS,
  LEAD_ROLES,
  LEAD_VOLUMES,
} from "@mailnitio/config";
import { type LeadInput, leadInputSchema } from "@mailnitio/shared";
import { Banner, Button, Card, cn, Field, Input, Select, Textarea } from "@mailnitio/ui";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useMemo, useState } from "react";
import { Turnstile, turnstileEnabled } from "@/components/turnstile";
import { ApiError, apiFetch, fieldErrors } from "@/lib/api";
import { upcomingDemoDays } from "./slots";

type FormValues = Record<
  | "name"
  | "workEmail"
  | "company"
  | "role"
  | "country"
  | "monthlyVolume"
  | "emailPlatform"
  | "crm"
  | "interest"
  | "message",
  string
>;

const EMPTY: FormValues = {
  name: "",
  workEmail: "",
  company: "",
  role: "",
  country: "",
  monthlyVolume: "",
  emailPlatform: "",
  crm: "",
  interest: "",
  message: "",
};

function validateField(name: keyof FormValues, values: FormValues): string | null {
  const shape = leadInputSchema.shape;
  const value = values[name] === "" && (name === "interest" || name === "message") ? undefined : values[name];
  const result = shape[name].safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? "Check this field");
}

export function DemoForm() {
  const params = useSearchParams();
  const initialInterest = params.get("interest");
  const [values, setValues] = useState<FormValues>({
    ...EMPTY,
    interest: (LEAD_INTERESTS as readonly string[]).includes(initialInterest ?? "")
      ? (initialInterest as string)
      : "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [slot, setSlot] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<{ message: string; referenceId?: string } | null>(null);
  const [done, setDone] = useState<{ slotLabel: string | null } | null>(null);
  const days = useMemo(() => upcomingDemoDays(), []);
  const [day, setDay] = useState(days[0]?.date ?? "");
  const onToken = useCallback((token: string) => setCaptcha(token), []);

  const update = (name: keyof FormValues) => (event: { target: { value: string } }) => {
    const next = { ...values, [name]: event.target.value };
    setValues(next);
    if (errors[name]) setErrors((e) => ({ ...e, [name]: validateField(name, next) ?? undefined }));
  };
  const blur = (name: keyof FormValues) => () => {
    setErrors((e) => ({ ...e, [name]: validateField(name, values) ?? undefined }));
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const fields = Object.keys(EMPTY) as (keyof FormValues)[];
    const nextErrors = Object.fromEntries(fields.map((f) => [f, validateField(f, values) ?? undefined]));
    setErrors(nextErrors);
    const firstInvalid = fields.find((f) => nextErrors[f]);
    if (firstInvalid) {
      document.getElementById(`demo-${firstInvalid}`)?.focus();
      return;
    }
    if (turnstileEnabled && !captcha) {
      setFormError({ message: "Complete the security check above the button, then try again." });
      return;
    }

    const payload: LeadInput = {
      ...(values as unknown as LeadInput),
      interest: (values.interest || undefined) as LeadInput["interest"],
      message: values.message || undefined,
      preferredSlot: slot ?? undefined,
      source: params.get("plan") ?? params.get("offer") ?? params.get("industry") ?? undefined,
      captchaToken: captcha,
    };

    setSubmitting(true);
    try {
      await apiFetch("/v1/leads", { method: "POST", json: payload });
      const chosen = slot
        ? days.flatMap((d) => d.slots.map((s) => ({ ...s, day: d.label }))).find((s) => s.iso === slot)
        : null;
      setDone({ slotLabel: chosen ? `${chosen.day} at ${chosen.label} WAT` : null });
    } catch (error) {
      const fe = fieldErrors(error);
      if (Object.keys(fe).length > 0) setErrors(fe as typeof errors);
      setFormError(
        error instanceof ApiError
          ? { message: error.message, referenceId: error.referenceId }
          : { message: "Something went wrong. Try again in a moment." },
      );
      setCaptchaReset((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 md:p-8" role="status">
        <CheckCircle2 aria-hidden className="size-8 stroke-[1.75] text-success" />
        <h2 className="text-h2 text-text">Thank you, we have your request</h2>
        <p className="text-body-lg text-text-muted">
          {done.slotLabel
            ? `You asked for ${done.slotLabel}. We will confirm this time or suggest another within one working day.`
            : "We will contact you within one working day to arrange a time."}{" "}
          A confirmation is on its way to {values.workEmail}.
        </p>
        <Button asChild variant="secondary">
          <Link href="/product/helpdesk">Explore Helpdesk while you wait</Link>
        </Button>
      </Card>
    );
  }

  const selectedDay = days.find((d) => d.date === day);

  return (
    <Card className="p-6 md:p-8">
      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
        aria-describedby="demo-required-note"
      >
        <p id="demo-required-note" className="text-small text-text-subtle">
          Fields marked <span className="text-danger">*</span> are required.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="demo-name" label="Full name" required error={errors.name}>
            <Input autoComplete="name" value={values.name} onChange={update("name")} onBlur={blur("name")} />
          </Field>
          <Field id="demo-workEmail" label="Work email" required error={errors.workEmail}>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={values.workEmail}
              onChange={update("workEmail")}
              onBlur={blur("workEmail")}
            />
          </Field>
          <Field id="demo-company" label="Company" required error={errors.company}>
            <Input
              autoComplete="organization"
              value={values.company}
              onChange={update("company")}
              onBlur={blur("company")}
            />
          </Field>
          <Field id="demo-role" label="Role" required error={errors.role}>
            <Select value={values.role} onChange={update("role")} onBlur={blur("role")}>
              <option value="">Choose your role</option>
              {LEAD_ROLES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field id="demo-country" label="Country" required error={errors.country}>
            <Select value={values.country} onChange={update("country")} onBlur={blur("country")}>
              <option value="">Choose your country</option>
              {LEAD_COUNTRIES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field id="demo-monthlyVolume" label="Monthly email volume" required error={errors.monthlyVolume}>
            <Select
              value={values.monthlyVolume}
              onChange={update("monthlyVolume")}
              onBlur={blur("monthlyVolume")}
            >
              <option value="">Choose a range</option>
              {LEAD_VOLUMES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field id="demo-emailPlatform" label="Email platform" required error={errors.emailPlatform}>
            <Select
              value={values.emailPlatform}
              onChange={update("emailPlatform")}
              onBlur={blur("emailPlatform")}
            >
              <option value="">Choose your email platform</option>
              {LEAD_EMAIL_PLATFORMS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field id="demo-crm" label="CRM" required error={errors.crm}>
            <Select value={values.crm} onChange={update("crm")} onBlur={blur("crm")}>
              <option value="">Choose your CRM</option>
              {LEAD_CRMS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field id="demo-interest" label="Interested in" optional error={errors.interest}>
          <Select value={values.interest} onChange={update("interest")}>
            <option value="">Not sure yet</option>
            {LEAD_INTERESTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>

        <Field
          id="demo-message"
          label="Message"
          optional
          helper="What would you like to see? For example, your main email categories or current tools."
          error={errors.message}
        >
          <Textarea rows={4} value={values.message} onChange={update("message")} maxLength={2000} />
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-body font-medium text-text">
            Preferred time <span className="font-normal text-text-subtle">(optional, West Africa Time)</span>
          </legend>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Day">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={day === d.date}
                onClick={() => setDay(d.date)}
                className={cn(
                  "flex h-11 shrink-0 cursor-pointer items-center rounded-control border px-3 text-small whitespace-nowrap transition-colors duration-150",
                  day === d.date
                    ? "border-primary bg-primary-soft font-medium text-primary"
                    : "border-border-strong text-text-muted hover:bg-surface-2",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time">
            {selectedDay?.slots.map((s) => (
              <button
                key={s.iso}
                type="button"
                role="radio"
                aria-checked={slot === s.iso}
                onClick={() => setSlot(slot === s.iso ? null : s.iso)}
                className={cn(
                  "h-11 cursor-pointer rounded-control border text-body tabular transition-colors duration-150 md:h-9",
                  slot === s.iso
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border-strong text-text hover:bg-surface-2",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <Turnstile onToken={onToken} resetKey={captchaReset} />

        {formError ? (
          <Banner tone="danger" title="We could not send your request">
            {formError.message}
            {formError.referenceId ? (
              <span className="mt-1 block text-caption">
                Reference <span className="font-mono">{formError.referenceId}</span>
              </span>
            ) : null}
          </Banner>
        ) : null}

        <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto sm:self-start">
          Book a demo
        </Button>
        <p className="text-small text-text-subtle">
          We use your details only to arrange and follow up on your demo. See our{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </Card>
  );
}
