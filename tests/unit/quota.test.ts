import { describe, expect, it } from "vitest";
import { ageGroup, isPastDeadline, seatSplit } from "@/lib/utils";

describe("seatSplit (mirrors accept_application in SQL)", () => {
  it("splits 20 seats into 15 women / 5 men", () => {
    expect(seatSplit(20)).toEqual({ female: 15, male: 5 });
  });

  it("rounds the women's share up", () => {
    expect(seatSplit(10)).toEqual({ female: 8, male: 2 });
    expect(seatSplit(15)).toEqual({ female: 12, male: 3 });
    expect(seatSplit(1)).toEqual({ female: 1, male: 0 });
  });

  it("respects a custom ratio", () => {
    expect(seatSplit(10, 0.5)).toEqual({ female: 5, male: 5 });
  });

  it("returns null for unlimited capacity", () => {
    expect(seatSplit(null)).toBeNull();
  });
});

describe("helpers", () => {
  it("groups ages for reports", () => {
    expect(ageGroup(16)).toBe("15-17");
    expect(ageGroup(24)).toBe("18-24");
    expect(ageGroup(29)).toBe("25-29");
    expect(ageGroup(35)).toBe("30-35");
    expect(ageGroup(null)).toBe("unknown");
  });

  it("detects past deadlines", () => {
    expect(isPastDeadline(new Date(Date.now() - 60_000).toISOString())).toBe(true);
    expect(isPastDeadline(new Date(Date.now() + 60_000).toISOString())).toBe(false);
    expect(isPastDeadline(null)).toBe(false);
  });
});
