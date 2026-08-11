import { NextRequest, NextResponse } from "next/server";
import { regenerateMeal } from "@/lib/plan-generator";

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
 * Tries OpenRouter's best free models in order, throws if all fail.
 */
export const maxDuration = 60; // 3 min

export async function POST(request: NextRequest) {
 try {
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
