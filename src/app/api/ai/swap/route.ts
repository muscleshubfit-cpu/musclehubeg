import { NextRequest, NextResponse } from "next/server";
import { geminiGenerate, parseJsonResponse, isGeminiConfigured } from "@/lib/ai-gemini";

/**
 * Swap a meal or exercise for an alternative.
 * Tries Gemini AI first, falls back to simple replacement.
 *
 * POST /api/ai/swap
 * Body: { type, item, clientContext, note }
 * Returns: { replacement }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, item, clientContext, note } = body;

    if (!type || !item) {
      return NextResponse.json({ error: "Missing type or item" }, { status: 400 });
    }

    // Try Gemini AI first
    if (isGeminiConfigured) {
      try {
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

أعد وجبة واحدة بديلة بصيغة JSON فقط:
{
  "name": "اسم الوجبة",
  "items": [
    { "food": "اسم الطعام", "amount": "الكمية بالجرام", "calories": 300 }
  ],
  "notes": "ملاحظة قصيرة"
}`;

          const raw = await geminiGenerate(prompt);
          const replacement = parseJsonResponse(raw);
          if (replacement && replacement.items) {
            return NextResponse.json({ replacement, source: "gemini" });
          }
        } else if (type === "exercise") {
          const prompt = `أنت مدرب لياقة. استبدل التمرين التالي بتمرين بديل يستهدف نفس العضلة (${item.focus || "غير محدد"}) بنفس الحجم والشدة.

${clientContext ? `بيانات العميل (راعِ المعدات والإصابات):
${JSON.stringify(clientContext, null, 2)}` : ""}

التمرين الحالي:
${JSON.stringify(item, null, 2)}

${note ? `طلب العميل: ${note}` : ""}

أعد تمريناً واحداً بديلاً بصيغة JSON فقط:
{
  "name": "اسم التمرين",
  "sets": 4,
  "reps": "8-12",
  "rest": "90 ثانية",
  "notes": "نصيحة قصيرة",
  "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/..."
}`;

          const raw = await geminiGenerate(prompt);
          const replacement = parseJsonResponse(raw);
          if (replacement && replacement.name) {
            return NextResponse.json({ replacement, source: "gemini" });
          }
        }
      } catch (geminiErr) {
        console.error("[api/ai/swap] Gemini failed, falling back:", geminiErr);
      }
    }

    // Fallback to simple replacement
    if (type === "meal") {
      return NextResponse.json({
        replacement: {
          name: "وجبة بديلة",
          items: [
            { food: "صدر دجاج مشوي", amount: "150 جم", calories: 165 },
            { food: "أرز بسمتي", amount: "100 جم", calories: 130 },
            { food: "سلطة خضار", amount: "طبق", calories: 50 },
            { food: "زيت زيتون", amount: "1 ملعقة", calories: 120 },
          ],
          notes: "وجبة متوازنة",
        },
        source: "local",
      });
    } else {
      return NextResponse.json({
        replacement: {
          name: "تمرين بديل",
          sets: item.sets || 3,
          reps: item.reps || "10-12",
          rest: item.rest || "90 ثانية",
          notes: "تمرين يستهدف نفس العضلة",
        },
        source: "local",
      });
    }
  } catch (e: any) {
    console.error("[api/ai/swap] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
