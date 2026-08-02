import { NextRequest, NextResponse } from "next/server";

/**
 * Swap a meal or exercise for an alternative.
 * Currently returns a placeholder — the client UI uses this to request
 * a different meal/exercise. For now, we return a simple alternative.
 *
 * POST /api/ai/swap
 * Body: { type: "meal" | "exercise", item, clientContext, note }
 * Returns: { replacement }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, item } = body;

    if (!type || !item) {
      return NextResponse.json({ error: "Missing type or item" }, { status: 400 });
    }

    if (type === "meal") {
      // Simple alternative meal
      const replacement = {
        name: "وجبة بديلة",
        items: [
          { food: "صدر دجاج مشوي", amount: "150 جم", calories: 165 },
          { food: "أرز بسمتي", amount: "100 جم مطبوخ", calories: 130 },
          { food: "سلطة خضار", amount: "طبق", calories: 50 },
          { food: "زيت زيتون", amount: "1 ملعقة", calories: 120 },
        ],
        notes: "وجبة متوازنة بالبروتين والكارب والدهون الصحية",
      };
      return NextResponse.json({ replacement });
    } else if (type === "exercise") {
      const replacement = {
        name: "تمرين بديل",
        sets: item.sets || 3,
        reps: item.reps || "10-12",
        rest: item.rest || "90 ثانية",
        notes: "تمرين يستهدف نفس العضلة بنفس الحجم",
      };
      return NextResponse.json({ replacement });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("[api/ai/swap] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
