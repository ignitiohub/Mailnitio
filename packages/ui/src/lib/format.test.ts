import { describe, expect, it } from "vitest";
import { formatCurrency, formatDateTime, formatNumber, formatRelativeTime } from "./format";

describe("format", () => {
  it("uses thousands separators", () => {
    expect(formatNumber(84200)).toBe("84,200");
  });

  it("formats naira and dollars", () => {
    expect(formatCurrency(150000, "NGN")).toBe("₦150,000");
    expect(formatCurrency(299, "USD")).toBe("$299");
  });

  it("formats dates as 22 Oct 2026, 14:05 in the workspace timezone", () => {
    expect(formatDateTime("2026-10-22T13:05:00Z", "Africa/Lagos")).toBe("22 Oct 2026, 14:05");
  });

  it("formats relative times", () => {
    const now = new Date("2026-10-22T14:05:00Z");
    expect(formatRelativeTime(new Date("2026-10-22T14:02:00Z"), now)).toBe("3 min ago");
    expect(formatRelativeTime(new Date("2026-10-22T14:04:50Z"), now)).toBe("just now");
  });
});
