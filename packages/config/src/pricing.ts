/**
 * Pricing is edited ONLY here. The pricing page, plan tables and usage calculator all read this file.
 *
 * Figures follow docs/prompts/mailnitio-dev-prompts.md §4 and docs/specs/mailnitio-platform-plan.md §34.
 * They are proposals to validate with early customers. Prices are in US dollars; naira invoicing uses a
 * local price list (Paystack), so there is no live FX conversion here.
 */

/** A price that is still a proposal is shown as a range, e.g. $12–15. */
export interface PriceRange {
  min: number;
  max: number;
}

export type PlanBasis =
  /** Price per agent per month (native Helpdesk: the team works inside Mailnitio). */
  | "per_agent"
  /** Fixed price per month (Middleware, Send). */
  | "flat"
  /** Free trial (Pilot): not a monthly plan, so the calculator never recommends it. */
  | "trial"
  /** Priced per customer. */
  | "custom";

export interface Plan {
  id: string;
  name: string;
  summary: string;
  basis: PlanBasis;
  /** USD per agent per month or per month; null for trials and custom plans. */
  price: PriceRange | null;
  /** Shown instead of a computed price, e.g. "Free for 30 days" or "From $2,000 a month". */
  priceLabel?: string;
  /** Emails included per month; null means no fixed limit is published. */
  includedEmails: number | null;
  /** USD per email above the included volume; null means the plan does not allow overage. */
  overagePerEmail: PriceRange | null;
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
  /** Extra one-off or optional items shown under the plans. */
  notes: { title: string; body: string }[];
}

