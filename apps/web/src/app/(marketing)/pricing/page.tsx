import { type PricingTabId, pocOffer, pricingFaq, pricingTabs } from "@mailnitio/config";
import { Banner, Button } from "@mailnitio/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaSection } from "@/components/marketing/blocks";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PricingExplorer } from "./pricing-explorer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for Mailnitio Helpdesk (native and middleware) and Send, in naira and US dollars. No per-seat charges on Growth and above.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab: PricingTabId = pricingTabs.some((t) => t.id === tab)
    ? (tab as PricingTabId)
    : "helpdesk-native";

  return (
    <>
      <Section labelledBy="pricing-heading" className="bg-bg">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="pricing-heading"
            as="h1"
            overline="Pricing"
            title="Pay for the emails we handle, not for seats"
            description="Every plan is priced in naira and US dollars. Start with a free proof of concept in shadow mode."
          />
          <Banner
            tone="info"
            title={pocOffer.title}
            action={
              <Button asChild>
                <Link href={pocOffer.cta.href}>{pocOffer.cta.label}</Link>
              </Button>
            }
          >
            {pocOffer.body}
          </Banner>
          <PricingExplorer initialTab={initialTab} />
        </div>
      </Section>

      <Section tone="muted" labelledBy="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <SectionHeading id="faq-heading" overline="FAQ" title="Pricing questions" />
          <div className="divide-y divide-border rounded-card border border-border bg-surface">
            {pricingFaq.map((item) => (
              <details key={item.question} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-h4 text-text">
                  {item.question}
                  <span
                    aria-hidden
                    className="text-text-subtle transition-transform duration-150 group-open:rotate-45 text-h3 font-normal"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-body text-text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      <CtaSection
        title="Not sure which plan fits?"
        description="Tell us your monthly email volume and how your teams work. We will recommend a plan and set up a proof of concept."
      />
    </>
  );
}
