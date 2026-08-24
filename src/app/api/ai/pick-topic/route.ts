import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

/**
 * Auto-pick a blog topic — same logic as the cron job.
 * Uses OpenRouter AI to pick a trending topic within a rotated category.
 *
 * POST /api/ai/pick-topic
 * Body: { category?: string }
 * Returns: { topic, focusKeyword, category, rationale }
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Coach-only — burns OpenRouter credits.
    if (isAuthConfigured) {
      const auth = await requireCoach(request);
      if (auth instanceof Response) return auth;
    }

    const body = await request.json().catch(() => ({}));
    const language = body?.language === "ar" ? "ar" : "en";
    const pick = await pickSmartTopic(body?.category, language);
    return NextResponse.json(pick);
  } catch (e: any) {
    console.error("[pick-topic] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to pick topic" },
      { status: 500 },
    );
  }
}
