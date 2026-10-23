import { describe, expect, it } from "vitest";
import { upcomingDemoDays } from "./slots";

describe("demo slots", () => {
  it("offers only weekdays, in West Africa Time, at least 24 hours ahead", () => {
    // Friday 23 Oct 2026, 15:00 WAT
    const days = upcomingDemoDays(new Date("2026-10-23T14:00:00Z"));
    expect(days[0]?.date).toBe("2026-10-26"); // Monday
    expect(days.every((d) => ![0, 6].includes(new Date(`${d.date}T12:00:00Z`).getUTCDay()))).toBe(true);
    expect(days[0]?.slots[0]?.iso).toBe("2026-10-26T09:00:00+01:00");
    expect(days).toHaveLength(10);
  });

  it("drops slots within the next 24 hours", () => {
    // Monday 26 Oct 2026, 11:30 WAT: Tuesday 09:00-11:00 are too soon
    const days = upcomingDemoDays(new Date("2026-10-26T10:30:00Z"));
    expect(days[0]?.date).toBe("2026-10-27");
    expect(days[0]?.slots[0]?.label).toBe("13:00");
  });
});
