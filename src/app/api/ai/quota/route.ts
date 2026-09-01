import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import {
  countTodayChatUsage,
  countClientPlanUsage,
  countClientWeeklyPlanUsage,
  planQuotaFor,
  planWeeklyQuotaFor,
  evoChatLimitFor,
  type EvoPlanKind,
} from "@/lib/tier-limits";

/**
 * GET /api/ai/quota — Phase 69 (owner-approved): the EVO QUOTA METER.
 *
 * The study (Phase 64) found the advertised plan quotas were invisible
 * until the member hit the 429 bubble. This read-only endpoint powers
 * the in-widget counters:
 *   - chat:      today's messages used vs daily limit (null = unlimited)
 *   - nutrition: plan generations vs WEEKLY cap + MONTHLY total
 *   - workout:   plan generations vs WEEKLY cap + MONTHLY total
 *
 * Counting reads the SAME tamper-proof ledgers the enforcement writes
 * (evo_chat_usage + done ai_jobs) so display always matches enforcement.
 * 2026-09-01 (owner): «توليد الخطط بيتحسب من الرصيد سواء عن طريق المدرب
 * او عن طريق ايفو» — plan `used` is the COMBINED pool (member's own EVO
 * generations + coach/admin AI generations for this member).
 * 2026-09-02: WEEKLY cap (1+1 · Pro 2+2, Monday-anchored UTC) added on
 * top of the MONTHLY total (4+4 · Pro 8+8) — `weeklyUsed`/`weeklyLimit`
 * mirror what checkEvoPlanQuota/checkClientPlanQuota enforce.
 * Read-only — nothing is recorded here.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) {
    // Anonymous visitors: free-tier chat limit (10/day), no plan generation
    return NextResponse.json({
      chat: { used: 0, limit: evoChatLimitFor("free"), unlimited: false },
      nutrition: { used: 0, limit: 0, unlimited: false, weeklyUsed: 0, weeklyLimit: 0 },
      workout: { used: 0, limit: 0, unlimited: false, weeklyUsed: 0, weeklyLimit: 0 },
    });
  }

  const tier = auth.membership_tier;
  const staff = auth.is_staff;

  if (staff) {
    // STAFF QUOTA SEMANTICS — unlimited, nothing counted for display
    return NextResponse.json({
      chat: { used: 0, limit: null, unlimited: true },
      nutrition: { used: 0, limit: null, unlimited: true },
      workout: { used: 0, limit: null, unlimited: true },
      staff: true,
    });
  }

  const chatLimit = evoChatLimitFor(tier);
  const chatUsed = chatLimit === null ? 0 : await countTodayChatUsage(auth.id);

  const kinds: EvoPlanKind[] = ["nutrition", "workout"];
  const plans: Record<string, { used: number; limit: number | null; unlimited: boolean; weeklyUsed: number; weeklyLimit: number | null }> = {};
  for (const kind of kinds) {
    const limit = planQuotaFor(tier, kind);
    const weeklyLimit = planWeeklyQuotaFor(tier, kind);
    const [used, weeklyUsed] = await Promise.all([
      limit === null ? Promise.resolve(0) : countClientPlanUsage(auth.id, kind),
      weeklyLimit === null ? Promise.resolve(0) : countClientWeeklyPlanUsage(auth.id, kind),
    ]);
    plans[kind] = {
      used,
      limit,
      unlimited: limit === null && weeklyLimit === null,
      weeklyUsed,
      weeklyLimit,
    };
  }

  return NextResponse.json({
    chat: {
      used: chatUsed,
      limit: chatLimit,
      unlimited: chatLimit === null,
    },
    nutrition: plans.nutrition,
    workout: plans.workout,
  });
}
