import { describe, it, expect } from "vitest";
import {
  REFUND_WINDOW_DAYS,
  activationDate,
  daysSinceActivation,
  eligibilityMessageAr,
} from "../refund";

/**
 * PHASE 76 — 7-day refund eligibility: pure helper coverage.
 * (The DB-coupled counters are exercised by the API smoke flow.)
 */
describe("refund eligibility helpers", () => {
  it("advertises the 7-day window", () => {
    expect(REFUND_WINDOW_DAYS).toBe(7);
  });

  it("activationDate prefers start_date over created_at", () => {
    const sub = {
      id: "s1",
      tier: "premium",
      months: 1,
      start_date: "2026-09-01T00:00:00.000Z",
      created_at: "2026-09-03T00:00:00.000Z",
      end_date: "2026-10-01T00:00:00.000Z",
    };
    expect(activationDate(sub)).toBe("2026-09-01T00:00:00.000Z");
  });

  it("activationDate falls back to created_at when start_date is null", () => {
    const sub = {
      id: "s2",
      tier: "pro",
      months: 3,
      start_date: null,
      created_at: "2026-08-30T12:00:00.000Z",
      end_date: "2026-11-30T12:00:00.000Z",
    };
    expect(activationDate(sub)).toBe("2026-08-30T12:00:00.000Z");
  });

  it("daysSinceActivation is ~0 for a just-activated subscription", () => {
    const sub = {
      id: "s3",
      tier: "premium",
      months: 1,
      start_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    };
    expect(Math.abs(daysSinceActivation(sub))).toBeLessThan(0.01);
  });

  it("daysSinceActivation grows with age (10-day-old sub)", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const sub = {
      id: "s4",
      tier: "coaching",
      months: 1,
      start_date: tenDaysAgo,
      created_at: tenDaysAgo,
      end_date: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    };
    expect(daysSinceActivation(sub)).toBeGreaterThan(9.9);
    expect(daysSinceActivation(sub)).toBeLessThan(10.1);
  });

  it("messages cover every ineligibility reason in Arabic", () => {
    expect(eligibilityMessageAr("no_subscription")).toContain("مفيش اشتراك نشط");
    expect(eligibilityMessageAr("outside_window")).toContain("7");
    expect(eligibilityMessageAr("features_used")).toContain("مميزات مدفوعة");
    expect(eligibilityMessageAr(null)).toContain("غير مؤهل");
  });
});
