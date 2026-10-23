import { describe, expect, it } from "vitest";
import { leadInputSchema } from "./leads";

const valid = {
  name: "Adaeze Okafor",
  workEmail: "Adaeze.Okafor@AcmeAsset.ng",
  company: "Acme Asset Management",
  role: "Customer service or CX leader",
  country: "Nigeria",
  monthlyVolume: "10,000 to 50,000 emails a month",
  emailPlatform: "Microsoft 365 / Outlook",
  crm: "Dynamics 365",
};

describe("lead input", () => {
  it("accepts a complete request and normalises the email", () => {
    const parsed = leadInputSchema.parse(valid);
    expect(parsed.workEmail).toBe("adaeze.okafor@acmeasset.ng");
  });

  it("rejects free email providers", () => {
    const result = leadInputSchema.safeParse({ ...valid, workEmail: "adaeze@gmail.com" });
    expect(result.success).toBe(false);
  });

  it("rejects values outside the option lists", () => {
    expect(leadInputSchema.safeParse({ ...valid, crm: "Oracle" }).success).toBe(false);
  });
});