export const pricingTabs: PricingTab[] = [
  {
    id: "helpdesk-native",
    label: "Helpdesk (native)",
    unit: "processed email",
    intro:
      "Your team works tickets in Mailnitio and replies go out from your own mailbox. Priced per agent, with AI routing included up to each plan's monthly email volume.",
    plans: [
      {
        id: "hd-pilot",
        name: "Pilot",
        summary: "Prove it on your own emails before you commit.",
        basis: "trial",
        price: null,
        priceLabel: "Free for 30 days",
        includedEmails: 5_000,
        overagePerEmail: null,
        features: ["1 mailbox", "Up to 5,000 emails", "Shadow mode", "Insight report on your email mix"],
        cta: { label: "Start a pilot", href: "/demo?plan=hd-pilot" },
      },
      {
        id: "hd-starter",
        name: "Starter",
        summary: "For a single support team getting started with AI routing.",
        basis: "per_agent",
        price: { min: 12, max: 15 },
        includedEmails: 2_000,
        overagePerEmail: null,
        features: [
          "1 mailbox",
          "Tickets, assignment and canned responses",
          "AI routing and acknowledgements on up to 2,000 emails a month",
          "Basic reports",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=hd-starter" },
      },
      {
        id: "hd-growth",
        name: "Growth",
        summary: "For multi-team support operations.",
        basis: "per_agent",
        price: { min: 25, max: 35 },
        includedEmails: 10_000,
        overagePerEmail: { min: 0.02, max: 0.02 },
        features: [
          "5 mailboxes",
          "Teams and SLAs",
          "Outlook sync",
          "AI suggested replies and knowledge-base answers",
          "Up to 10,000 emails a month, then about $0.02 per email",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=hd-growth" },
        highlighted: true,
      },
      {
        id: "hd-business",
        name: "Business",
        summary: "For larger teams that want AI trained on their history.",
        basis: "per_agent",
        price: { min: 45, max: 60 },
        includedEmails: 30_000,
        overagePerEmail: null,
        features: [
          "Unlimited mailboxes",
          "Advanced reports",
          "Training on your email history (Knowledge Pack)",
          "API and webhooks",
          "Up to 30,000 emails a month",
          "Bring your own AI key option",
        ],
        cta: { label: "Book a demo", href: "/demo?plan=hd-business" },
      },
    ],
    notes: [
      {
        title: "Bring your own AI key",
        body: "Use your own Azure OpenAI, Claude or Gemini key and save 20–30% on AI usage.",
      },
    ],
  },
  {
    id: "helpdesk-middleware",
    label: "Helpdesk (middleware)",
    unit: "processed email",
    intro:
      "Your team keeps working in Dynamics 365 or Salesforce. Mailnitio's AI creates and updates cases in your CRM. Priced per email, because your agents work in the CRM.",
    plans: [
      {
        id: "mw-byok",
        name: "Middleware BYOK",
        summary: "Use your own AI provider key; AI usage is billed by your provider.",
        basis: "flat",
        price: { min: 500, max: 500 },
        includedEmails: 30_000,
        overagePerEmail: { min: 0.02, max: 0.02 },
        features: [
          "Up to 30,000 processed emails a month",
          "5 mailboxes",
          "1 CRM connector",
          "AI review portal",
        ],
        cta: { label: "Book a POC", href: "/demo?plan=mw-byok" },
      },
      {
        id: "mw-managed",
        name: "Middleware Managed AI",
        summary: "Everything in BYOK, with AI included.",
        basis: "flat",
        price: { min: 1_000, max: 1_000 },
        includedEmails: 30_000,
        overagePerEmail: { min: 0.03, max: 0.03 },
        features: [
          "Up to 30,000 processed emails a month",
          "5 mailboxes",
          "1 CRM connector",
          "AI review portal",
          "AI usage included",
        ],
        cta: { label: "Book a POC", href: "/demo?plan=mw-managed" },
        highlighted: true,
      },
      {
        id: "mw-enterprise",
        name: "Enterprise",
        summary: "High volumes, several CRMs and enterprise controls.",
        basis: "custom",
        price: null,
        priceLabel: "From $2,000 a month",
        includedEmails: null,
        overagePerEmail: null,
        features: [
          "Unlimited mailboxes",
          "150,000+ emails a month",
          "Customer-hosted option and SSO",
          "SLA and priority support",
          "Quarterly retraining and auto-response",
        ],
        cta: { label: "Talk to sales", href: "/demo?plan=mw-enterprise" },
      },
    ],
    notes: [
      {
        title: "Onboarding: $2,000–5,000 one-time",
        body: "CRM integration, training on your historical emails, Knowledge Pack, shadow run and go-live.",
      },
      {
        title: "Proof of concept: free or credited",
        body: "2–4 weeks in your CRM sandbox, free or credited against onboarding if you go ahead.",
      },
    ],
  },
  {
    id: "send",
    label: "Send",
    unit: "email sent",
    intro: "Templates, audiences and bulk sends on infrastructure tuned for inbox placement.",
    plans: [
      {
        id: "send-free",
        name: "Free",
        summary: "For trying Send and low-volume notifications.",
        basis: "flat",
        price: { min: 0, max: 0 },
        includedEmails: 3_000,
        overagePerEmail: null,
        features: [
          "3,000 emails a month (100 a day)",
          "1 sending domain",
          "API and templates",
          "Mailnitio branding in marketing footers",
        ],
        cta: { label: "Join the waitlist", href: "/demo?plan=send-free&interest=Send" },
      },
      {
        id: "send-starter",
        name: "Starter",
        summary: "For regular transactional and notice sends.",
        basis: "flat",
        price: { min: 10, max: 15 },
        includedEmails: 20_000,
        overagePerEmail: { min: 0.0004, max: 0.0008 },
        features: ["20,000 emails a month", "3 sending domains", "Webhooks", "30-day logs"],
        cta: { label: "Join the waitlist", href: "/demo?plan=send-starter&interest=Send" },
      },
      {
        id: "send-growth",
        name: "Growth",
        summary: "For campaigns to your customer base.",
        basis: "flat",
        price: { min: 35, max: 50 },
        includedEmails: 100_000,
        overagePerEmail: { min: 0.0004, max: 0.0008 },
        features: ["100,000 emails a month", "Campaigns and A/B tests", "10,000 contacts", "90-day logs"],
        cta: { label: "Join the waitlist", href: "/demo?plan=send-growth&interest=Send" },
        highlighted: true,
      },
      {
        id: "send-scale",
        name: "Scale",
        summary: "For high-volume senders.",
        basis: "custom",
        price: null,
        priceLabel: "From about $150 a month",
        includedEmails: null,
        overagePerEmail: null,
        features: ["500,000+ emails a month", "Dedicated IP option", "Priority support"],
        cta: { label: "Talk to sales", href: "/demo?plan=send-scale&interest=Send" },
      },
    ],
    notes: [
      {
        title: "Overage: about $0.40–0.80 per 1,000 emails",
        body: "On Starter and Growth, emails above your monthly volume are charged per thousand.",
      },
    ],
  },
];

export const pocOffer = {
  title: "Start with a free 30-day pilot",
  body: "Run Mailnitio in shadow mode on one mailbox. We process up to 5,000 of your emails and give you an insight report on how each one would have been routed, before anything goes live.",
  cta: { label: "Start a pilot", href: "/demo?offer=pilot" },
} as const;

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: "Why is native Helpdesk priced per agent but middleware per email?",
    answer:
      "With native Helpdesk your team works inside Mailnitio, so pricing follows the number of agents. In middleware mode your team works in your CRM, so pricing follows the emails Mailnitio processes.",
  },
  {
    question: "What counts as a processed email?",
    answer:
      "Each inbound customer email that Mailnitio reads, classifies and routes counts once. Automatic replies, bounces and emails skipped as spam are not counted.",
  },
  {
    question: "Can we pay in naira?",
    answer:
      "Yes. Prices are shown in US dollars; we invoice in naira from a local price list, reviewed quarterly for exchange-rate moves.",
  },
  {
    question: "What is shadow mode?",
    answer:
      "In shadow mode Mailnitio reads and classifies your emails and records what it would have done, without creating tickets or sending replies. You compare its decisions with your team's before going live.",
  },
  {
    question: "Can we use our own AI provider key?",
    answer:
      "Yes. On Business and Middleware BYOK you can use your own Azure OpenAI, Claude or Gemini key, so AI processing runs under your own contract and saves 20–30% on AI usage.",
  },
  {
    question: "Are these prices final?",
    answer:
      "They are our launch prices and may change as we learn from early customers. Your quote and contract always state the price you pay.",
  },
];

