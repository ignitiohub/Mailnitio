import { Button } from "@mailnitio/ui";
import { KeyRound, ScanEye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Section } from "./section";

export function StatsStrip({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-1 divide-border rounded-card border border-border bg-surface sm:grid-cols-3 sm:divide-x max-sm:divide-y">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 p-6">
          <dt className="order-2 text-body text-text-muted">{stat.label}</dt>
          <dd className="order-1 text-h1 text-text tabular">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const integrations = ["Outlook", "Gmail", "Dynamics 365", "Salesforce"];

/** Works-with strip: product names set as greyscale wordmarks. */
export function WorksWith({ title = "Works with the tools you already use" }: { title?: string }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-overline text-text-subtle uppercase">{title}</p>
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {integrations.map((name) => (
          <li key={name} className="text-h3 font-semibold tracking-[-0.01em] text-text-subtle grayscale">
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

const badges = [
  {
    icon: ShieldCheck,
    title: "NDPA-aligned",
    body: "Designed around the Nigeria Data Protection Act: data minimisation, purpose limitation and full audit trails.",
  },
  {
    icon: ScanEye,
    title: "PII masking",
    body: "Names, account numbers, BVNs and phone numbers are masked before any email text reaches an AI model.",
  },
  {
    icon: KeyRound,
    title: "Bring your own AI key",
    body: "Use your own Anthropic, OpenAI or Azure OpenAI account so AI processing stays under your contract.",
  },
];

export function SecurityBadges() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {badges.map((badge) => (
        <li key={badge.title} className="flex gap-4 rounded-card border border-border bg-surface p-6">
          <badge.icon aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.75] text-success" />
          <div className="flex flex-col gap-1">
            <h3 className="text-h4 text-text">{badge.title}</h3>
            <p className="text-body text-text-muted">{badge.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CtaSection({
  title = "See Mailnitio on your own emails",
  description = "Book a 30-minute demo. We will show how Mailnitio would route a sample of your real customer emails, in shadow mode, before anything changes for your team.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Section tone="brand" labelledBy="cta-heading">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="cta-heading" className="text-h2 text-text md:text-h1">
            {title}
          </h2>
          <p className="text-body-lg text-text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/demo">Book a demo</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
