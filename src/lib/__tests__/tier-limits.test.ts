import { describe, it, expect } from "vitest";
import {
  evoChatLimitFor,
  swapLimitForTier,
  checkEvoChatLimit,
  checkEvoPlanQuota,
  checkAndRecordSwap,
} from "@/lib/tier-limits";

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

  // STAFF QUOTA SEMANTICS (2026-08-29): platform staff (role coach|admin)
  // bypass every consumer usage limit. The staffHint short-circuit fires
  // BEFORE any DB access, so these canaries run without Supabase config.
  describe("staff bypass (coach|admin)", () => {
    it("chat: staffHint=true → unlimited even on free tier", async () => {
      const r = await checkEvoChatLimit("staff-user", "free", true);
      expect(r.allowed).toBe(true);
      expect(r.unlimited).toBe(true);
      expect(r.limit).toBeNull();
    });

    it("plan quota: staffHint=true → unlimited nutrition + workout", async () => {
      const nutri = await checkEvoPlanQuota("staff-user", "nutrition", "free", true);
      const workout = await checkEvoPlanQuota("staff-user", "workout", "free", true);
      expect(nutri.allowed).toBe(true);
      expect(nutri.unlimited).toBe(true);
      expect(nutri.limit).toBeNull();
      expect(workout.allowed).toBe(true);
      expect(workout.unlimited).toBe(true);
    });

    it("swap: staffHint=true → allowed + unlimited", async () => {
      const r = await checkAndRecordSwap("staff-user", "meal", "free", true);
      expect(r.allowed).toBe(true);
      expect(r.unlimited).toBe(true);
      expect(r.limit).toBeNull();
    });

    it("non-staff free user: chat still limited to 10/day", async () => {
      // staffHint omitted → tier path; free tier limit = 10 (no DB in test
      // env → used=0 → allowed, but limit reflects the tier, not unlimited)
      const r = await checkEvoChatLimit("free-user", "free");
      expect(r.unlimited).toBe(false);
      expect(r.limit).toBe(10);
    });
  });
});
