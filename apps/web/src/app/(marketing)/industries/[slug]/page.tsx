import { getIndustry, industries } from "@mailnitio/config";
import { Badge, Button } from "@mailnitio/ui";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaSection, StatsStrip } from "@/components/marketing/blocks";
import { Section, SectionHeading } from "@/components/marketing/section";

export function generateStaticParams() {
  return industries.map((industry) => ({ slug: industry.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const industry = getIndustry((await params).slug);
  if (!industry) return {};
  return {
    title: `${industry.name}: AI email routing`,
    description: industry.summary,
    alternates: { canonical: `/industries/${industry.slug}` },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const industry = getIndustry((await params).slug);
  if (!industry) notFound();

  return (
    <>
      <section aria-labelledby="industry-heading" className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-16 md:px-6 md:py-24">
          <nav aria-label="Breadcrumb" className="text-small text-text-subtle">
            <ol className="flex gap-2">
              <li>
                <Link href="/" className="hover:text-text">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-text-muted">
                {industry.name}
              </li>
            </ol>
          </nav>
          <h1 id="industry-heading" className="max-w-3xl text-h1 text-text md:text-display">
            {industry.headline}
          </h1>
          <p className="prose-width text-body-lg text-text-muted">{industry.summary}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/demo?industry=${industry.slug}`}>Book a demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <Section labelledBy="categories-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="categories-heading"
            overline="Sample categories"
            title={`How Mailnitio sorts ${industry.name.toLowerCase()} emails`}
            description="These are starting categories. During onboarding Mailnitio learns your own categories and teams from emails you have already handled."
          />
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[640px] text-body">
              <caption className="sr-only">
                Sample categories, example emails and the team each is routed to
              </caption>
              <thead className="bg-surface-2">
                <tr className="text-caption text-text-muted">
                  <th scope="col" className="h-10 px-4 text-left">
                    Category
                  </th>
                  <th scope="col" className="px-4 text-left">
                    Example email
                  </th>
                  <th scope="col" className="px-4 text-left">
                    Routed to
                  </th>
                </tr>
              </thead>
              <tbody>
                {industry.categories.map((category) => (
                  <tr key={category.name} className="h-11 border-t border-border">
                    <th scope="row" className="px-4 text-left font-medium text-text">
                      {category.name}
                    </th>
                    <td className="px-4 py-2 text-text-muted">&ldquo;{category.example}&rdquo;</td>
                    <td className="px-4">
                      <Badge tone="primary">{category.team}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section tone="muted" labelledBy="escalation-heading">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <SectionHeading
              id="escalation-heading"
              overline="Escalation"
              title="Urgent emails go straight to a supervisor"
              description="When an email mentions any of these terms, Mailnitio escalates it immediately, whatever the category."
            />
            <ul className="flex flex-wrap gap-2">
              {industry.escalationTerms.map((term) => (
                <li key={term}>
                  <Badge tone="danger">
                    <ShieldAlert aria-hidden />
                    {term}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4 rounded-card border border-border bg-surface p-6">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.75] text-success" />
            <div className="flex flex-col gap-1">
              <h3 className="text-h4 text-text">Data protection</h3>
              <p className="text-body text-text-muted">{industry.regulatoryNote}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section labelledBy="outcomes-heading">
        <div className="flex flex-col gap-10">
          <SectionHeading id="outcomes-heading" overline="Outcomes" title="What teams can expect" />
          <StatsStrip stats={industry.outcomes.map((o) => ({ value: o.metric, label: o.label }))} />
          <p className="text-small text-text-subtle">
            Outcomes are targets based on shadow-mode evaluations; your results depend on your email mix and
            how your teams are organised.
          </p>
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
