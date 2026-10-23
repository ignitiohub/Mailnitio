export interface Industry {
  slug: string;
  name: string;
  headline: string;
  summary: string;
  /** Example categories the AI routes on; tuned per customer during onboarding. */
  categories: { name: string; example: string; team: string }[];
  /** Phrases that trigger immediate escalation to a supervisor. */
  escalationTerms: string[];
  outcomes: { metric: string; label: string }[];
  regulatoryNote: string;
}

export const industries: Industry[] = [
  {
    slug: "financial-services",
    name: "Financial services",
    headline: "Route every account, card and transfer query to the right desk",
    summary:
      "Banks, asset managers and fintechs receive thousands of emails about failed transfers, statements, KYC updates and redemptions. Mailnitio reads each one, recognises the customer and opens a ticket with the right team before anyone triages it by hand.",
    // Categories and escalation terms: industry pack in docs/prompts/mailnitio-dev-prompts.md §6.
    categories: [
      {
        name: "Complaint",
        example: "This is the third time I am writing about poor service",
        team: "Customer experience",
      },
      {
        name: "Enquiry",
        example: "What is the minimum investment for your money market fund?",
        team: "Customer service",
      },
      {
        name: "Redemption",
        example: "I want to redeem my money market units",
        team: "Investment operations",
      },
      { name: "KYC update", example: "I need to update my BVN and home address", team: "Compliance" },
      {
        name: "Statement request",
        example: "Please send my statement for July to September",
        team: "Customer service",
      },
      {
        name: "Feedback",
        example: "Your new mobile app makes top-ups much easier",
        team: "Customer experience",
      },
    ],
    escalationTerms: ["SEC", "CBN", "PenCom", "lawyer", "court", "petition", "press"],
    outcomes: [
      { metric: "94%", label: "of emails routed to the right desk first time" },
      { metric: "0", label: "duplicate tickets when customers follow up" },
      { metric: "<10s", label: "from email received to ticket created" },
    ],
    regulatoryNote:
      "Personal data is masked before any AI processing, and every routing decision is recorded in an audit trail your compliance team can export.",
  },
  {
    slug: "utilities",
    name: "Utilities",
    headline: "Separate outages from billing queries before your queues fill up",
    summary:
      "Electricity distribution and water companies see email volumes spike during outages. Mailnitio groups related reports, routes billing and metering queries to the right team, and keeps customers informed with acknowledgements.",
    categories: [
      { name: "Billing dispute", example: "I was charged for units I did not use", team: "Billing" },
      { name: "Outage report", example: "No power on Admiralty Way since 6 am", team: "Network operations" },
      {
        name: "Prepaid token issue",
        example: "I bought a token but it will not load",
        team: "Vending support",
      },
      { name: "Meter request", example: "When will my prepaid meter be installed?", team: "Metering" },
      {
        name: "New connection",
        example: "We need a new connection for our office",
        team: "Customer service",
      },
      {
        name: "Estimated billing complaint",
        example: "My estimated bill is far higher than usual",
        team: "Billing",
      },
    ],
    escalationTerms: ["NERC", "lawyer", "court", "petition", "media", "community protest"],
    outcomes: [
      { metric: "3x", label: "faster first response during outage spikes" },
      { metric: "0", label: "duplicate tickets for the same outage report" },
      { metric: "<10s", label: "to acknowledge every customer email" },
    ],
    regulatoryNote:
      "Emails that mention the regulator, legal action or the media are escalated immediately to a named supervisor queue and never wait in a general inbox.",
  },
  {
    slug: "telecoms",
    name: "Telecoms",
    headline: "Handle data, billing and porting emails at operator scale",
    summary:
      "Operators and internet service providers receive high volumes of emails about data bundles, billing, SIM issues and number porting. Mailnitio classifies each one, matches it to the subscriber and routes it with the right priority.",
    categories: [
      { name: "Data bundle issue", example: "My 20GB bundle was used up in two days", team: "Data support" },
      { name: "Billing query", example: "Why was I charged twice this month?", team: "Billing" },
      { name: "SIM replacement", example: "I lost my SIM and need a replacement", team: "SIM services" },
      { name: "Number porting", example: "I want to port my number to your network", team: "Porting desk" },
      {
        name: "Enterprise connectivity",
        example: "Our office fibre link is down",
        team: "Enterprise support",
      },
    ],
    escalationTerms: ["SIM swap fraud", "NCC complaint", "service outage", "legal", "data breach"],
    outcomes: [
      { metric: "94%", label: "of emails routed correctly without manual triage" },
      { metric: "40%", label: "fewer emails handled twice" },
      { metric: "<10s", label: "from email received to ticket created" },
    ],
    regulatoryNote:
      "Subscriber identifiers such as phone numbers and SIM serials are masked before AI processing.",
  },
  {
    slug: "insurance",
    name: "Insurance",
    headline: "Get claims, renewals and policy changes to the right handler",
    summary:
      "Insurers and brokers receive emails with claim documents, renewal questions and policy changes. Mailnitio identifies the policyholder, recognises the request and routes it to claims, underwriting or customer service.",
    categories: [
      { name: "New claim", example: "I want to report an accident involving my car", team: "Claims" },
      { name: "Claim follow-up", example: "Any update on claim CLM-20931?", team: "Claims" },
      { name: "Policy renewal", example: "My policy expires next week, how do I renew?", team: "Renewals" },
      { name: "Policy change", example: "Please add my spouse to my health plan", team: "Underwriting" },
      { name: "Premium payment", example: "I paid my premium but it shows as outstanding", team: "Finance" },
    ],
    escalationTerms: ["NAICOM", "complaint to regulator", "lawyer", "repudiated claim", "death"],
    outcomes: [
      { metric: "2x", label: "faster routing of new claims to handlers" },
      { metric: "0", label: "duplicate claim tickets from follow-up emails" },
      { metric: "100%", label: "of decisions recorded in the audit trail" },
    ],
    regulatoryNote:
      "Claim documents stay in your mailbox and helpdesk. Only masked text is sent for AI classification.",
  },
  {
    slug: "education",
    name: "Education",
    headline: "Answer admissions, fees and records emails without the backlog",
    summary:
      "Universities, schools and training providers receive seasonal surges of emails about admissions, fees, transcripts and results. Mailnitio routes each one to the right office and sends an acknowledgement so applicants know their email arrived.",
    categories: [
      {
        name: "Admissions",
        example: "Has my application for MSc Data Science been received?",
        team: "Admissions",
      },
      {
        name: "Fees and payments",
        example: "I paid my school fees but my portal shows a balance",
        team: "Bursary",
      },
      {
        name: "Transcript request",
        example: "Please send my transcript to a university abroad",
        team: "Records",
      },
      { name: "Results query", example: "My result for CSC 301 is missing", team: "Examinations" },
      {
        name: "Hostel and welfare",
        example: "I need to change my hostel allocation",
        team: "Student affairs",
      },
    ],
    escalationTerms: ["harassment", "safety", "medical emergency", "legal", "exam malpractice"],
    outcomes: [
      { metric: "100%", label: "of applicants receive an acknowledgement" },
      { metric: "60%", label: "less time spent sorting the shared inbox" },
      { metric: "<10s", label: "from email received to ticket created" },
    ],
    regulatoryNote:
      "Student records are protected with workspace isolation, role-based access and a full audit log.",
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((industry) => industry.slug === slug);
}
