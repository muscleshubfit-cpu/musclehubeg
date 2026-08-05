import { NextRequest, NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai-local";
import { listPlans, listProgress, getQuestionnaire, listAllSubscriptions } from "@/lib/data";
import { getTier } from "@/lib/plans";

/**
 * AI Coach chat endpoint.
 * Reads the client's full context (profile, plans, questionnaires, progress, subscription)
 * and answers questions based on it. Can suggest swaps but does NOT generate new plans.
 *
 * POST /api/ai/chat
 * Body: { message, history, userId }
 * Returns: { reply }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [], userId, userName } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Build full client context from database
    let clientContext: any = { name: userName || "العميل" };
    if (userId) {
      try {
        const [plans, progress, nutriQ, fitQ, subs] = await Promise.all([
          listPlans(userId),
          listProgress(userId),
          getQuestionnaire(userId, "nutrition"),
          getQuestionnaire(userId, "fitness"),
          listAllSubscriptions(),
        ]);
        const userSub = subs.find((s: any) => s.client_id === userId);
        const tierId = (userSub?.tier as any) || "starter";
        const tier = getTier(tierId);

        clientContext = {
          name: userName || "العميل",
          nutrition: nutriQ?.data || null,
          fitness: fitQ?.data || null,
          recent_measurements: progress.slice(-3).map((p: any) => ({
            weight: p.weight,
            waist: p.waist,
            date: p.created_at,
          })),
          current_plans: plans.map((p: any) => ({
            type: p.type,
            title: p.title,
            content: p.content,
          })),
          subscription: {
            tier: tierId,
            tierName: tier?.nameKey,
            swapLimit: tier?.swapLimit,
          },
        };
      } catch (e) {
        console.error("[api/ai/chat] Failed to load context:", e);
        // Continue with minimal context
      }
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
