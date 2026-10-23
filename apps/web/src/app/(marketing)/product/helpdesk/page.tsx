import { Badge, Button } from "@mailnitio/ui";
import {
  ArrowRight,
  Check,
  Clock,
  EyeOff,
  GitMerge,
  GraduationCap,
  Inbox,
  ListChecks,
  MailCheck,
  Route,
  TicketPlus,
  UserSearch,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaSection, WorksWith } from "@/components/marketing/blocks";
import { DecisionMockup, InboxMockup } from "@/components/marketing/mockups";
import { Feature, FeatureGrid, Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Helpdesk: AI email customer service",
  description:
    "Mailnitio Helpdesk reads every customer email, matches the customer, creates or updates the ticket and routes it to the right team, with SLAs, a review queue and shadow mode.",
  alternates: { canonical: "/product/helpdesk" },
};

const features = [
  {
    icon: <Route />,
    title: "Routing by content",
    body: "Mailnitio reads what the customer is asking for, not just the subject line, and sends the email to the team that handles it.",
  },
  {
    icon: <TicketPlus />,
    title: "Smart ticket creation",
    body: "A new request opens a ticket with the category, priority and customer already filled in. Follow-ups update the existing ticket instead.",
  },
  {
    icon: <GitMerge />,
    title: "Threading",
    body: "Replies, forwards and new emails about the same issue are joined into one conversation, even when the subject line changes.",
  },
  {
    icon: <UserSearch />,
    title: "Customer matching",
    body: "Each email is matched to the customer by address, account reference or previous tickets, so agents see the full history.",
  },
  {
    icon: <MailCheck />,
    title: "Acknowledgements",
    body: "Customers get an acknowledgement with their ticket number within seconds, sent from your own mailbox and in your words.",
  },
  {
    icon: <Clock />,
    title: "Team inbox and SLAs",
    body: "Agents work from one shared inbox with first-response and resolution targets per team, and supervisors see what is at risk.",
  },
  {
    icon: <ListChecks />,
    title: "Needs Review queue",
    body: "When the AI is not confident, the email goes to a reviewer instead of a guess. Every correction improves future routing.",
  },
  {
    icon: <EyeOff />,
    title: "Shadow mode",
    body: "Run Mailnitio alongside your current process. It records what it would have done so you can compare before going live.",
  },
  {
    icon: <GraduationCap />,
    title: "Training on your history",
    body: "Mailnitio learns your categories and teams from emails your team has already handled, so it fits your business from day one.",
  },
];

export default function HelpdeskPage() {
  return (
    <>
      <section aria-labelledby="helpdesk-heading" className="border-b border-border bg-bg">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <Badge tone="primary" className="w-fit">
              <Inbox aria-hidden />
              Mailnitio Helpdesk
            </Badge>
            <h1 id="helpdesk-heading" className="text-h1 text-text md:text-display">
              AI email customer service that never loses an email
            </h1>
            <p className="prose-width text-body-lg text-text-muted">
              Mailnitio reads every customer email, recognises the customer, creates or updates the ticket and
              routes it to the right team. Your agents start on the answer, not the sorting.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/demo?interest=Helpdesk">Book a demo</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
          <InboxMockup />
        </div>
      </section>

      <Section labelledBy="features-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="features-heading"
            overline="What it does"
            title="Everything between the inbox and the answer"
            description="Helpdesk handles the work that slows support teams down: reading, sorting, matching and chasing."
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

      <Section id="see-it-live" tone="muted" labelledBy="live-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="live-heading"
            overline="See it live"
            title="One email, every step recorded"
            description="This is what your team and your auditors see for each email: the AI suggestion, how confident it was, and each step Mailnitio took."
          />
          <DecisionMockup />
        </div>
      </Section>

      <Section id="middleware" labelledBy="middleware-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-6">
            <SectionHeading
              id="middleware-heading"
              overline="Middleware mode"
              title="Already work in Dynamics 365 or Salesforce?"
              description="Keep your CRM. In middleware mode the same AI creates and updates cases directly in your CRM, so agents never leave the tools they know."
            />
            <ul className="flex flex-col gap-3">
              {[
                "Cases created in the right queue with category and priority",
                "Follow-up emails appended to the open case, never duplicated",
                "Customers matched to existing CRM contacts and accounts",
                "Same shadow mode, review queue and audit trail as native Helpdesk",
              ].map((point) => (
                <li key={point} className="flex gap-2 text-body text-text">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-success" />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing?tab=helpdesk-middleware"
              className="inline-flex items-center gap-1 text-body font-medium text-primary hover:underline"
            >
              Middleware pricing
              <ArrowRight aria-hidden className="size-4 stroke-[1.75]" />
            </Link>
          </div>
          <div className="rounded-card border border-border bg-surface-2/60 p-6 md:p-10">
            <WorksWith title="Native mode or CRM mode" />
          </div>
        </div>
      </Section>

      <CtaSection title="Try Helpdesk in shadow mode" />
    </>
  );
}
