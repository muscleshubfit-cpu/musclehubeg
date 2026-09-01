import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import {
  countClientPlanUsage,
  checkEvoPlanQuota,
  checkClientPlanQuota,
  countThisMonthPlanUsage,
  countThisMonthCoachPlanJobs,
  weekStartUtc,
} from "@/lib/tier-limits";

/**
 * 2026-09-01 owner decree: «توليد الخطط بيتحسب من الرصيد سواء عن طريق
 * المدرب او عن طريق ايفو» — the client's plan balance is ONE pool:
 *   EVO-self generations (evo_chat_usage, source plan_*)
 * + coach/admin AI generations for this client (done ai_jobs).
 *
 * 2026-09-02 owner decree: «١+١ أسبوعية اجمالى ٤+٤ شهريا بدلا من ٣+٣
 * شهريا» — the pool is governed by TWO windows: a WEEKLY cap (premium/
 * coaching 1+1 · pro 2+2, Monday-anchored UTC) AND a MONTHLY total
 * (premium/coaching 4+4 · pro 8+8). Both must pass.
 *
 * These tests mock the service-role client with WINDOW-AWARE fixed
 * counts (the fake query builder inspects the gte("created_at", since)
 * instant to decide whether the caller counts the month or the week) and
 * pin the combined arithmetic + the two-window verdicts.
 */

const h = vi.hoisted(() => {
  // Per-table "count" results per window, returned by the fake builder.
  const month: Record<string, number> = { evo_chat_usage: 0, ai_jobs: 0 };
  const week: Record<string, number> = { evo_chat_usage: 0, ai_jobs: 0 };
  // Rows returned for the subscriptions fallback-tier lookup.
  const subTiers: string[] = [];
  return { month, week, subTiers };
});

type CountRow = { count: number | null; error: unknown };
interface FakeBuilder extends PromiseLike<CountRow> {
  select: () => FakeBuilder;
  eq: () => FakeBuilder;
  gt: () => FakeBuilder;
  gte: (col: string, since: string) => FakeBuilder;
  limit: () => FakeBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
}

vi.mock("@/lib/supabase/admin", () => {
  const makeBuilder = (table: string): FakeBuilder => {
    let window: "month" | "week" = "month";
    const outcome = (): Promise<CountRow> => {
      if (table === "subscriptions") {
        return Promise.resolve({
          count: null,
          error: null,
          data: h.subTiers.map((tier) => ({ tier })),
        } as unknown as CountRow);
      }
      const counts = window === "week" ? h.week : h.month;
      return Promise.resolve({ count: counts[table] ?? 0, error: null });
    };
    const builder: FakeBuilder = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      gte: (_col: string, since: string) => {
        window = since === weekStartUtc() ? "week" : "month";
        return builder;
      },
      limit: () => builder,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      // await builder → the count shape used by the head:true counters
      then: (onfulfilled, onrejected) => outcome().then(onfulfilled, onrejected),
    };
    return builder;
  };
  return {
    isSupabaseAdminConfigured: true,
    supabaseAdmin: { from: (table: string) => makeBuilder(table) },
  };
});

