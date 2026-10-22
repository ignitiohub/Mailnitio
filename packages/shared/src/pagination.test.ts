import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./pagination";

describe("cursor pagination", () => {
  it("round-trips a cursor", () => {
    const at = new Date("2026-10-22T14:05:00.000Z");
    expect(decodeCursor(encodeCursor(at, "abc"))).toEqual({ createdAt: at, id: "abc" });
  });

  it("rejects garbage", () => {
    expect(decodeCursor("not-a-cursor")).toBeNull();
  });
});
