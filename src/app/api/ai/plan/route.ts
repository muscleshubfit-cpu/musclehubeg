import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";

/**
 * Generate a workout or nutrition plan using AI.
 *
 * POST /api/ai/plan
 * Body: {
 *   clientId: string,
 *   planType: "workout" | "nutrition",
 *   clientContext: { name, nutrition, fitness, recent_measurements }
 * }
 *
 * The clientContext is fetched by the caller (coach UI) using the
 * authenticated supabase client, so we trust it here.
 *
 * Returns: { title, content } where content matches the PlanContent schema.
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
      const prompt = `أنت مدرب لياقة محترف اسمه أحمد زكي. صمّم برنامج تمارين أسبوعي مخصص باللغة العربية بناءً على بيانات العميل التالية.

بيانات العميل:
${JSON.stringify(clientContext, null, 2)}

القواعد:
- عدد أيام التدريب يطابق عدد الأيام الأسبوعية للعميل إن وُجد (افترض 4 أيام إذا لم يُحدد).
- كل يوم له اسم عربي (مثل "اليوم الأول") ومجموعة عضلية مستهدفة (مثل "صدر وترايسبس").
- لكل تمرين: sets (رقم)، reps (نص مثل "8-12")، rest (نص مثل "90 ثانية")، notes (نصيحة قصيرة بالعربية).
- راعِ الإصابات والمعدات ومستوى الخبرة.
- overview فقرة تمهيدية قصيرة بالعربية تشرح هدف البرنامج.

أعد النتيجة بصيغة JSON فقط (بدون أي نص إضافي قبل أو بعد) بالشكل التالي:
{
  "overview": "فقرة تمهيدية قصيرة",
  "days": [
    {
      "day": "اليوم الأول",
      "focus": "صدر وترايسبس",
      "exercises": [
        { "name": "بنش بريس", "sets": 4, "reps": "8-10", "rest": "90 ثانية", "notes": "احتفظ بوضعية صحيحة" }
      ]
    }
  ]
}`;

      const content = await chatCompletion(
        [{ role: "user", content: prompt }],
        { temperature: 0.7 },
      );
      const parsed = parseJsonFromText(content);
      if (!parsed) {
        return NextResponse.json(
          { error: "Failed to parse AI response", raw: content.slice(0, 500) },
          { status: 500 },
        );
      }

      return NextResponse.json({
        title: `برنامج تمارين - ${name}`,
        content: parsed,
      });
    } else {
      // Nutrition plan
      const prompt = `أنت أخصائي تغذية محترف اسمه أحمد زكي. صمّم خطة تغذية يومية مخصصة باللغة العربية بناءً على بيانات العميل التالية.

بيانات العميل:
${JSON.stringify(clientContext, null, 2)}

القواعد:
- احسب السعرات اليومية والماكروز بما يناسب الهدف (وزن العميل، هدفه، نشاطه).
- عدد الوجبات يطابق تفضيل العميل إن وُجد (افترض 4 وجبات).
- لكل وجبة: name بالعربية (مثل "الفطار")، items قائمة أطعمة مع الكمية والسعرات، notes.
- راعِ الحساسية والأطعمة غير المحببة والحالات الطبية.
- overview فقرة تمهيدية قصيرة تشرح استراتيجية الخطة.

أعد النتيجة بصيغة JSON فقط (بدون أي نص إضافي) بالشكل التالي:
{
  "overview": "فقرة تمهيدية قصيرة",
  "daily_calories": 2200,
  "macros": { "protein_g": 180, "carbs_g": 200, "fat_g": 70 },
  "meals": [
    {
      "name": "الفطار",
      "items": [
        { "food": "شوفان", "amount": "80 جم", "calories": 300 },
        { "food": "واي بروتين", "amount": "30 جم", "calories": 120 }
      ],
      "notes": "تناوله خلال 30 دقيقة من الاستيقاظ"
    }
  ]
}`;

      const content = await chatCompletion(
        [{ role: "user", content: prompt }],
        { temperature: 0.7 },
      );
      const parsed = parseJsonFromText(content);
      if (!parsed) {
        return NextResponse.json(
          { error: "Failed to parse AI response", raw: content.slice(0, 500) },
          { status: 500 },
        );
      }

      return NextResponse.json({
        title: `خطة تغذية - ${name}`,
        content: parsed,
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

/** Extracts a JSON object from a text that may contain markdown fences. */
function parseJsonFromText(text: string): any | null {
  if (!text) return null;
  // Strip markdown code fences
  let cleaned = text.trim();
  // Remove ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  // Find the first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
