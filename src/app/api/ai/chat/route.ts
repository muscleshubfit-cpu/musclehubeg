import { NextRequest, NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai-local";

/**
 * AI Coach chat endpoint.
 * Uses local rule-based AI (no external API needed).
 *
 * POST /api/ai/chat
 * Body: { message, history, clientContext }
 * Returns: { reply }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, clientContext } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const reply = generateChatReply(message, clientContext);
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("[api/ai/chat] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
