import { describe, expect, it } from "vitest";
import { tenantConfigSchema } from "../tenant-config";
import { generateSamples, industryPacks } from "./index";

describe("industry packs", () => {
  for (const pack of Object.values(industryPacks)) {
    describe(pack.id, () => {
      it("has a valid tenant config", () => {
        const result = tenantConfigSchema.safeParse(pack.config);
        expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
      });

      it("maps every category and the escalation team to a pack team", () => {
        const teams = new Set(pack.teams.map((t) => t.key));
        for (const category of pack.config.categories)
          expect(teams.has(category.team), category.key).toBe(true);
        expect(teams.has(pack.config.escalation.team)).toBe(true);
      });

      it("has 5–10 knowledge-base entries", () => {
        expect(pack.kb.length).toBeGreaterThanOrEqual(5);
        expect(pack.kb.length).toBeLessThanOrEqual(10);
      });

      it("generates ~500 deterministic samples over 30 days with the expected mix", () => {
        const samples = generateSamples(pack);
        expect(samples).toHaveLength(500);
        expect(generateSamples(pack).map((s) => s.id)).toEqual(samples.map((s) => s.id));
        expect(new Set(samples.map((s) => s.id)).size).toBe(500);
        expect(Math.max(...samples.map((s) => s.ageMinutes))).toBeLessThanOrEqual(30 * 24 * 60);
        const categories = new Set(pack.config.categories.map((c) => c.key));
        for (const s of samples)
          if (s.classifier) expect(categories.has(s.classifier.category), s.id).toBe(true);
        expect(samples.some((s) => s.classifier?.escalation.flag)).toBe(true);
        expect(samples.some((s) => s.inReplyTo)).toBe(true);
        expect(samples.some((s) => s.aiFails)).toBe(true);
        expect(samples.some((s) => s.headers?.["Auto-Submitted"])).toBe(true);
        // Replies always come after the email they reply to.
        const index = new Map(samples.map((s, i) => [s.id, i]));
        for (const s of samples)
          if (s.inReplyTo) expect(index.get(s.inReplyTo) ?? -1).toBeLessThan(index.get(s.id) ?? 0);
      });
    });
  }
});
