import { describe, it, expect } from "vitest";
import { evoChatLimitFor, swapLimitForTier } from "@/lib/tier-limits";

describe("tier-limits", () => {
  describe("evoChatLimitFor", () => {
    it("free: 10 messages/day", () => {
      expect(evoChatLimitFor("free")).toBe(10);
    });

    it("premium: unlimited (null)", () => {
      expect(evoChatLimitFor("premium")).toBeNull();
    });

    it("pro: unlimited (null)", () => {
      expect(evoChatLimitFor("pro")).toBeNull();
    });

    it("coaching: unlimited (null)", () => {
      expect(evoChatLimitFor("coaching")).toBeNull();
    });
  });

  describe("swapLimitForTier", () => {
    it("free: 0 swaps (no swaps allowed)", () => {
      expect(swapLimitForTier("free")).toBe(0);
    });

    it("premium: 3 swaps/week", () => {
      expect(swapLimitForTier("premium")).toBe(3);
    });

    it("pro: 6 swaps/week", () => {
      expect(swapLimitForTier("pro")).toBe(6);
    });

    it("coaching: 3 swaps/week (same as premium)", () => {
      expect(swapLimitForTier("coaching")).toBe(3);
    });
  });
});
