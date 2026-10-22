/**
 * Pricing is edited ONLY here. The pricing page, plan tables and usage calculator all read this file.
 *
 * DRAFT: figures are placeholders until the commercial brief (§4) is confirmed. See docs/decisions.md.
 * NGN and USD prices are set explicitly per plan (no live FX conversion).
 */

export type Currency = "NGN" | "USD";
export type Money = Record<Currency, number>;

export interface Plan {
  id: string;
  name: string;
  summary: string;
  /** Monthly platform fee; null means custom pricing (talk to sales). */
  monthlyFee: Money | null;
  /** Emails included in the monthly fee. */
  includedEmails: number;
  /** Price per email above the included volume; null when not self-serve. */
  overagePerEmail: Money | null;
  limits: string[];
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

export type PricingTabId = "helpdesk-native" | "helpdesk-middleware" | "send";

export interface PricingTab {
  id: PricingTabId;
  label: string;
  unit: string;
  intro: string;
  plans: Plan[];
}

export const pricingTabs: PricingTab[] = [
  {
    id: "helpdesk-native",
    label: "Helpdesk (native)",
    unit: "processed email",
    intro:
      "Tickets live in Mailnitio. Your team works in our inbox and replies go out from your own mailbox. Agent seats are included.",
    plans: [
      {
        id: "hd-starter",
        name: "Starter",
        summary: "For a single support team getting started with AI routing.",
        monthlyFee: { NGN: 150_000, USD: 99 },
        includedEmails: 5_000,
        overagePerEmail: { NGN: 15, USD: 0.01 },
        limits: ["Up to 3 mailboxes", "Up to 10 agent seats"],
        features: [
          "AI routing and ticket creation",
          "Threading and customer matching",
          "Acknowledgement emails",
          "Team inbox with SLAs",
          "Needs Review queue",
          "Shadow mode",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=hd-starter" },
      },
      {
        id: "hd-growth",
        name: "Growth",
        summary: "For multi-team support operations with higher volumes.",
        monthlyFee: { NGN: 450_000, USD: 299 },
        includedEmails: 25_000,
        overagePerEmail: { NGN: 12, USD: 0.008 },
        limits: ["Up to 10 mailboxes", "Unlimited agent seats"],
        features: [
          "Everything in Starter",
          "Training on your email history",
          "Custom categories and routing rules",
          "Supervisor dashboards",
          "Audit log export",
          "Bring your own AI key",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=hd-growth" },
        highlighted: true,
      },
      {
        id: "hd-enterprise",
        name: "Enterprise",
        summary: "For regulated organisations with custom requirements.",
        monthlyFee: null,
        includedEmails: 0,
        overagePerEmail: null,
        limits: ["Unlimited mailboxes", "Unlimited agent seats"],
        features: [
          "Everything in Growth",
          "Customer-hosted option",
          "Single sign-on and custom data retention",
          "Dedicated success manager",
          "Uptime SLA",
        ],
        cta: { label: "Talk to sales", href: "/demo?plan=hd-enterprise" },
      },
    ],
  },
  {
    id: "helpdesk-middleware",
    label: "Helpdesk (middleware)",
    unit: "processed email",
    intro:
      "Keep working in Dynamics 365 or Salesforce. Mailnitio's AI creates and updates cases in your CRM, with no extra seats to buy.",
    plans: [
      {
        id: "mw-connect",
        name: "Connect",
        summary: "One CRM environment and the mailboxes that feed it.",
        monthlyFee: { NGN: 250_000, USD: 169 },
        includedEmails: 10_000,
        overagePerEmail: { NGN: 14, USD: 0.009 },
        limits: ["1 CRM environment", "Up to 5 mailboxes"],
        features: [
          "Case creation and updates in your CRM",
          "Duplicate case prevention",
          "Queue routing by content",
          "Customer matching against CRM contacts",
          "Shadow mode",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=mw-connect" },
      },
      {
        id: "mw-scale",
        name: "Scale",
        summary: "Several queues and business units on one CRM.",
        monthlyFee: { NGN: 750_000, USD: 499 },
        includedEmails: 50_000,
        overagePerEmail: { NGN: 10, USD: 0.0065 },
        limits: ["Up to 3 CRM environments", "Up to 20 mailboxes"],
        features: [
          "Everything in Connect",
          "Training on your case history",
          "Escalation rules and SLAs",
          "Audit log export",
          "Bring your own AI key",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=mw-scale" },
        highlighted: true,
      },
      {
        id: "mw-enterprise",
        name: "Enterprise",
        summary: "Custom CRM integrations and deployment options.",
        monthlyFee: null,
        includedEmails: 0,
        overagePerEmail: null,
        limits: ["Unlimited environments", "Unlimited mailboxes"],
        features: [
          "Everything in Scale",
          "Customer-hosted option",
          "Custom CRM objects and fields",
          "Dedicated success manager",
          "Uptime SLA",
        ],
        cta: { label: "Talk to sales", href: "/demo?plan=mw-enterprise" },
      },
    ],
  },
  {
    id: "send",
    label: "Send",
    unit: "email sent",
    intro:
      "Templates, audiences and bulk sends on infrastructure tuned for inbox placement. Pay for what you send.",
    plans: [
      {
        id: "send-payg",
        name: "Pay as you go",
        summary: "No monthly fee. Pay per email sent.",
        monthlyFee: { NGN: 0, USD: 0 },
        includedEmails: 0,
        overagePerEmail: { NGN: 2.5, USD: 0.0018 },
        limits: ["1 sending domain", "Up to 5,000 contacts"],
        features: [
          "Template editor",
          "Audiences and lists",
          "Bulk sends with a live monitor",
          "SPF, DKIM and DMARC checks",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=send-payg" },
      },
      {
        id: "send-growth",
        name: "Growth",
        summary: "A monthly bundle for regular campaigns.",
        monthlyFee: { NGN: 400_000, USD: 279 },
        includedEmails: 200_000,
        overagePerEmail: { NGN: 2, USD: 0.0014 },
        limits: ["Up to 5 sending domains", "Up to 100,000 contacts"],
        features: [
          "Everything in Pay as you go",
          "Scheduled sends",
          "Automatic suppression of bounces and complaints",
          "Deliverability reports",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=send-growth" },
        highlighted: true,
      },
      {
        id: "send-enterprise",
        name: "Enterprise",
        summary: "High-volume and regulated sending.",
        monthlyFee: null,
        includedEmails: 0,
        overagePerEmail: null,
        limits: ["Unlimited domains", "Unlimited contacts"],
        features: [
          "Everything in Growth",
          "Dedicated IP addresses",
          "IP warm-up plan",
          "Dedicated success manager",
        ],
        cta: { label: "Talk to sales", href: "/demo?plan=send-enterprise" },
      },
    ],
  },
];

export const pocOffer = {
  title: "Start with a 30-day proof of concept",
  body: "Run Mailnitio in shadow mode on one mailbox. We process up to 5,000 emails at no charge and show you how each one would have been routed before anything goes live.",
  cta: { label: "Book a demo", href: "/demo?offer=poc" },
} as const;

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: "What counts as a processed email?",
    answer:
      "Each inbound customer email that Mailnitio reads, classifies and routes counts once. Automatic replies, bounces and emails we skip as spam are not charged.",
  },
  {
    question: "Do you charge per agent seat?",
    answer:
      "No. Helpdesk plans include agent seats up to the limit shown, and Growth and above include unlimited seats.",
  },
  {
    question: "Can we pay in naira?",
    answer:
      "Yes. Every plan is priced in naira and US dollars, and invoices are issued in the currency you choose.",
  },
  {
    question: "What is shadow mode?",
    answer:
      "In shadow mode Mailnitio reads and classifies your emails and records what it would have done, without creating tickets or sending replies. You compare its decisions with your team's before going live.",
  },
  {
    question: "Can we use our own AI provider key?",
    answer:
      "Yes, on Growth and above. With your own key, AI usage is billed by your provider and your Mailnitio platform fee stays the same.",
  },
  {
    question: "What happens if we go over our included volume?",
    answer:
      "Emails above your included volume are charged at your plan's per-email rate. We never stop processing your email because of volume.",
  },
];

/** Monthly cost for a plan at a given volume, or null for custom-priced plans. */
export function estimateMonthlyCost(plan: Plan, emails: number, currency: Currency): number | null {
  if (!plan.monthlyFee || !plan.overagePerEmail) return null;
  const overage = Math.max(0, emails - plan.includedEmails) * plan.overagePerEmail[currency];
  return Math.round((plan.monthlyFee[currency] + overage) * 100) / 100;
}

/** The cheapest self-serve plan for a volume; custom-priced plans are excluded. */
export function recommendPlan(tab: PricingTab, emails: number, currency: Currency): Plan | null {
  let best: { plan: Plan; cost: number } | null = null;
  for (const plan of tab.plans) {
    const cost = estimateMonthlyCost(plan, emails, currency);
    if (cost !== null && (best === null || cost < best.cost)) best = { plan, cost };
  }
  return best?.plan ?? null;
}
