import { NextRequest, NextResponse } from "next/server";
import {
  generateNutritionPlanAI,
  generateWorkoutPlanAI,
  type PlanOverrides,
} from "@/lib/plan-generator";

/**
 * Generate a workout or nutrition plan via OpenRouter AI (best free model).
 *
 * POST /api/ai/plan
 * Body: {
 *   clientId: string,
 *   planType: "workout" | "nutrition",
 *   clientContext: ClientContext,
 *   overrides?: PlanOverrides  // optional coach overrides
 * }
 *
 * The overrides let the coach specify:
 *   - targetCalories: number
 *   - macros: { protein_g, carbs_g, fat_g }
 *   - foods: string[] (preferred foods to include)
 *   - mealsCount: number
 *   - notes: string (free-text instructions)
 *
 * Returns: { title, content, source }
 *
 * Falls back to local rule-based generator if all OpenRouter models fail.
 */
export const maxDuration = 300; // 5 min — long plans can be slow on free models

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, planType, clientContext, overrides } = body as {
      clientId: string;
      planType: "workout" | "nutrition";
      clientContext: any;
      overrides?: PlanOverrides;
    };

    if (!clientId || !planType || !clientContext) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, planType, clientContext" },
        { status: 400 },
      );
    }

    if (planType !== "workout" && planType !== "nutrition") {
      return NextResponse.json(
        { error: "planType must be 'workout' or 'nutrition'" },
        { status: 400 },
      );
    }

    const result =
      planType === "nutrition"
        ? await generateNutritionPlanAI(clientContext, overrides)
        : await generateWorkoutPlanAI(clientContext, overrides);

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[api/ai/plan] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
