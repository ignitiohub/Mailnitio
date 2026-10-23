/**
 * Legal pages. DRAFT copy pending legal review before production launch (see docs/decisions.md).
 */

export interface LegalDoc {
  slug: "terms" | "privacy" | "aup";
  title: string;
  summary: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
}

export const legalDocs: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms of service",
    summary: "The agreement between Ignitio Hub and organisations that use Mailnitio.",
    updated: "22 Oct 2026",
    sections: [
      {
        heading: "1. Who these terms apply to",
        paragraphs: [
          'These terms govern access to Mailnitio Helpdesk, Mailnitio Send and related services provided by Ignitio Hub ("we", "us"). By creating a workspace, you agree to them on behalf of your organisation.',
          "Where you have signed an order form or master agreement with us, that agreement takes precedence over these terms.",
        ],
      },
      {
        heading: "2. Your account and workspace",
        paragraphs: [
          "You are responsible for the people you invite to your workspace and the roles you give them. Owners and admins must use two-factor authentication.",
          "Keep your credentials confidential and tell us promptly at security@mailnitio.com if you suspect unauthorised access.",
        ],
      },
      {
        heading: "3. Your data",
        paragraphs: [
          "You keep all rights to the emails and other data you bring to Mailnitio. We process it only to provide the service, as set out in our data processing agreement and privacy policy.",
          "You confirm you have a lawful basis to let us process the personal data contained in the emails you connect.",
        ],
      },
      {
        heading: "4. Acceptable use",
        paragraphs: [
          "You must follow our acceptable use policy. We may suspend sending or processing that breaches it, and will tell you why.",
        ],
      },
      {
        heading: "5. Fees",
        paragraphs: [
          "Fees are set out on our pricing page or in your order form. Usage above your included volume is billed monthly in arrears. Prices exclude VAT and other applicable taxes.",
        ],
      },
      {
        heading: "6. Availability and support",
        paragraphs: [
          "We aim to keep Mailnitio available at all times and publish planned maintenance in advance. Uptime commitments apply only where agreed in an order form.",
        ],
      },
      {
        heading: "7. Liability",
        paragraphs: [
          "Neither party is liable for indirect or consequential losses. Each party's total liability is limited to the fees paid in the twelve months before the claim, except where the law does not allow a limit.",
        ],
      },
      {
        heading: "8. Ending the agreement",
        paragraphs: [
          "You can close your workspace at any time. On closure we delete your data within 30 days, except where we must keep records by law. You can export your data before closing.",
        ],
      },
      {
        heading: "9. Governing law",
        paragraphs: ["These terms are governed by the laws of the Federal Republic of Nigeria."],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    summary:
      "How we collect, use and protect personal data, in line with the Nigeria Data Protection Act 2023.",
    updated: "22 Oct 2026",
    sections: [
      {
        heading: "1. Who we are",
        paragraphs: [
          "Mailnitio is provided by Ignitio Hub. For website visitors and people who book demos, we are the data controller. For emails processed on behalf of our customers, the customer is the controller and we are the processor.",
        ],
      },
      {
        heading: "2. What we collect",
        paragraphs: [
          "Demo requests: your name, work email, company, role, country, email volume, email platform, CRM and any message you write.",
          "Account holders: name, email address, password hash, two-factor settings, and sign-in records such as IP address and browser.",
          "Customer email processing: the content and metadata of emails in mailboxes our customers connect, processed only on their instructions.",
        ],
      },
      {
        heading: "3. How we use it",
        paragraphs: [
          "To respond to demo requests, provide and secure the service, keep audit records our customers rely on, and meet legal obligations. We do not sell personal data or use customer emails to train shared AI models.",
        ],
      },
      {
        heading: "4. AI processing",
        paragraphs: [
          "Personal data in customer emails is masked before any text is sent to an AI provider. Customers can bring their own AI provider key so AI processing runs under their own contract.",
        ],
      },
      {
        heading: "5. Where data is stored",
        paragraphs: [
          "Mailnitio is hosted in Frankfurt, Germany. Transfers outside Nigeria rely on safeguards recognised under the Nigeria Data Protection Act. Our sub-processors are listed on our security page.",
        ],
      },
      {
        heading: "6. How long we keep it",
        paragraphs: [
          "Demo requests are kept for up to 24 months. Account data is kept while the account is active. Customer email data is kept for the retention period the customer sets.",
        ],
      },
      {
        heading: "7. Your rights",
        paragraphs: [
          "You can ask to access, correct, delete or move your personal data, or object to how we use it, by emailing privacy@mailnitio.com. You can also complain to the Nigeria Data Protection Commission.",
        ],
      },
    ],
  },
  {
    slug: "aup",
    title: "Acceptable use policy",
    summary: "What you may and may not do with Mailnitio, including sending with Mailnitio Send.",
    updated: "22 Oct 2026",
    sections: [
      {
        heading: "1. Sending email",
        paragraphs: [
          "Only send to people who have agreed to hear from you or who have an existing relationship with your organisation. Every marketing email must include a working unsubscribe link and your organisation's contact details.",
          "Do not use purchased, rented or scraped lists.",
        ],
      },
      {
        heading: "2. Prohibited content",
        paragraphs: [
          "Do not use Mailnitio for phishing, malware, fraud, unlawful content, or messages that impersonate another organisation.",
        ],
      },
      {
        heading: "3. Deliverability thresholds",
        paragraphs: [
          "We may pause sending when bounce rates exceed 5% or complaint rates exceed 0.1% of a send, to protect your domain and other customers.",
        ],
      },
      {
        heading: "4. Security",
        paragraphs: [
          "Do not try to access other workspaces, test our security without written permission, or overload the service. Report vulnerabilities to security@mailnitio.com.",
        ],
      },
    ],
  },
];
