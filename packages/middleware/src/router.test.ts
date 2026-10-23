import { industryPacks } from "@mailnitio/config/packs";
import { describe, expect, it } from "vitest";
import { findEscalationTerms, type RouteInput, route } from "./router";

const config = industryPacks["financial-services"].config;

const base = (overrides: Partial<RouteInput> = {}): RouteInput => ({
  config,
  mailboxDefaultCategory: "complaint",
  classification: {
    category: "redemption",
    confidence: 0.94,
    priority: "high",
    escalation: { flag: false, reason: null },
  },
  escalationTerms: [],
  customerFlags: [],
  ...overrides,
});

describe("router decision table (middleware spec §11.2)", () => {
  it("routes high confidence to the category team without review, and marks reroutes", () => {
    const d = route(base());
    expect(d).toMatchObject({
      team: "redemptions",
      originalTeam: "complaints",
      rerouted: true,
      needsReview: false,
    });
  });

  it("does not mark a reroute when the category matches the mailbox", () => {
    const d = route(base({ mailboxDefaultCategory: "redemption" }));
    expect(d.rerouted).toBe(false);
  });

  it("routes medium confidence to the category team but asks for review", () => {
    const d = route(base({ classification: { ...base().classification!, confidence: 0.72 } }));
    expect(d).toMatchObject({ team: "redemptions", needsReview: true, reviewReasons: ["medium_confidence"] });
  });

  it("sends low confidence to the mailbox default team for review", () => {
    const d = route(base({ classification: { ...base().classification!, confidence: 0.4 } }));
    expect(d).toMatchObject({
      team: "complaints",
      category: "complaint",
      needsReview: true,
      reviewReasons: ["low_confidence"],
    });
  });

  it("treats the threshold values as inclusive at the top of each band", () => {
    expect(route(base({ classification: { ...base().classification!, confidence: 0.85 } })).needsReview).toBe(
      false,
    );
    expect(
      route(base({ classification: { ...base().classification!, confidence: 0.6 } })).reviewReasons,
    ).toEqual(["medium_confidence"]);
  });

  it("escalates on rule terms, overriding a confident classification", () => {
    const d = route(base({ escalationTerms: ["SEC"] }));
    expect(d).toMatchObject({ team: "escalations", escalated: true, priority: "urgent", needsReview: true });
    expect(d.escalationReason).toContain("SEC");
  });

  it("escalates on the AI flag", () => {
    const d = route(
      base({
        classification: {
          ...base().classification!,
          escalation: { flag: true, reason: "Threatens legal action" },
        },
      }),
    );
    expect(d).toMatchObject({
      team: "escalations",
      escalated: true,
      escalationReason: "Threatens legal action",
    });
  });

  it("skips confident spam without review", () => {
    const d = route(
      base({
        classification: {
          category: "spam",
          confidence: 0.95,
          priority: "low",
          escalation: { flag: false, reason: null },
        },
      }),
    );
    expect(d).toMatchObject({ skip: true, needsReview: false });
  });

  it("does not skip spam below the spam threshold", () => {
    const d = route(
      base({
        classification: {
          category: "spam",
          confidence: 0.86,
          priority: "low",
          escalation: { flag: false, reason: null },
        },
      }),
    );
    expect(d.skip).toBe(false);
  });

  it("falls back to the mailbox default when the AI failed", () => {
    const d = route(base({ classification: null }));
    expect(d).toMatchObject({
      team: "complaints",
      category: "complaint",
      needsReview: true,
      reviewReasons: ["ai_failed"],
    });
  });

  it("falls back when the AI returns an unknown category", () => {
    const d = route(base({ classification: { ...base().classification!, category: "mortgage" } }));
    expect(d).toMatchObject({ team: "complaints", reviewReasons: ["unknown_category"] });
  });

  it("adds customer flags as review reasons", () => {
    const d = route(base({ customerFlags: ["third_party_sender"] }));
    expect(d).toMatchObject({
      team: "redemptions",
      needsReview: true,
      reviewReasons: ["third_party_sender"],
    });
  });

  it("uses the workspace default category when the mailbox default is not a category", () => {
    const d = route(base({ mailboxDefaultCategory: "unknown", classification: null }));
    expect(d.category).toBe(config.defaultCategory);
  });
});

describe("escalation terms", () => {
  it("matches acronyms case-sensitively and words case-insensitively", () => {
    expect(findEscalationTerms("I will report you to the SEC", config.escalation.terms)).toEqual(["SEC"]);
    expect(findEscalationTerms("my second request", config.escalation.terms)).toEqual([]);
    expect(findEscalationTerms("My Lawyer will call", config.escalation.terms)).toEqual(["lawyer"]);
    expect(findEscalationTerms("I am pressing for an answer", config.escalation.terms)).toEqual([]);
  });
});
