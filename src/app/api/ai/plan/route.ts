import { NextRequest, NextResponse } from "next/server";
import { generateWorkoutPlan, generateNutritionPlan } from "@/lib/ai-local";

/**
 * Generate a workout or nutrition plan using local rule-based AI.
 * No external API needed — works in any environment.
 *
 * POST /api/ai/plan
 * Body: { clientId, planType, clientContext }
 * Returns: { title, content }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, planType, clientContext } = body;

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

    const name = clientContext.name || "العميل";

    if (planType === "workout") {
      const content = generateWorkoutPlan(clientContext);
      return NextResponse.json({
        title: `برنامج تمارين - ${name}`,
        content,
      });
    } else {
      const content = generateNutritionPlan(clientContext);
      return NextResponse.json({
        title: `خطة تغذية - ${name}`,
        content,
      });
    }
  } catch (e: any) {
    console.error("[api/ai/plan] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
