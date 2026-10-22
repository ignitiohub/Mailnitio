import { describe, expect, it } from "vitest";
import { estimateMonthlyCost, pricingTabs, recommendPlan } from "./pricing";

const tab = (id: string) => {
  const found = pricingTabs.find((t) => t.id === id);
  if (!found) throw new Error(`missing tab ${id}`);
  return found;
};

describe("pricing config", () => {
  it("has the three tabs from the brief", () => {
    expect(pricingTabs.map((t) => t.label)).toEqual(["Helpdesk (native)", "Helpdesk (middleware)", "Send"]);
  });

  it("charges only the fee within the included volume", () => {
    const starter = tab("helpdesk-native").plans[0]!;
    expect(estimateMonthlyCost(starter, 4_000, "NGN")).toBe(150_000);
  });

  it("adds overage above the included volume", () => {
    const starter = tab("helpdesk-native").plans[0]!;
    expect(estimateMonthlyCost(starter, 6_000, "NGN")).toBe(150_000 + 1_000 * 15);
  });

  it("returns null for custom plans", () => {
    const enterprise = tab("helpdesk-native").plans.at(-1)!;
    expect(estimateMonthlyCost(enterprise, 10_000, "NGN")).toBeNull();
  });

  it("recommends the cheapest self-serve plan for a volume", () => {
    expect(recommendPlan(tab("helpdesk-native"), 2_000, "NGN")?.id).toBe("hd-starter");
    expect(recommendPlan(tab("helpdesk-native"), 60_000, "NGN")?.id).toBe("hd-growth");
    expect(recommendPlan(tab("send"), 1_000, "USD")?.id).toBe("send-payg");
  });

  it("gives every plan both currencies or neither", () => {
    for (const t of pricingTabs) {
      for (const plan of t.plans) {
        expect(plan.monthlyFee === null).toBe(plan.overagePerEmail === null);
      }
    }
  });
});
