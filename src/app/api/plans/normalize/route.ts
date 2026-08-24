import { NextRequest, NextResponse } from "next/server";
import { normalizeCoachPlanText } from "@/lib/plan-generator";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

/**
 * Normalize a coach-pasted plan (free text, markdown, or loosely-structured
 * JSON) into the standard structured JSON format used by AI-generated plans.
 *
 * POST /api/plans/normalize
 * Body: {
 * text: string, // raw coach text (or JSON string)
 * planType: "nutrition" | "workout"
 * }
 *
 * Returns: { content, source }
 *
 * This is what makes coach-added plans behave like AI-generated plans:
 * - They get the same editable table UI in the PlanViewerModal.
 * - Clients get the per-meal regenerate button (because the meal items
 * are now structured with food/amount/calories).
 *
 * The endpoint tries OpenRouter's best free models in order. If all fail,
 * it falls back to wrapping the raw text in a minimal structure.
 */
export const maxDuration = 180;

export async function POST(request: NextRequest) {
 try {
 // Coach-only — uses OpenRouter credits to normalize coach-pasted plans.
 if (isAuthConfigured) {
 const auth = await requireCoach(request);
 if (auth instanceof Response) return auth;
 }

 const body = await request.json();
 const { text, planType } = body as {
 text: string;
 planType: "nutrition" | "workout";
 };

 if (!text || !text.trim()) {
 return NextResponse.json(
 { error: "Missing required field: text" },
 { status: 400 },
 );
 }

 if (planType !== "nutrition" && planType !== "workout") {
 return NextResponse.json(
 { error: "planType must be 'nutrition' or 'workout'" },
 { status: 400 },
 );
 }

 const result = await normalizeCoachPlanText(text, planType);
 return NextResponse.json(result);
 } catch (e: any) {
 console.error("[api/plans/normalize] Error:", e?.message || e);
 return NextResponse.json(
 { error: e?.message || "Failed to normalize plan" },
 { status: 500 },
 );
 }
}
