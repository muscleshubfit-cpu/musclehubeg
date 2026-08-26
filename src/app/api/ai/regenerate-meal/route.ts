import { NextRequest, NextResponse } from "next/server";
import { regenerateMeal } from "@/lib/plan-generator";
import { requireUser, isAuthConfigured } from "@/lib/auth-server";
import { checkAndRecordSwap } from "@/lib/tier-limits";

/**
 * Regenerate a single meal — used by both the coach (in the plan editor)
 * and the client (via the swap button, even for coach-added plans).
 *
 * POST /api/ai/regenerate-meal
 * Body: {
 * meal: { name, items: [{food, amount, calories}], notes },
 * targetCalories?: number, // optional override (defaults to current meal total)
 * clientContext?: ClientContext,
 * coachNote?: string // optional instructions
 * }
 *
 * Returns: { meal, source }
 *
 * Auth: any logged-in user (requireUser).
 *
 * C-REGEN FIX (2026-08-27): regenerating a meal is functionally identical
 * to a meal swap — it now consumes the SAME weekly tier quota via
 * checkAndRecordSwap(userId, "meal"). Previously this endpoint had NO quota
 * enforcement at all and was a trivial bypass of the swap limit.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
 try {
 // Any logged-in user — coach + clients both use this.
 let userId: string | undefined;
 let authTier: string | undefined;
 if (isAuthConfigured) {
 const auth = await requireUser(request);
 if (auth instanceof Response) return auth;
 userId = auth.id;
 authTier = auth.membership_tier;
 }

 const body = await request.json();
 const { meal, targetCalories, clientContext, coachNote } = body as {
 meal: any;
 targetCalories?: number;
 clientContext?: any;
 coachNote?: string;
 };

 if (!meal || !meal.items) {
 return NextResponse.json(
 { error: "Missing required field: meal (must have items array)" },
 { status: 400 },
 );
 }

 // Enforce the same weekly meal-swap quota as /api/ai/swap (free = 0).
 if (userId) {
 const limitCheck = await checkAndRecordSwap(userId, "meal", authTier);
 if (!limitCheck.allowed) {
 const limitText =
 limitCheck.limit === 0
 ? "Meal regeneration is available on Premium and higher tiers."
 : `You've used ${limitCheck.used}/${limitCheck.limit} swaps this week. The limit resets on Monday.`;
 return NextResponse.json(
 {
 error: `⏰ ${limitText}`,
 rateLimited: true,
 used: limitCheck.used,
 limit: limitCheck.limit,
 },
 { status: 429, headers: { "Retry-After": "3600" } },
 );
 }
 }

 const result = await regenerateMeal(meal, targetCalories, clientContext, coachNote);
 return NextResponse.json(result);
 } catch (e: any) {
 console.error("[api/ai/regenerate-meal] Error:", e?.message || e);
 return NextResponse.json(
 { error: e?.message || "Failed to regenerate meal" },
 { status: 500 },
 );
 }
}
