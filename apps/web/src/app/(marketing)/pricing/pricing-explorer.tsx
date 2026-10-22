"use client";

import {
  type Currency,
  estimateMonthlyCost,
  type Plan,
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
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function PlanPrice({ plan, currency }: { plan: Plan; currency: Currency }) {
  if (!plan.monthlyFee || !plan.overagePerEmail) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-h1 text-text">Custom</p>
        <p className="text-small text-text-muted">Priced for your volume and requirements</p>
      </div>
    );
  }
  const fee = plan.monthlyFee[currency];
  return (
    <div className="flex flex-col gap-1">
      <p className="text-h1 text-text tabular">
        {fee === 0 ? formatCurrency(plan.overagePerEmail[currency], currency) : formatCurrency(fee, currency)}
        <span className="text-body font-normal text-text-muted">
          {fee === 0 ? " per email" : " per month"}
        </span>
      </p>
      <p className="text-small text-text-muted tabular">
        {plan.includedEmails > 0
          ? `${formatNumber(plan.includedEmails)} emails included, then ${formatCurrency(plan.overagePerEmail[currency], currency)} each`
          : "No monthly commitment"}
      </p>
    </div>
  );
}

function Calculator({ tabId, currency }: { tabId: PricingTabId; currency: Currency }) {
  const tab = pricingTabs.find((t) => t.id === tabId);
  const [volume, setVolume] = useState(tabId === "send" ? 50_000 : 10_000);
  const valid = Number.isFinite(volume) && volume >= 0;
  const recommended = valid && tab ? recommendPlan(tab, volume, currency) : null;
  const cost = recommended ? estimateMonthlyCost(recommended, volume, currency) : null;

  return (
    <div className="grid gap-6 rounded-card border border-border bg-surface p-6 md:grid-cols-2 md:items-end">
      <div className="flex flex-col gap-4">
        <h3 className="text-h4 text-text">Estimate your monthly cost</h3>
        <Field
          label={`Emails per month (${tab?.unit ?? "email"}s)`}
          helper="Use your average month, not your busiest."
        >
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={Number.isFinite(volume) ? volume : ""}
            onChange={(e) => setVolume(e.target.valueAsNumber)}
            className="tabular"
          />
        </Field>
      </div>
      <div aria-live="polite" className="flex flex-col gap-1 rounded-card bg-surface-2 p-4">
        {recommended && cost !== null ? (
          <>
            <p className="text-caption text-text-muted">Recommended plan</p>
            <p className="text-h3 text-text">{recommended.name}</p>
            <p className="text-h2 text-text tabular">
              {formatCurrency(cost, currency)}
              <span className="text-body font-normal text-text-muted"> per month</span>
            </p>
            <p className="text-small text-text-subtle">
              Estimate excludes VAT. Above about {formatNumber(tabId === "send" ? 2_000_000 : 250_000)} emails
              a month, Enterprise pricing is usually lower.
            </p>
          </>
        ) : (
          <p className="text-body text-text-muted">Enter your monthly volume to see an estimate.</p>
        )}
      </div>
    </div>
  );
}

export function PricingExplorer({ initialTab }: { initialTab: PricingTabId }) {
  const [tabId, setTabId] = useState<PricingTabId>(initialTab);
  const [currency, setCurrency] = useState<Currency>("NGN");

  return (
    <Tabs value={tabId} onValueChange={(v) => setTabId(v as PricingTabId)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList aria-label="Product">
          {pricingTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Currency</legend>
          {(["NGN", "USD"] as const).map((c) => (
            <label
              key={c}
              className={cn(
                "flex h-9 cursor-pointer items-center rounded-control border px-3 text-body has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary max-md:h-11",
                currency === c
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border-strong text-text-muted",
              )}
            >
              <input
                type="radio"
                name="currency"
                value={c}
                checked={currency === c}
                onChange={() => setCurrency(c)}
                className="sr-only"
              />
              {c === "NGN" ? "₦ Naira" : "$ US dollar"}
            </label>
          ))}
        </fieldset>
      </div>

      {pricingTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="flex flex-col gap-8">
          <p className="prose-width text-body-lg text-text-muted">{tab.intro}</p>
          <div className="grid gap-6 lg:grid-cols-3">
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
                <PlanPrice plan={plan} currency={currency} />
                <Button asChild variant={plan.highlighted ? "primary" : "secondary"}>
                  <Link href={plan.cta.href}>{plan.cta.label}</Link>
                </Button>
                <div className="flex flex-col gap-3 border-t border-border pt-6">
                  <ul className="flex flex-col gap-1">
                    {plan.limits.map((limit) => (
                      <li key={limit} className="text-small font-medium text-text">
                        {limit}
                      </li>
                    ))}
                  </ul>
                  <ul className="flex flex-col gap-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-body text-text-muted">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
          <Calculator key={`${tab.id}-calc`} tabId={tab.id} currency={currency} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
