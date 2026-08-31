import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import {
  countClientPlanUsage,
  checkEvoPlanQuota,
  checkClientPlanQuota,
  countThisMonthPlanUsage,
  countThisMonthCoachPlanJobs,
} from "@/lib/tier-limits";

/**
 * 2026-09-01 owner decree: «توليد الخطط بيتحسب من الرصيد سواء عن طريق
 * المدرب او عن طريق ايفو» — the client's monthly plan balance is ONE pool:
 *   EVO-self generations (evo_chat_usage, source plan_*)
 * + coach/admin AI generations for this client (done ai_jobs).
 *
 * These tests mock the service-role client with fixed counts and pin the
 * combined arithmetic + the three consumers (chat check, coach-side
 * client check, individual counters).
 */

const h = vi.hoisted(() => {
  // Per-table "count" results returned by the fake query builder.
  const counts: Record<string, number> = { evo_chat_usage: 0, ai_jobs: 0 };
  // Rows returned for the subscriptions fallback-tier lookup.
  const subTiers: string[] = [];
  return { counts, subTiers };
});

type CountRow = { count: number | null; error: unknown };
interface FakeBuilder extends PromiseLike<CountRow> {
  select: () => FakeBuilder;
  eq: () => FakeBuilder;
  gt: () => FakeBuilder;
  gte: () => FakeBuilder;
  limit: () => FakeBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
}

vi.mock("@/lib/supabase/admin", () => {
  const makeBuilder = (table: string): FakeBuilder => {
    const outcome = (): Promise<CountRow> =>
      table === "subscriptions"
        ? Promise.resolve({
            count: null,
            error: null,
            data: h.subTiers.map((tier) => ({ tier })),
          } as unknown as CountRow)
        : Promise.resolve({ count: h.counts[table] ?? 0, error: null });
    const builder: FakeBuilder = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      gte: () => builder,
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

describe("client plan balance — one pool for coach + EVO (2026-09-01)", () => {
  beforeEach(() => {
    h.counts.evo_chat_usage = 0;
    h.counts.ai_jobs = 0;
    h.subTiers.length = 0;
  });

  beforeAll(() => {});

  it("countClientPlanUsage = EVO rows + coach jobs", async () => {
    h.counts.evo_chat_usage = 2;
    h.counts.ai_jobs = 3;
    expect(await countClientPlanUsage("client-1", "nutrition")).toBe(5);
  });

  it("individual counters stay independent", async () => {
    h.counts.evo_chat_usage = 2;
    h.counts.ai_jobs = 3;
    expect(await countThisMonthPlanUsage("client-1", "workout")).toBe(2);
    expect(await countThisMonthCoachPlanJobs("client-1", "workout")).toBe(3);
  });

  it("checkEvoPlanQuota (chat path) blocks when the COMBINED pool hits the tier limit", async () => {
    h.counts.evo_chat_usage = 1;
    h.counts.ai_jobs = 2; // premium limit = 3 → 1+2 = 3 → exhausted
    const r = await checkEvoPlanQuota("client-1", "nutrition", "premium");
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(3);
    expect(r.limit).toBe(3);
  });

  it("checkEvoPlanQuota still allows under the combined limit", async () => {
    h.counts.evo_chat_usage = 1;
    h.counts.ai_jobs = 1; // 2/3 → allowed
    const r = await checkEvoPlanQuota("client-1", "nutrition", "premium");
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(2);
  });

  it("checkClientPlanQuota (coach path) resolves the CLIENT's tier from the DB and counts the same pool", async () => {
    h.subTiers.push("pro"); // pro limit = 6
    h.counts.evo_chat_usage = 4;
    h.counts.ai_jobs = 2; // 6/6 → exhausted
    const r = await checkClientPlanQuota("client-1", "workout");
    expect(r.tier).toBe("pro");
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(6);
    expect(r.limit).toBe(6);
  });

  it("checkClientPlanQuota allows while the pool has room", async () => {
    h.subTiers.push("coaching"); // coaching limit = 3
    h.counts.evo_chat_usage = 1;
    h.counts.ai_jobs = 1; // 2/3
    const r = await checkClientPlanQuota("client-1", "nutrition");
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(2);
  });

  it("staffHint still bypasses the chat check (staff semantics unchanged)", async () => {
    h.counts.evo_chat_usage = 99;
    h.counts.ai_jobs = 99;
    const r = await checkEvoPlanQuota("staff-user", "nutrition", "free", true);
    expect(r.unlimited).toBe(true);
    expect(r.allowed).toBe(true);
  });

  it("no active subscription resolves to free → 0-limit blocks both paths", async () => {
    h.subTiers.length = 0; // resolveTierFromDb → free (limit 0)
    const chat = await checkEvoPlanQuota("client-1", "nutrition", null);
    const coach = await checkClientPlanQuota("client-1", "workout");
    expect(chat.allowed).toBe(false);
    expect(coach.allowed).toBe(false);
  });
});
