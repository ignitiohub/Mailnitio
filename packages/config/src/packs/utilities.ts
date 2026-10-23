import type { IndustryPack } from "./types";

const ACK_BODY = `Dear {{customer_first_name}},

Thank you for contacting Acme Electricity Distribution. Your request is logged as {{ticket_number}} with our {{team_name}} team.

{{business_hours}}

For emergencies such as exposed cables, call 0700 000 0000 immediately.

{{signature}}`;

export const utilitiesPack: IndustryPack = {
  id: "utilities",
  name: "Utilities",
  workspaceName: "Acme Electricity Distribution",
  domain: "acmepower.ng",
  config: {
    displayName: "Acme Electricity Distribution",
    industry: "Utilities",
    defaultCategory: "billing_dispute",
    categories: [
      {
        key: "billing_dispute",
        label: "Billing dispute",
        description: "The customer disputes a bill, charge or debt on their account.",
        include: ["wrong bill", "overcharged", "dispute", "charged for units"],
        exclude: ["estimated"],
        team: "billing",
        defaultPriority: "medium",
      },
      {
        key: "outage_report",
        label: "Outage report",
        description: "No power, low voltage or a fault affecting a street, estate or area.",
        include: ["no power", "no light", "outage", "transformer", "low voltage", "blackout"],
        exclude: [],
        team: "network_operations",
        defaultPriority: "high",
      },
      {
        key: "prepaid_token_issue",
        label: "Prepaid token issue",
        description: "A purchased prepaid token does not load, is rejected, or was not received.",
        include: ["token", "not loading", "rejected", "vending"],
        exclude: [],
        team: "vending",
        defaultPriority: "high",
      },
      {
        key: "meter_request",
        label: "Meter request",
        description: "Requests for a new, replacement or upgraded meter, or a chase on meter installation.",
        include: ["meter", "MAP", "installation", "faulty meter"],
        exclude: ["token"],
        team: "metering",
        defaultPriority: "medium",
      },
      {
        key: "new_connection",
        label: "New connection",
        description: "Applications for a new supply connection to a property.",
        include: ["new connection", "new building", "connect my property"],
        exclude: [],
        team: "new_connections",
        defaultPriority: "low",
      },
      {
        key: "estimated_billing_complaint",
        label: "Estimated billing complaint",
        description: "Complaints about estimated (not metered) bills being too high.",
        include: ["estimated bill", "estimated billing", "crazy bill", "no meter"],
        exclude: [],
        team: "billing",
        defaultPriority: "medium",
      },
      {
        key: "spam",
        label: "Spam",
        description: "Unsolicited promotional or suspicious email not from a customer.",
        include: ["guaranteed returns", "click to register"],
        exclude: [],
        team: "billing",
        defaultPriority: "low",
      },
    ],
    thresholds: { high: 0.85, low: 0.6, spam: 0.9, context: 0.7 },
    escalation: {
      terms: ["NERC", "lawyer", "court", "petition", "media", "community protest"],
      team: "escalations",
    },
    threading: {
      ticketPattern: "MN-\\d+",
      reopenDays: 7,
      closurePhrases: [
        "power has been restored",
        "light is back",
        "all sorted",
        "issue resolved",
        "token loaded",
      ],
    },
    ack: {
      enabled: true,
      businessHours:
        "Our customer care team works every day from 7am to 9pm WAT. Outage reports are monitored 24 hours a day.",
      signature: "Customer Care\nAcme Electricity Distribution",
      templates: { default: { subject: "RE: {{subject}} [{{ticket_number}}]", body: ACK_BODY } },
    },
    pii: { customPatterns: ["\\b0\\d{10}\\b"] },
    thirdPartyDomains: [],
  },
  teams: [
    { key: "billing", name: "Billing", emailAlias: "billing@acmepower.ng" },
    { key: "network_operations", name: "Network Operations", emailAlias: "faults@acmepower.ng" },
    { key: "vending", name: "Vending", emailAlias: "vending@acmepower.ng" },
    { key: "metering", name: "Metering", emailAlias: "metering@acmepower.ng" },
    { key: "new_connections", name: "New Connections", emailAlias: "connections@acmepower.ng" },
    { key: "escalations", name: "Escalations", emailAlias: "escalations@acmepower.ng" },
  ],
  mailboxes: [
    {
      address: "customercare@acmepower.ng",
      displayName: "Customer care",
      defaultCategory: "billing_dispute",
      mode: "live",
      ackEnabled: true,
    },
    {
      address: "faults@acmepower.ng",
      displayName: "Faults",
      defaultCategory: "outage_report",
      mode: "live",
      ackEnabled: true,
    },
    {
      address: "metering@acmepower.ng",
      displayName: "Metering",
      defaultCategory: "meter_request",
      mode: "shadow",
      ackEnabled: false,
    },
  ],
  agents: [
    {
      name: "Halima Bello",
      email: "halima.bello@acmepower.ng",
      role: "supervisor",
      teams: ["billing", "escalations"],
    },
    { name: "Segun Ojo", email: "segun.ojo@acmepower.ng", role: "agent", teams: ["network_operations"] },
    { name: "Amaka Obi", email: "amaka.obi@acmepower.ng", role: "agent", teams: ["vending", "billing"] },
    {
      name: "Usman Aliyu",
      email: "usman.aliyu@acmepower.ng",
      role: "agent",
      teams: ["metering", "new_connections"],
    },
  ],
  cannedResponses: [
    {
      title: "Outage acknowledged",
      team: "network_operations",
      body: "Dear {{customer_first_name}},\n\nOur engineers are aware of the outage in your area and are working to restore supply.\n\nRegards,\n{{agent_name}}",
    },
    {
      title: "Token reloaded",
      team: "vending",
      body: "Dear {{customer_first_name}},\n\nWe have regenerated your token. Please enter the new 20-digit code sent by SMS.\n\nRegards,\n{{agent_name}}",
    },
    {
      title: "Bill reviewed",
      team: "billing",
      body: "Dear {{customer_first_name}},\n\nWe have reviewed your bill and applied an adjustment. Your revised bill will be sent by email.\n\nRegards,\n{{agent_name}}",
    },
  ],
  kb: [
    {
      topic: "Token not loading",
      questions: ["My token is not loading"],
      answer:
        "Check the meter number, then enter the token again. If it is rejected, reply with the receipt and we will regenerate it.",
    },
    {
      topic: "Meter installation",
      questions: ["When will my meter be installed?"],
      answer: "Meters are installed within 10 working days of payment under the MAP scheme.",
    },
    {
      topic: "Estimated billing",
      questions: ["Why is my bill estimated?"],
      answer: "Customers without a meter are billed on estimates set by the regulator for their band.",
    },
    {
      topic: "New connection",
      questions: ["How do I apply for a new connection?"],
      answer: "Apply online with the property documents and a certificate from a licensed electrician.",
    },
    {
      topic: "Outage reporting",
      questions: ["How do I report an outage?"],
      answer: "Email faults@acmepower.ng with your area and nearest landmark, or call our 24-hour line.",
    },
  ],
  templates: [
    {
      category: "outage_report",
      weight: 24,
      subjects: [
        "No power in {area}",
        "Outage on our street since yesterday",
        "Transformer fault in {area}",
        "Low voltage in {area}",
      ],
      bodies: [
        "There has been no power in {area} since 6am. Several houses on the street are affected.",
        "The transformer serving our estate in {area} exploded last night. When will it be fixed?",
        "We have had very low voltage in {area} for {days} days and appliances are getting damaged.",
      ],
      summaries: [
        "No power in {area}",
        "Transformer fault in {area}",
        "Low voltage in {area} for {days} days",
      ],
      reasons: ["Customer reports loss of supply affecting an area"],
      replies: [
        "Dear {name},\n\nOur engineers have replaced the faulty component and power has been restored in {area}.\n\nRegards",
      ],
    },
    {
      category: "billing_dispute",
      weight: 18,
      subjects: ["Wrong bill for {month}", "I was overcharged", "Dispute on my account"],
      bodies: [
        "My bill for {month} is {amount} but I was away for most of the month. Please review it.",
        "I was charged for {units} units that I did not use. Meter number {meter}.",
      ],
      summaries: ["Disputes the {month} bill of {amount}", "Disputes a charge for {units} units"],
      reasons: ["Customer disputes a specific bill amount"],
      replies: [
        "Dear {name},\n\nWe reviewed your account and applied an adjustment to your {month} bill.\n\nRegards",
      ],
    },
    {
      category: "prepaid_token_issue",
      weight: 18,
      subjects: ["Token not loading", "Token rejected by meter", "Did not receive my token"],
      bodies: [
        "I bought a token of {amount} this morning but the meter rejects it. Meter number {meter}, ref {ref}.",
        "I paid {amount} for a token but never received the code. Ref {ref}.",
      ],
      summaries: ["Token of {amount} rejected by meter {meter}", "Token for {amount} not received"],
      reasons: ["Customer cannot load a purchased token"],
      replies: [
        "Dear {name},\n\nWe have regenerated your token and sent it by SMS. Please try again.\n\nRegards",
      ],
    },
    {
      category: "meter_request",
      weight: 14,
      subjects: ["Meter installation", "Faulty meter", "When will my meter be installed?"],
      bodies: [
        "I paid for a meter under the MAP scheme {days} weeks ago and it has not been installed.",
        "My meter {meter} has stopped displaying units since last week.",
      ],
      summaries: ["Chases a MAP meter installation", "Reports a faulty meter {meter}"],
      reasons: ["Customer requests a meter installation or repair"],
      replies: [
        "Dear {name},\n\nYour meter installation has been scheduled for this week. Our installer will call before the visit.\n\nRegards",
      ],
    },
    {
      category: "new_connection",
      weight: 8,
      subjects: ["New connection for my building", "Application for a new connection"],
      bodies: ["I have completed a new building in {area} and would like to apply for a new connection."],
      summaries: ["Applies for a new connection in {area}"],
      reasons: ["Application for a new supply"],
      replies: [
        "Dear {name},\n\nThank you for your application. Our team will inspect the property within 10 working days.\n\nRegards",
      ],
    },
    {
      category: "estimated_billing_complaint",
      weight: 18,
      subjects: ["Crazy estimated bill", "Estimated billing complaint", "Why is my bill estimated?"],
      bodies: [
        "I keep receiving estimated bills of {amount} even though we barely have light. Please give me a meter.",
        "My estimated bill went up to {amount} this month. This is not fair.",
      ],
      summaries: ["Complains about estimated bills of {amount}", "Estimated bill increased to {amount}"],
      reasons: ["Customer complains about estimated billing"],
      replies: [
        "Dear {name},\n\nWe have adjusted your estimated bill and added your property to the next meter installation batch.\n\nRegards",
      ],
    },
  ],
  escalationEmails: [
    {
      subject: "Petition to NERC about outages in {area}",
      body: "We have had no power in {area} for {days} days. The community is planning a protest and we will petition NERC.",
      reason: "Threatens a regulator petition and community protest",
    },
    {
      subject: "Our lawyer will contact you",
      body: "You disconnected our supply without notice. Our lawyer will take this to court.",
      reason: "Mentions legal action",
    },
  ],
  followUpLines: {
    continuation: [
      "Still no power here. Any update?",
      "The token still does not load.",
      "Please, this is urgent.",
    ],
    closure: ["Power has been restored, thank you.", "Token loaded, all sorted.", "Issue resolved, thanks."],
    newIssue: [
      { line: "Also, my bill for {month} is wrong.", category: "billing_dispute" },
      { line: "Also, my meter is now showing an error.", category: "meter_request" },
    ],
  },
  insightReport: {
    title: "Insight report: Acme Electricity Distribution",
    period: "Sample of 3,100 anonymised emails, July to September 2026",
    emailsAnalysed: 3100,
    misroutedShare: 0.19,
    duplicateShare: 0.24,
    autoAnswerShare: 0.18,
    topics: [
      { label: "Outage report", share: 0.31, volume: 961, misrouted: 0.12, autoAnswerCandidate: false },
      { label: "Prepaid token issue", share: 0.2, volume: 620, misrouted: 0.21, autoAnswerCandidate: true },
      {
        label: "Estimated billing complaint",
        share: 0.18,
        volume: 558,
        misrouted: 0.17,
        autoAnswerCandidate: false,
      },
      { label: "Billing dispute", share: 0.14, volume: 434, misrouted: 0.22, autoAnswerCandidate: false },
      { label: "Meter request", share: 0.12, volume: 372, misrouted: 0.26, autoAnswerCandidate: true },
      { label: "New connection", share: 0.05, volume: 155, misrouted: 0.3, autoAnswerCandidate: true },
    ],
    findings: [
      "Outage reports spike 6x during storms; 24% of emails are repeat reports of the same outage.",
      "Token issues sent to customercare@ wait 9 hours longer than those sent to vending.",
      "Meter installation questions are standard and suitable for knowledge-base answers.",
    ],
  },
};
