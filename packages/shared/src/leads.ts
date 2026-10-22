import {
  LEAD_COUNTRIES,
  LEAD_CRMS,
  LEAD_EMAIL_PLATFORMS,
  LEAD_INTERESTS,
  LEAD_ROLES,
  LEAD_VOLUMES,
} from "@mailnitio/config";
import { z } from "zod";

/** Free email domains are rejected so demo requests come from work addresses. */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "ymail.com",
]);

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  workEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254)
    .refine((email) => !FREE_EMAIL_DOMAINS.has(email.split("@")[1] ?? ""), "Use your work email address"),
  company: z.string().trim().min(2, "Enter your company name").max(160),
  role: z.enum(LEAD_ROLES, { message: "Choose your role" }),
  country: z.enum(LEAD_COUNTRIES, { message: "Choose your country" }),
  monthlyVolume: z.enum(LEAD_VOLUMES, { message: "Choose your monthly email volume" }),
  emailPlatform: z.enum(LEAD_EMAIL_PLATFORMS, { message: "Choose your email platform" }),
  crm: z.enum(LEAD_CRMS, { message: "Choose your CRM" }),
  interest: z.enum(LEAD_INTERESTS).optional(),
  message: z.string().trim().max(2000).optional(),
  preferredSlot: z.string().datetime({ offset: true }).optional(),
  source: z.string().trim().max(120).optional(),
  captchaToken: z.string().max(4096).default(""),
});

export type LeadInput = z.infer<typeof leadInputSchema>;
