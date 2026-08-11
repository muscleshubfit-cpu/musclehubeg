import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";

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
    const body = await request.json().catch(() => ({}));
    const pick = await pickSmartTopic();
    return NextResponse.json(pick);
  } catch (e: any) {
    console.error("[pick-topic] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to pick topic" },
      { status: 500 },
    );
  }
}
