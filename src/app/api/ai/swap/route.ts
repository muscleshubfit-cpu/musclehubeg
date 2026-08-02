import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";

/**
 * Swap a meal or exercise for an alternative.
 *
 * POST /api/ai/swap
 * Body: {
 *   type: "meal" | "exercise",
 *   item: the meal/exercise object,
 *   clientContext?: object,
 *   note?: string (user's specific request)
 * }
 *
 * Returns: { replacement: the new meal/exercise }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, item, clientContext, note } = body;

    if (!type || !item) {
      return NextResponse.json({ error: "Missing type or item" }, { status: 400 });
    }

    if (type === "meal") {
      const targetCalories = (item.items || []).reduce(
        (s: number, i: any) => s + (i.calories || 0),
        0,
      );

      const prompt = `أنت أخصائي تغذية. استبدل الوجبة التالية بوجبة بديلة مكافئة بنفس السعرات تقريباً (${targetCalories} سعرة) ونفس نسب الماكروز قدر الإمكان.

${clientContext ? `بيانات العميل (راعِ الحساسية والأطعمة غير المحببة):
${JSON.stringify(clientContext, null, 2)}` : ""}

الوجبة الحالية:
${JSON.stringify(item, null, 2)}

${note ? `طلب العميل: ${note}` : ""}

أعد وجبة واحدة بديلة بصيغة JSON فقط بالشكل:
{
  "name": "اسم الوجبة",
  "items": [
    { "food": "اسم الطعام", "amount": "الكمية", "calories": 300 }
  ],
  "notes": "ملاحظة قصيرة"
}`;

      const content = await chatCompletion(
        [{ role: "user", content: prompt }],
        { temperature: 0.7 },
      );
      const replacement = parseJsonFromText(content);
      if (!replacement) {
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 500 },
        );
      }
      return NextResponse.json({ replacement });
    } else if (type === "exercise") {
      const prompt = `أنت مدرب لياقة. استبدل التمرين التالي بتمرين بديل يستهدف نفس العضلة (${item.focus || "غير محدد"}) بنفس الحجم والشدة تقريباً.

${clientContext ? `بيانات العميل (راعِ المعدات والإصابات):
${JSON.stringify(clientContext, null, 2)}` : ""}

التمرين الحالي:
${JSON.stringify(item, null, 2)}

${note ? `طلب العميل: ${note}` : ""}

أعد تمريناً واحداً بديلاً بصيغة JSON فقط بالشكل:
{
  "name": "اسم التمرين",
  "sets": 4,
  "reps": "8-12",
  "rest": "90 ثانية",
  "notes": "نصيحة قصيرة"
}`;

      const content = await chatCompletion(
        [{ role: "user", content: prompt }],
        { temperature: 0.7 },
      );
      const replacement = parseJsonFromText(content);
      if (!replacement) {
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 500 },
        );
      }
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

function parseJsonFromText(text: string): any | null {
  if (!text) return null;
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
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
