"use client";

import {
  estimateMonthlyCost,
  type Plan,
  type PriceRange,
  type PricingTab,
  type PricingTabId,
  pricingTabs,
  recommendPlan,
} from "@mailnitio/config";
import {
  Badge,
  Button,
  cn,
  Field,
  formatCurrency,
  formatNumber,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@mailnitio/ui";
import { Check, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function formatRange(range: PriceRange): string {
  return range.min === range.max
    ? formatCurrency(range.min, "USD")
    : `${formatCurrency(range.min, "USD")}–${formatCurrency(range.max, "USD").replace("$", "")}`;
}

function PlanPrice({ plan }: { plan: Plan }) {
  if (!plan.price) {
    return <p className="text-h2 text-text">{plan.priceLabel ?? "Custom"}</p>;
  }
  const unit = plan.basis === "per_agent" ? "per agent a month" : "a month";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-h1 text-text tabular">
        {plan.price.max === 0 ? "Free" : formatRange(plan.price)}
        {plan.price.max === 0 ? null : <span className="text-body font-normal text-text-muted"> {unit}</span>}
      </p>
      {plan.includedEmails !== null ? (
        <p className="text-small text-text-muted tabular">
          Up to {formatNumber(plan.includedEmails)} emails a month
        </p>
      ) : null}
    </div>
  );
}

function Calculator({ tab }: { tab: PricingTab }) {
  const perAgent = tab.plans.some((p) => p.basis === "per_agent");
  const [emails, setEmails] = useState(
    tab.id === "send" ? 50_000 : tab.id === "helpdesk-native" ? 5_000 : 30_000,
  );
  const [agents, setAgents] = useState(5);
  const valid =
    Number.isFinite(emails) && emails >= 0 && (!perAgent || (Number.isFinite(agents) && agents >= 1));
  const input = { emails, agents: perAgent ? agents : 1 };
  const recommended = valid ? recommendPlan(tab, input) : null;
  const cost = recommended ? estimateMonthlyCost(recommended, input) : null;

  return (
    <div className="grid gap-6 rounded-card border border-border bg-surface p-6 md:grid-cols-2 md:items-end">
      <div className="flex flex-col gap-4">
        <h3 className="text-h4 text-text">Estimate your monthly cost</h3>
        <div className={cn("grid gap-4", perAgent && "sm:grid-cols-2")}>
          <Field label={`Emails per month (${tab.unit}s)`} helper="Use your average month.">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={Number.isFinite(emails) ? emails : ""}
              onChange={(e) => setEmails(e.target.valueAsNumber)}
              className="tabular"
            />
          </Field>
          {perAgent ? (
            <Field label="Agents" helper="People who work tickets.">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={Number.isFinite(agents) ? agents : ""}
                onChange={(e) => setAgents(e.target.valueAsNumber)}
                className="tabular"
              />
            </Field>
          ) : null}
        </div>
      </div>
      <div aria-live="polite" className="flex flex-col gap-1 rounded-card bg-surface-2 p-4">
        {!valid ? (
          <p className="text-body text-text-muted">Enter your volume to see an estimate.</p>
        ) : recommended && cost ? (
          <>
            <p className="text-caption text-text-muted">Recommended plan</p>
            <p className="text-h3 text-text">{recommended.name}</p>
            <p className="text-h2 text-text tabular">
              {formatRange(cost)}
              <span className="text-body font-normal text-text-muted"> a month</span>
            </p>
            <p className="text-small text-text-subtle">Estimate in US dollars, excluding VAT.</p>
          </>
        ) : (
          <>
            <p className="text-h4 text-text">Talk to us about this volume</p>
            <p className="text-body text-text-muted">
              At {formatNumber(emails)} emails a month, an Enterprise or Scale plan is usually the best fit.
            </p>
            <Link
              href="/demo?plan=enterprise"
              className="mt-1 text-body font-medium text-primary hover:underline"
            >
              Talk to sales
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function PricingExplorer({ initialTab }: { initialTab: PricingTabId }) {
  const [tabId, setTabId] = useState<PricingTabId>(initialTab);

  return (
    <Tabs value={tabId} onValueChange={(v) => setTabId(v as PricingTabId)}>
      <TabsList aria-label="Product">
        {pricingTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {pricingTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="flex flex-col gap-8">
          <p className="prose-width text-body-lg text-text-muted">{tab.intro}</p>
          <div
            className={cn(
              "grid gap-6 md:grid-cols-2",
              tab.plans.length === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3",
            )}
          >
            {tab.plans.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col gap-6 rounded-card border bg-surface p-6",
                  plan.highlighted ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-h3 text-text">{plan.name}</h3>
                    {plan.highlighted ? <Badge tone="primary">Most popular</Badge> : null}
                  </div>
                  <p className="text-body text-text-muted">{plan.summary}</p>
                </div>
                <PlanPrice plan={plan} />
                <Button asChild variant={plan.highlighted ? "primary" : "secondary"}>
                  <Link href={plan.cta.href}>{plan.cta.label}</Link>
                </Button>
                <ul className="flex flex-col gap-2 border-t border-border pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-body text-text-muted">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {tab.notes.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {tab.notes.map((note) => (
                <li key={note.title} className="flex gap-3 rounded-card border border-border bg-surface p-4">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-info" />
                  <div>
                    <p className="text-body font-medium text-text">{note.title}</p>
                    <p className="text-body text-text-muted">{note.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <Calculator key={`${tab.id}-calc`} tab={tab} />
          <p className="text-small text-text-subtle">
            Prices in US dollars, excluding VAT. Launch prices, to be confirmed in your quote. Naira invoicing
            available.
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
}