export interface CostEstimate {
  min: number;
  max: number;
}

/**
 * Monthly cost of a plan for a volume (and agents for per-agent plans), or null when the plan cannot be
 * self-priced: trials, custom plans, or volumes above the included limit without published overage.
 */
export function estimateMonthlyCost(
  plan: Plan,
  input: { emails: number; agents: number },
): CostEstimate | null {
  if (!plan.price || plan.basis === "trial" || plan.basis === "custom") return null;
  const over = plan.includedEmails === null ? 0 : Math.max(0, input.emails - plan.includedEmails);
  if (over > 0 && !plan.overagePerEmail) return null;
  const seats = plan.basis === "per_agent" ? Math.max(1, input.agents) : 1;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    min: round(plan.price.min * seats + over * (plan.overagePerEmail?.min ?? 0)),
    max: round(plan.price.max * seats + over * (plan.overagePerEmail?.max ?? 0)),
  };
}

/** The cheapest plan (by upper estimate) that can serve the volume; null means "talk to sales". */
export function recommendPlan(tab: PricingTab, input: { emails: number; agents: number }): Plan | null {
  let best: { plan: Plan; cost: number } | null = null;
  for (const plan of tab.plans) {
    const cost = estimateMonthlyCost(plan, input);
    if (cost !== null && (best === null || cost.max < best.cost)) best = { plan, cost: cost.max };
  }
  return best?.plan ?? null;
}
