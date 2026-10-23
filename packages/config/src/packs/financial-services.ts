import type { IndustryPack } from "./types";

const ACK_BODY = `Dear {{customer_first_name}},

Thank you for contacting Acme Asset Management. We have received your email and opened ticket {{ticket_number}} with our {{team_name}} team.

{{business_hours}}

Please keep {{ticket_number}} in the subject line if you write to us again about this request.

{{signature}}`;

export const financialServicesPack: IndustryPack = {
  id: "financial-services",
  name: "Financial services",
  workspaceName: "Acme Asset Management",
  domain: "acmeasset.ng",
  config: {
    displayName: "Acme Asset Management",
    industry: "Financial services",
    defaultCategory: "enquiry",
    categories: [
      {
        key: "complaint",
        label: "Complaint",
        description:
          "The customer is unhappy with a service, delay, charge or staff interaction and wants it put right.",
        include: [
          "poor service",
          "unacceptable",
          "still waiting",
          "disappointed",
          "third time",
          "charged twice",
        ],
        exclude: ["thank you for resolving"],
        team: "complaints",
        defaultPriority: "high",
      },
      {
        key: "enquiry",
        label: "Enquiry",
        description: "A general question about products, rates, processes or how to do something.",
        include: ["how do I", "what is", "minimum investment", "interest rate", "can I"],
        exclude: [],
        team: "enquiries",
        defaultPriority: "medium",
      },
      {
        key: "redemption",
        label: "Redemption",
        description:
          "A request to redeem, withdraw or liquidate units or investments, or a chase on a pending redemption.",
        include: ["redeem", "redemption", "withdraw", "liquidate", "payout", "units"],
        exclude: [],
        team: "redemptions",
        defaultPriority: "high",
      },
      {
        key: "kyc_update",
        label: "KYC update",
        description: "Updating identity or contact details: BVN, address, phone, next of kin, ID documents.",
        include: ["BVN", "update my address", "next of kin", "change my phone", "KYC", "ID card"],
        exclude: [],
        team: "kyc",
        defaultPriority: "medium",
      },
      {
        key: "statement_request",
        label: "Statement request",
        description: "A request for an account statement, valuation, tax certificate or transaction history.",
        include: ["statement", "valuation", "transaction history", "tax certificate"],
        exclude: ["statement is wrong"],
        team: "statements",
        defaultPriority: "low",
      },
      {
        key: "feedback",
        label: "Feedback",
        description: "Compliments, suggestions or general feedback with no request to act on.",
        include: ["suggestion", "feedback", "well done", "great service"],
        exclude: [],
        team: "enquiries",
        defaultPriority: "low",
      },
      {
        key: "spam",
        label: "Spam",
        description: "Unsolicited promotional or suspicious email not from a customer.",
        include: ["guaranteed returns", "click to register", "lottery"],
        exclude: [],
        team: "enquiries",
        defaultPriority: "low",
      },
    ],
    thresholds: { high: 0.85, low: 0.6, spam: 0.9, context: 0.7 },
    escalation: {
      terms: ["SEC", "CBN", "PenCom", "lawyer", "court", "petition", "press"],
      team: "escalations",
    },
    threading: {
      ticketPattern: "MN-\\d+",
      reopenDays: 14,
      closurePhrases: [
        "thank you, that is resolved",
        "issue resolved",
        "all sorted",
        "no further action",
        "you can close this",
      ],
    },
    ack: {
      enabled: true,
      businessHours:
        "Our team works Monday to Friday, 8am to 5pm WAT, and replies to most emails within one working day.",
      signature: "Customer Experience Team\nAcme Asset Management\n+234 1 700 0000",
      templates: {
        default: { subject: "RE: {{subject}} [{{ticket_number}}]", body: ACK_BODY },
        complaint: {
          subject: "RE: {{subject}} [{{ticket_number}}]",
          body: `Dear {{customer_first_name}},

We are sorry to hear about your experience. Your complaint has been logged as {{ticket_number}} and assigned to our {{team_name}} team, who will contact you within one working day.

{{signature}}`,
        },
      },
    },
    pii: { customPatterns: ["\\bAAM-\\d{6}\\b"] },
    thirdPartyDomains: ["acme-ifa.example", "okeke-legal.example"],
  },
  teams: [
    { key: "complaints", name: "Complaints", emailAlias: "complaints@acmeasset.ng" },
    { key: "enquiries", name: "Enquiries", emailAlias: "enquiries@acmeasset.ng" },
    { key: "redemptions", name: "Redemptions", emailAlias: "redemptions@acmeasset.ng" },
    { key: "kyc", name: "KYC", emailAlias: "kyc@acmeasset.ng" },
    { key: "statements", name: "Statements", emailAlias: "statements@acmeasset.ng" },
    { key: "escalations", name: "Escalations", emailAlias: "escalations@acmeasset.ng" },
  ],
  mailboxes: [
    {
      address: "complaints@acmeasset.ng",
      displayName: "Complaints",
      defaultCategory: "complaint",
      mode: "live",
      ackEnabled: true,
    },
    {
      address: "enquiries@acmeasset.ng",
      displayName: "Enquiries",
      defaultCategory: "enquiry",
      mode: "live",
      ackEnabled: true,
    },
    {
      address: "redemptions@acmeasset.ng",
      displayName: "Redemptions",
      defaultCategory: "redemption",
      mode: "live",
      ackEnabled: true,
    },
    {
      address: "statements@acmeasset.ng",
      displayName: "Statements",
      defaultCategory: "statement_request",
      mode: "shadow",
      ackEnabled: false,
    },
  ],
  agents: [
    {
      name: "Babatunde Adeyemi",
      email: "babatunde.adeyemi@acmeasset.ng",
      role: "supervisor",
      teams: ["complaints", "escalations"],
    },
    {
      name: "Chidinma Okeke",
      email: "chidinma.okeke@acmeasset.ng",
      role: "agent",
      teams: ["complaints", "enquiries"],
    },
    { name: "Yusuf Danjuma", email: "yusuf.danjuma@acmeasset.ng", role: "agent", teams: ["redemptions"] },
    {
      name: "Grace Afolabi",
      email: "grace.afolabi@acmeasset.ng",
      role: "agent",
      teams: ["kyc", "statements"],
    },
    { name: "Emeka Nwankwo", email: "emeka.nwankwo@acmeasset.ng", role: "reviewer", teams: ["escalations"] },
  ],
  cannedResponses: [
    {
      title: "Redemption received",
      team: "redemptions",
      body: "Dear {{customer_first_name}},\n\nWe have received your redemption request. Redemptions are paid within 3 working days to the bank account on your profile.\n\nRegards,\n{{agent_name}}",
    },
    {
      title: "Statement sent",
      team: "statements",
      body: "Dear {{customer_first_name}},\n\nPlease find your statement attached. It covers all transactions for the period you requested.\n\nRegards,\n{{agent_name}}",
    },
    {
      title: "KYC documents needed",
      team: "kyc",
      body: "Dear {{customer_first_name}},\n\nTo update your details, please send a valid ID and a utility bill dated within the last 3 months.\n\nRegards,\n{{agent_name}}",
    },
    {
      title: "Complaint acknowledgement",
      team: "complaints",
      body: "Dear {{customer_first_name}},\n\nI am sorry for the inconvenience. I am looking into this personally and will update you by end of day.\n\nRegards,\n{{agent_name}}",
    },
    {
      title: "Minimum investment",
      body: "Dear {{customer_first_name}},\n\nThe minimum investment for the Money Market Fund is ₦10,000, with additional investments from ₦5,000.\n\nRegards,\n{{agent_name}}",
    },
  ],
  kb: [
    {
      topic: "Minimum investment",
      questions: ["What is the minimum investment?", "How much do I need to start?"],
      answer:
        "The minimum investment is ₦10,000 for the Money Market Fund and ₦50,000 for the Fixed Income Fund.",
    },
    {
      topic: "Redemption timeline",
      questions: ["How long does a redemption take?", "When will I get my money?"],
      answer: "Redemptions are paid within 3 working days of a complete request.",
    },
    {
      topic: "Statement request",
      questions: ["How do I get my statement?"],
      answer: "Statements are available in the customer portal or by email on request.",
    },
    {
      topic: "KYC update",
      questions: ["How do I update my BVN?", "How do I change my address?"],
      answer: "Send a valid ID and a recent utility bill to kyc@acmeasset.ng.",
    },
    {
      topic: "Interest rates",
      questions: ["What is the current yield?"],
      answer: "Current yields are published every Monday on the website under Fund prices.",
    },
    {
      topic: "Account opening",
      questions: ["How do I open an account?"],
      answer: "Open an account online in 10 minutes with your BVN, ID and a passport photograph.",
    },
  ],
  templates: [
    {
      category: "complaint",
      weight: 18,
      subjects: [
        "Very poor service on my account",
        "Still waiting after {days} days",
        "Charged twice for one transaction",
        "Complaint about your customer service",
        "Unacceptable delay with my request",
      ],
      bodies: [
        "This is the third time I am writing about the {amount} that was debited from my account {account} without explanation. Nobody has replied.",
        "I submitted a request {days} days ago and I am still waiting. This is unacceptable for a company of your size.",
        "I was charged twice for the same top-up of {amount}. Please reverse the extra charge immediately.",
        "Your staff at the branch were rude to me yesterday and I want this escalated to a manager.",
      ],
      summaries: [
        "Customer complains about an unexplained {amount} debit",
        "Customer complains about a {days}-day delay",
        "Duplicate charge of {amount}",
      ],
      reasons: [
        "Customer expresses dissatisfaction and asks for the problem to be fixed",
        "Repeated chasing and negative tone indicate a complaint",
      ],
      replies: [
        "Dear {name},\n\nI am sorry for the experience. I have confirmed the duplicate charge and a reversal of {amount} has been processed. You will see it within 24 hours.\n\nRegards",
        "Dear {name},\n\nThank you for your patience. Your request has now been completed and I have added a note to your profile so this does not happen again.\n\nRegards",
      ],
    },
    {
      category: "enquiry",
      weight: 22,
      subjects: [
        "Minimum investment for {fund}",
        "Question about interest rates",
        "How do I open an account for my child?",
        "Enquiry about the {fund}",
      ],
      bodies: [
        "What is the minimum investment for the {fund} and how often is interest paid?",
        "Can I invest in the {fund} through the mobile app or do I need to visit a branch?",
        "I would like to know the current yield on the {fund} before I invest {amount}.",
      ],
      summaries: [
        "Asks about the minimum investment for the {fund}",
        "Asks about current yields",
        "Asks how to invest via the app",
      ],
      reasons: [
        "General product question with no complaint or account change",
        "Customer asks how a product works",
      ],
      replies: [
        "Dear {name},\n\nThe minimum investment for the {fund} is ₦10,000 and interest is credited monthly. You can invest directly in the mobile app.\n\nRegards",
      ],
    },
    {
      category: "redemption",
      weight: 20,
      subjects: [
        "Redemption request",
        "Please redeem my {fund} units",
        "Status of my redemption",
        "Withdrawal of {amount}",
      ],
      bodies: [
        "I would like to redeem {amount} from my {fund} investment. Please pay into my account {account}.",
        "I submitted a redemption of {amount} last week and have not received the money. Kindly confirm the status. Ref {ref}.",
        "Please liquidate all my units in the {fund} and transfer the proceeds to my bank.",
      ],
      summaries: [
        "Requests redemption of {amount} from the {fund}",
        "Chases a pending redemption ({ref})",
        "Requests full liquidation of {fund} units",
      ],
      reasons: ["Explicit request to redeem units", "Customer chases payment of a redemption"],
      replies: [
        "Dear {name},\n\nYour redemption of {amount} has been processed and paid to your account ending in {account}. Please allow up to 24 hours for it to reflect.\n\nRegards",
      ],
    },
    {
      category: "kyc_update",
      weight: 14,
      subjects: ["Update my BVN", "Change of address", "Update next of kin details", "New phone number"],
      bodies: [
        "Please update my BVN to {bvn} on my profile.",
        "I have moved to {area}. Please update my address on your records.",
        "Kindly change my registered phone number to {phone}.",
      ],
      summaries: [
        "Requests a BVN update",
        "Requests an address change to {area}",
        "Requests a phone number change",
      ],
      reasons: ["Customer asks to change identity or contact details"],
      replies: [
        "Dear {name},\n\nYour details have been updated. Thank you for keeping your profile up to date.\n\nRegards",
      ],
    },
    {
      category: "statement_request",
      weight: 16,
      subjects: [
        "Statement request for {month}",
        "Please send my account statement",
        "Tax certificate request",
        "Valuation statement",
      ],
      bodies: [
        "Please send my statement for {month} to this email address.",
        "I need a valuation statement for my {fund} investment for a visa application.",
        "Kindly send my transaction history for the last 6 months.",
      ],
      summaries: [
        "Requests the {month} statement",
        "Requests a valuation statement for a visa application",
        "Requests 6 months of transaction history",
      ],
      reasons: ["Customer asks for a statement or account document"],
      replies: ["Dear {name},\n\nPlease find your statement attached.\n\nRegards"],
    },
    {
      category: "feedback",
      weight: 6,
      subjects: ["Great service", "Suggestion for the app", "Feedback on your new website"],
      bodies: [
        "I want to say well done to the team. My redemption was paid the same day.",
        "A suggestion: please add a dark mode and monthly statements in the app.",
      ],
      summaries: ["Positive feedback on fast redemption", "Suggests app improvements"],
      reasons: ["Feedback with no request to act on"],
      replies: [
        "Dear {name},\n\nThank you for your kind words. We have shared them with the team.\n\nRegards",
      ],
    },
  ],
  escalationEmails: [
    {
      subject: "Formal complaint: I will report you to the SEC",
      body: "My redemption of {amount} has been pending for {days} weeks. If it is not paid by Friday I will file a petition with the SEC and speak to the press.",
      reason: "Threatens a regulator complaint and press involvement",
    },
    {
      subject: "Legal action over my investment",
      body: "My lawyer will be contacting you. I have been unable to access {amount} for over a month despite many emails.",
      reason: "Mentions legal action through a lawyer",
    },
    {
      subject: "Complaint to CBN about unauthorised debit",
      body: "An unauthorised debit of {amount} was taken from account {account}. I have prepared a complaint to the CBN.",
      reason: "Regulator complaint about an unauthorised debit",
    },
  ],
  followUpLines: {
    continuation: [
      "Any update on this? I am still waiting.",
      "Please treat this as urgent, I need the money this week.",
      "I have attached the document you asked for.",
    ],
    closure: [
      "Thank you, that is resolved. You can close this.",
      "Received, all sorted. Thanks a lot.",
      "Issue resolved, thank you for your help.",
    ],
    newIssue: [
      { line: "Also, my statement for {month} is wrong.", category: "statement_request" },
      { line: "Separately, please update my phone number to {phone}.", category: "kyc_update" },
      { line: "By the way, I also want to redeem {amount} from the {fund}.", category: "redemption" },
    ],
  },
  insightReport: {
    title: "Insight report: Acme Asset Management",
    period: "Sample of 2,400 anonymised emails, July to September 2026",
    emailsAnalysed: 2400,
    misroutedShare: 0.23,
    duplicateShare: 0.17,
    autoAnswerShare: 0.21,
    topics: [
      { label: "Redemption", share: 0.27, volume: 648, misrouted: 0.19, autoAnswerCandidate: false },
      { label: "Statement request", share: 0.19, volume: 456, misrouted: 0.31, autoAnswerCandidate: true },
      { label: "Enquiry", share: 0.18, volume: 432, misrouted: 0.12, autoAnswerCandidate: true },
      { label: "Complaint", share: 0.16, volume: 384, misrouted: 0.28, autoAnswerCandidate: false },
      { label: "KYC update", share: 0.14, volume: 336, misrouted: 0.22, autoAnswerCandidate: false },
      { label: "Feedback", share: 0.06, volume: 144, misrouted: 0.35, autoAnswerCandidate: false },
    ],
    findings: [
      "Almost 1 in 4 emails reached the wrong mailbox; statements and feedback were misrouted most often.",
      "17% of emails were follow-ups that created duplicate cases in your current process.",
      "About 1 in 5 emails ask standard questions (minimum investment, statement access) that the knowledge base can answer.",
      "Complaints sent to the enquiries mailbox waited 2.3 days longer for a first response than those sent to complaints@.",
    ],
  },
};