describe("client plan balance — one pool, weekly cap + monthly total", () => {
  beforeEach(() => {
    h.month.evo_chat_usage = 0;
    h.month.ai_jobs = 0;
    h.week.evo_chat_usage = 0;
    h.week.ai_jobs = 0;
    h.subTiers.length = 0;
  });

  beforeAll(() => {});

  it("countClientPlanUsage (month window) = EVO rows + coach jobs", async () => {
    h.month.evo_chat_usage = 2;
    h.month.ai_jobs = 3;
    expect(await countClientPlanUsage("client-1", "nutrition")).toBe(5);
  });

  it("individual month counters stay independent", async () => {
    h.month.evo_chat_usage = 2;
    h.month.ai_jobs = 3;
    expect(await countThisMonthPlanUsage("client-1", "workout")).toBe(2);
    expect(await countThisMonthCoachPlanJobs("client-1", "workout")).toBe(3);
  });

  it("checkEvoPlanQuota blocks when the COMBINED pool hits the MONTHLY total (premium 4)", async () => {
    h.month.evo_chat_usage = 3;
    h.month.ai_jobs = 1; // premium monthly total = 4 → 3+1 = 4 → exhausted
    const r = await checkEvoPlanQuota("client-1", "nutrition", "premium");
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(4);
    expect(r.limit).toBe(4);
    expect(r.blockedBy).toBe("month");
  });

  it("checkEvoPlanQuota blocks on the WEEKLY cap while the month still has room (premium 1/wk)", async () => {
    h.month.evo_chat_usage = 1;
    h.month.ai_jobs = 1; // 2/4 monthly → room
    h.week.evo_chat_usage = 1;
    h.week.ai_jobs = 0; // weekly cap = 1 → 1/1 → blocked
    const r = await checkEvoPlanQuota("client-1", "nutrition", "premium");
    expect(r.allowed).toBe(false);
    expect(r.blockedBy).toBe("week");
    expect(r.weekly).toEqual({ used: 1, limit: 1 });
    expect(r.used).toBe(2);
    expect(r.limit).toBe(4);
  });

  it("checkEvoPlanQuota still allows under both windows", async () => {
    h.month.evo_chat_usage = 1;
    h.month.ai_jobs = 1; // 2/4 monthly
    h.week.evo_chat_usage = 0;
    h.week.ai_jobs = 0; // 0/1 weekly
    const r = await checkEvoPlanQuota("client-1", "nutrition", "premium");
    expect(r.allowed).toBe(true);
    expect(r.blockedBy).toBeNull();
    expect(r.used).toBe(2);
  });

  it("pro enforces 2× the ladder: monthly total 8, weekly cap 2", async () => {
    h.subTiers.push("pro");
    h.month.evo_chat_usage = 6;
    h.month.ai_jobs = 2; // 8/8 monthly → exhausted
    h.week.evo_chat_usage = 1;
    h.week.ai_jobs = 1; // 2/2 weekly would also block; month is checked first
    const r = await checkClientPlanQuota("client-1", "workout");
    expect(r.tier).toBe("pro");
    expect(r.allowed).toBe(false);
    expect(r.blockedBy).toBe("month");
    expect(r.used).toBe(8);
    expect(r.limit).toBe(8);
  });

  it("checkClientPlanQuota resolves the CLIENT's tier and allows while both windows have room", async () => {
    h.subTiers.push("coaching"); // coaching: monthly 4, weekly 1
    h.month.evo_chat_usage = 1;
    h.month.ai_jobs = 1; // 2/4 monthly
    const r = await checkClientPlanQuota("client-1", "nutrition");
    expect(r.tier).toBe("coaching");
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(2);
    expect(r.limit).toBe(4);
    expect(r.weekly).toEqual({ used: 0, limit: 1 });
  });

  it("coach path blocks on the weekly cap too (client-side window)", async () => {
    h.subTiers.push("premium");
    h.week.ai_jobs = 1; // coach generated 1 this week → weekly cap 1 hit
    const r = await checkClientPlanQuota("client-1", "nutrition");
    expect(r.allowed).toBe(false);
    expect(r.blockedBy).toBe("week");
    expect(r.weekly).toEqual({ used: 1, limit: 1 });
  });

  it("staffHint still bypasses the chat check (staff semantics unchanged)", async () => {
    h.month.evo_chat_usage = 99;
    h.month.ai_jobs = 99;
    const r = await checkEvoPlanQuota("staff-user", "nutrition", "free", true);
    expect(r.unlimited).toBe(true);
    expect(r.allowed).toBe(true);
    expect(r.blockedBy).toBeNull();
  });

  it("no active subscription resolves to free → 0-limit blocks both paths", async () => {
    h.subTiers.length = 0; // resolveTierFromDb → free (limit 0)
    const chat = await checkEvoPlanQuota("client-1", "nutrition", null);
    const coach = await checkClientPlanQuota("client-1", "workout");
    expect(chat.allowed).toBe(false);
    expect(coach.allowed).toBe(false);
  });

  it("window helper: week start is Monday-anchored UTC", () => {
    // Wednesday 2026-09-02 12:34 UTC → Monday 2026-08-31 00:00 UTC
    const wd = new Date(weekStartUtc(new Date("2026-09-02T12:34:56Z")));
    expect(wd.getUTCDay()).toBe(1); // Monday
    expect(wd.getUTCHours()).toBe(0);
    expect(wd.getUTCDate()).toBe(31);
    expect(wd.getUTCMonth()).toBe(7); // August
    // A Monday input anchors to itself
    const mon = new Date(weekStartUtc(new Date("2026-09-07T09:00:00Z")));
    expect(mon.getUTCDate()).toBe(7);
    expect(mon.getUTCMonth()).toBe(8); // September
  });
});
