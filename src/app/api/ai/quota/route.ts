import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import {
  countTodayChatUsage,
  countThisMonthPlanUsage,
  planQuotaFor,
  evoChatLimitFor,
  type EvoPlanKind,
} from "@/lib/tier-limits";

/**
 * GET /api/ai/quota — Phase 69 (owner-approved): the EVO QUOTA METER.
 *
 * The study (Phase 64) found the advertised "3/6 plans per month" was
 * invisible until the member hit the 429 bubble. This read-only endpoint
 * powers the in-widget counters:
 *   - chat:      today's messages used vs daily limit (null = unlimited)
 *   - nutrition: this month's meal-plan generations vs monthly quota
 *   - workout:   this month's workout-plan generations vs monthly quota
 *
 * Counting reads the SAME tamper-proof ledgers the enforcement writes
 * (evo_chat_usage / plan_swaps) so display always matches enforcement.
 * Read-only — nothing is recorded here.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) {
    // Anonymous visitors: free-tier chat limit (10/day), no plan generation
    return NextResponse.json({
      chat: { used: 0, limit: evoChatLimitFor("free"), unlimited: false },
      nutrition: { used: 0, limit: 0, unlimited: false },
      workout: { used: 0, limit: 0, unlimited: false },
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
  const plans: Record<string, { used: number; limit: number | null; unlimited: boolean }> = {};
  for (const kind of kinds) {
    const limit = planQuotaFor(tier, kind);
    const used = limit === null ? 0 : await countThisMonthPlanUsage(auth.id, kind);
    plans[kind] = {
      used,
      limit,
      unlimited: limit === null,
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
