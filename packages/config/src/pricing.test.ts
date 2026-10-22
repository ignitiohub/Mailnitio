import { describe, expect, it } from "vitest";
import { estimateMonthlyCost, pricingTabs, recommendPlan } from "./pricing";

const tab = (id: string) => {
  const found = pricingTabs.find((t) => t.id === id);
  if (!found) throw new Error(`missing tab ${id}`);
  return found;
};
const plan = (tabId: string, planId: string) => {
  const found = tab(tabId).plans.find((p) => p.id === planId);
  if (!found) throw new Error(`missing plan ${planId}`);
  return found;
};

describe("pricing config", () => {
  it("has the three tabs from the brief", () => {
    expect(pricingTabs.map((t) => t.label)).toEqual(["Helpdesk (native)", "Helpdesk (middleware)", "Send"]);
  });

  it("prices native Helpdesk per agent", () => {
    expect(estimateMonthlyCost(plan("helpdesk-native", "hd-growth"), { emails: 5_000, agents: 4 })).toEqual({
      min: 100,
      max: 140,
    });
  });

  it("adds overage above the included volume", () => {
    expect(
      estimateMonthlyCost(plan("helpdesk-middleware", "mw-byok"), { emails: 40_000, agents: 1 }),
    ).toEqual({
      min: 700,
      max: 700,
    });
  });

  it("does not price a plan above its limit when it has no published overage", () => {
    expect(
      estimateMonthlyCost(plan("helpdesk-native", "hd-starter"), { emails: 3_000, agents: 2 }),
    ).toBeNull();
  });

  it("never prices trials or custom plans", () => {
    expect(estimateMonthlyCost(plan("helpdesk-native", "hd-pilot"), { emails: 100, agents: 1 })).toBeNull();
    expect(
      estimateMonthlyCost(plan("helpdesk-middleware", "mw-enterprise"), { emails: 100, agents: 1 }),
    ).toBeNull();
  });

  it("recommends the cheapest plan that fits", () => {
    expect(recommendPlan(tab("helpdesk-native"), { emails: 1_500, agents: 3 })?.id).toBe("hd-starter");
    expect(recommendPlan(tab("helpdesk-native"), { emails: 8_000, agents: 3 })?.id).toBe("hd-growth");
    expect(recommendPlan(tab("helpdesk-middleware"), { emails: 30_000, agents: 1 })?.id).toBe("mw-byok");
    expect(recommendPlan(tab("send"), { emails: 2_000, agents: 1 })?.id).toBe("send-free");
    expect(recommendPlan(tab("send"), { emails: 60_000, agents: 1 })?.id).toBe("send-starter");
  });
});
