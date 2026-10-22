import { site } from "@mailnitio/config";
import { Database, FileClock, KeyRound, Landmark, Scale, ScanEye, Server, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { CtaSection } from "@/components/marketing/blocks";
import { Feature, FeatureGrid, Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Security and compliance",
  description:
    "How Mailnitio protects customer email data: NDPA alignment, data minimisation, PII masking, bring your own AI key, customer-hosted option, audit log and sub-processors.",
  alternates: { canonical: "/security" },
};

const controls = [
  {
    icon: <Scale />,
    title: "NDPA alignment",
    body: "Mailnitio is designed around the Nigeria Data Protection Act 2023: a lawful basis for each processing purpose, data minimisation, retention limits and support for data subject requests. We sign a data processing agreement with every customer.",
  },
  {
    icon: <Database />,
    title: "Data minimisation",
    body: "We store what is needed to route and track each email and nothing more. Attachments stay in your mailbox. Retention periods are set per workspace, and deleted data is removed from backups on a fixed schedule.",
  },
  {
    icon: <ScanEye />,
    title: "PII masking",
    body: "Before any email text is sent to an AI model, names, email addresses, phone numbers, account numbers, BVNs and card numbers are replaced with placeholders. The AI decides on the masked text only.",
  },
  {
    icon: <KeyRound />,
    title: "Bring your own AI key",
    body: "Connect your own Anthropic, OpenAI or Azure OpenAI account. AI requests then run under your contract and data-retention terms, and you see the usage on your own bill.",
  },
  {
    icon: <Server />,
    title: "Customer-hosted option",
    body: "On Enterprise plans, the Mailnitio processing service can run in your own cloud account so email content never leaves your environment. Mailnitio manages updates.",
  },
  {
    icon: <FileClock />,
    title: "Audit log",
    body: "Every sign-in, setting change and AI decision is recorded with who, what and when. Owners and admins can search and export the audit log at any time.",
  },
  {
    icon: <ShieldCheck />,
    title: "Isolation and encryption",
    body: "Each workspace is isolated at the database level with row-level security. Credentials such as mailbox secrets are encrypted with a key unique to your workspace. Data is encrypted in transit with TLS 1.2+ and at rest.",
  },
  {
    icon: <Landmark />,
    title: "Access control",
    body: "Role-based access for owners, admins, supervisors, agents, reviewers and viewers. Two-factor authentication is required for owners and admins.",
  },
];

const subProcessors = [
  { name: "Render", purpose: "Application hosting", location: "Frankfurt, Germany (EU)" },
  { name: "Neon", purpose: "Database hosting", location: "Frankfurt, Germany (EU)" },
  {
    name: "Amazon Web Services",
    purpose: "Email sending (Send) and file storage",
    location: "Frankfurt, Germany (EU)",
  },
  { name: "Anthropic", purpose: "AI classification of masked email text", location: "United States" },
  { name: "OpenAI", purpose: "AI classification of masked email text (fallback)", location: "United States" },
  { name: "Sentry", purpose: "Error monitoring (no email content)", location: "European Union" },
  { name: "Resend", purpose: "System notifications such as sign-in emails", location: "United States" },
  { name: "Cloudflare", purpose: "Bot protection on public forms", location: "Global" },
];

export default function SecurityPage() {
  return (
    <>
      <Section labelledBy="security-page-heading" className="bg-bg">
        <SectionHeading
          id="security-page-heading"
          as="h1"
          overline="Security and compliance"
          title="Your customers' emails, handled with care"
          description="Mailnitio processes some of the most sensitive messages your customers send. This page explains how we protect them."
        />
      </Section>

      <Section labelledBy="controls-heading">
        <h2 id="controls-heading" className="sr-only">
          Security controls
        </h2>
        <FeatureGrid columns={2}>
          {controls.map((control) => (
            <Feature key={control.title} icon={control.icon} title={control.title}>
              {control.body}
            </Feature>
          ))}
        </FeatureGrid>
      </Section>

      <Section tone="muted" labelledBy="subprocessors-heading">
        <div className="flex flex-col gap-8">
          <SectionHeading
            id="subprocessors-heading"
            overline="Sub-processors"
            title="Who else processes data for us"
            description="We use a small number of providers. AI providers only ever receive masked text, and are not used when you bring your own key."
          />
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[560px] text-body">
              <caption className="sr-only">Mailnitio sub-processors</caption>
              <thead className="bg-surface-2">
                <tr className="text-caption text-text-muted">
                  <th scope="col" className="h-10 px-4 text-left">
                    Provider
                  </th>
                  <th scope="col" className="px-4 text-left">
                    Purpose
                  </th>
                  <th scope="col" className="px-4 text-left">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                {subProcessors.map((row) => (
                  <tr key={row.name} className="h-11 border-t border-border">
                    <th scope="row" className="px-4 text-left font-medium text-text">
                      {row.name}
                    </th>
                    <td className="px-4 text-text-muted">{row.purpose}</td>
                    <td className="px-4 text-text-muted">{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-body text-text-muted">
            To report a security issue, email{" "}
            <a href={`mailto:${site.securityEmail}`} className="text-primary hover:underline">
              {site.securityEmail}
            </a>
            .
          </p>
        </div>
      </Section>

      <CtaSection title="Talk to us about your compliance requirements" />
    </>
  );
}
