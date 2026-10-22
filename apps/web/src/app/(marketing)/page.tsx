import { industries } from "@mailnitio/config";
import { Button } from "@mailnitio/ui";
import { ArrowRight, Check, Inbox, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaSection, SecurityBadges, StatsStrip, WorksWith } from "@/components/marketing/blocks";
import { DecisionMockup, FlowDiagram, InboxMockup } from "@/components/marketing/mockups";
import { Section, SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: { absolute: "Mailnitio: Every support email in the right place, in seconds" },
  alternates: { canonical: "/" },
};

const products = [
  {
    icon: Inbox,
    name: "Helpdesk",
    tagline: "AI email customer service",
    body: "Mailnitio reads every customer email, recognises the customer, creates or updates the ticket and routes it to the right team, in our helpdesk or in your CRM.",
    points: [
      "Routing by content, not keywords",
      "No duplicate tickets from follow-ups",
      "Team inbox with SLAs and review queue",
    ],
    href: "/product/helpdesk",
  },
  {
    icon: Send,
    name: "Send",
    tagline: "Templates and bulk email",
    body: "Design templates, manage audiences and send statements, notices and campaigns at volume, with deliverability checks built in.",
    points: [
      "Reusable templates",
      "Audiences and suppression lists",
      "Live send monitor with SPF, DKIM and DMARC checks",
    ],
    href: "/product/send",
  },
];

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="hero-heading" className="overflow-hidden border-b border-border bg-bg">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <p className="text-overline text-primary uppercase">AI email operations</p>
            <h1 id="hero-heading" className="text-h1 text-text md:text-display">
              Every support email in the right place, in seconds
            </h1>
            <p className="prose-width text-body-lg text-text-muted">
              Mailnitio&apos;s AI reads, routes and tickets your customer emails. In our helpdesk, or straight
              into your CRM.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/demo">Book a demo</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/product/helpdesk#see-it-live">
                  See it live
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
            <p className="text-small text-text-subtle">
              Start in shadow mode: Mailnitio shows what it would do before it touches a single email.
            </p>
          </div>
          <InboxMockup />
        </div>
      </section>

      <Section id="how-it-works" labelledBy="how-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="how-heading"
            overline="How it works"
            title="From inbox to the right team without manual triage"
            description="Connect the mailbox your customers already write to. Mailnitio does the sorting your team does by hand today."
          />
          <FlowDiagram />
          <StatsStrip
            stats={[
              { value: "94%", label: "of emails routed correctly first time" },
              { value: "0", label: "duplicate cases when customers follow up" },
              { value: "<10s", label: "from email received to ticket created" },
            ]}
          />
        </div>
      </Section>

      <Section tone="muted" labelledBy="products-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="products-heading"
            overline="Products"
            title="Two products, one workspace"
            description="Use Helpdesk for inbound customer email and Send for outbound statements and campaigns, or both."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.name}
                className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 md:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-control bg-primary-soft text-primary">
                    <product.icon aria-hidden className="size-5 stroke-[1.75]" />
                  </span>
                  <div>
                    <h3 className="text-h3 text-text">Mailnitio {product.name}</h3>
                    <p className="text-small text-text-muted">{product.tagline}</p>
                  </div>
                </div>
                <p className="text-body text-text-muted">{product.body}</p>
                <ul className="flex flex-col gap-2">
                  {product.points.map((point) => (
                    <li key={point} className="flex gap-2 text-body text-text">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-success" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href={product.href}
                  className="mt-auto inline-flex items-center gap-1 text-body font-medium text-primary hover:underline"
                >
                  Explore {product.name}
                  <ArrowRight aria-hidden className="size-4 stroke-[1.75]" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section labelledBy="trail-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="trail-heading"
            overline="AI advises, your rules decide"
            title="Every decision explained"
            description="Each email gets a category, a confidence score and a one-line reason. Low-confidence emails go to a review queue instead of guessing, and every step is recorded."
          />
          <DecisionMockup />
        </div>
      </Section>

      <Section tone="muted" labelledBy="works-heading">
        <h2 id="works-heading" className="sr-only">
          Integrations
        </h2>
        <WorksWith />
      </Section>

      <Section labelledBy="security-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="security-heading"
            overline="Security"
            title="Built for regulated industries"
            description="Mailnitio collects as little customer data as possible, masks it before AI processing and records everything it does, so your compliance team can see exactly what happened to every email."
          />
          <SecurityBadges />
          <Link
            href="/security"
            className="inline-flex items-center gap-1 text-body font-medium text-primary hover:underline"
          >
            Read about security and compliance
            <ArrowRight aria-hidden className="size-4 stroke-[1.75]" />
          </Link>
        </div>
      </Section>

      <Section tone="muted" labelledBy="industries-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="industries-heading"
            overline="Industries"
            title="Tuned for the emails your customers send"
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {industries.map((industry) => (
              <li key={industry.slug}>
                <Link
                  href={`/industries/${industry.slug}`}
                  className="flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong"
                >
                  <span className="text-h4 text-text">{industry.name}</span>
                  <span className="text-small text-text-muted">
                    {industry.categories
                      .slice(0, 3)
                      .map((c) => c.name)
                      .join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
