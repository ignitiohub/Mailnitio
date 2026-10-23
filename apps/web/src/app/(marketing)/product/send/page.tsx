import { Badge, Button } from "@mailnitio/ui";
import { Activity, Code2, LayoutTemplate, MailCheck, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaSection } from "@/components/marketing/blocks";
import { CampaignMonitorMockup } from "@/components/marketing/mockups";
import { Feature, FeatureGrid, Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Send: templates and bulk email",
  description:
    "Mailnitio Send gives you templates, audiences and bulk sends with a live monitor and SPF, DKIM and DMARC checks, on infrastructure tuned for inbox placement.",
  alternates: { canonical: "/product/send" },
};

const features = [
  {
    icon: <LayoutTemplate />,
    title: "Templates",
    body: "Build branded templates once and reuse them for statements, notices and newsletters, with personalisation fields and previews.",
  },
  {
    icon: <Users />,
    title: "Audiences",
    body: "Import contacts, build audiences from attributes and keep suppression lists up to date automatically.",
  },
  {
    icon: <Activity />,
    title: "Bulk sends with a live monitor",
    body: "Watch delivery, bounces and complaints as they happen. Pause a send in one click if something looks wrong.",
  },
  {
    icon: <ShieldCheck />,
    title: "Deliverability built in",
    body: "Mailnitio checks SPF, DKIM and DMARC for each sending domain and walks you through fixing anything that is missing.",
  },
  {
    icon: <MailCheck />,
    title: "Automatic suppression",
    body: "Hard bounces and complaints are suppressed for future sends, protecting your domain reputation.",
  },
  {
    icon: <Code2 />,
    title: "API (coming soon)",
    body: "Send transactional and bulk email from your own systems with the same templates, audiences and reporting.",
  },
];

export default function SendPage() {
  return (
    <>
      <section aria-labelledby="send-heading" className="border-b border-border bg-bg">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <Badge tone="primary" className="w-fit">
              Mailnitio Send
            </Badge>
            <h1 id="send-heading" className="text-h1 text-text md:text-display">
              Statements, notices and campaigns that reach the inbox
            </h1>
            <p className="prose-width text-body-lg text-text-muted">
              Templates, audiences and bulk sends in the same workspace as your helpdesk, with deliverability
              checks and a live monitor for every send.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/demo?interest=Send">Book a demo</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/pricing?tab=send">View pricing</Link>
              </Button>
            </div>
          </div>
          <CampaignMonitorMockup />
        </div>
      </section>

      <Section labelledBy="send-features-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="send-features-heading"
            overline="What it does"
            title="Bulk email without the deliverability guesswork"
          />
          <FeatureGrid>
            {features.map((feature) => (
              <Feature key={feature.title} icon={feature.icon} title={feature.title}>
                {feature.body}
              </Feature>
            ))}
          </FeatureGrid>
        </div>
      </Section>

      <Section tone="muted" labelledBy="dns-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            id="dns-heading"
            overline="Deliverability"
            title="SPF, DKIM and DMARC, checked for you"
            description="Before your first send, Mailnitio verifies each sending domain and tells you exactly which DNS records to add. Checks keep running, so you hear about problems before your customers do."
          />
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
            {[
              { record: "SPF", status: "Aligned", detail: "include:amazonses.com present" },
              { record: "DKIM", status: "Aligned", detail: "3 of 3 CNAME records verified" },
              { record: "DMARC", status: "Aligned", detail: "p=quarantine; reports enabled" },
            ].map((row) => (
              <li key={row.record} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-mono text-body text-text">{row.record}</p>
                  <p className="text-small text-text-muted">{row.detail}</p>
                </div>
                <Badge tone="success">
                  <ShieldCheck aria-hidden />
                  {row.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaSection title="Plan your first send with us" />
    </>
  );
}
