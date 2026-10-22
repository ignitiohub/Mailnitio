/** Options for the book-a-demo form. Shared by the web form and the API schema. */

export const LEAD_ROLES = [
  "Customer service or CX leader",
  "Support supervisor or team lead",
  "IT or operations",
  "Marketing",
  "Executive",
  "Other",
] as const;

export const LEAD_COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "Egypt",
  "Côte d'Ivoire",
  "Rwanda",
  "United Kingdom",
  "Other",
] as const;

export const LEAD_VOLUMES = [
  "Under 1,000 emails a month",
  "1,000 to 10,000 emails a month",
  "10,000 to 50,000 emails a month",
  "50,000 to 250,000 emails a month",
  "Over 250,000 emails a month",
] as const;

export const LEAD_EMAIL_PLATFORMS = ["Microsoft 365 / Outlook", "Google Workspace / Gmail", "Other"] as const;

export const LEAD_CRMS = [
  "Dynamics 365",
  "Salesforce",
  "Zoho",
  "HubSpot",
  "Freshdesk or Zendesk",
  "No CRM",
  "Other",
] as const;

export const LEAD_INTERESTS = ["Helpdesk", "Send", "Both"] as const;

/** Demo calendar: 30-minute slots, weekdays, in West Africa Time. */
export const DEMO_SLOTS = {
  timezone: "Africa/Lagos",
  durationMinutes: 30,
  daysAhead: 10,
  hours: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
} as const;
