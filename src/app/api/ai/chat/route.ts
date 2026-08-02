import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * AI Coach chat endpoint.
 *
 * POST /api/ai/chat
 * Body: {
 *   message: string,
 *   history: [{ role: "user" | "assistant", content: string }],
 *   clientContext?: { name, nutrition, fitness, recent_measurements, plans }
 * }
 *
 * Returns: { reply: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [], clientContext } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const zai = await ZAI.create();

    const systemPrompt = `أنت المساعد الذكي للمدرب أحمد زكي في منصة تدريب لياقة وتغذية.
دورك أن تتصرف كمدرب شخصي حقيقي للعميل وليس مجرد مولّد نصوص.

${clientContext ? `بيانات العميل الحالية (استخدمها كمصدر وحيد للحقيقة):
${JSON.stringify(clientContext, null, 2)}` : "لا تتوفر بيانات العميل حالياً، لذا قدّم نصائح عامة مفيدة."}

القواعد الصارمة:
- أجب دائماً بناءً على خطة العميل وبياناته أعلاه فقط إذا توفّرت. لا تخترع أرقاماً أو خططاً جديدة.
- عند طلب استبدال طعام، احسب الكمية المكافئة للحفاظ على نفس السعرات والماكروز تقريباً.
- عند طلب استبدال تمرين، اقترح تمريناً يستهدف نفس العضلات بنفس الحجم والشدة.
- راعِ الإصابات والحالات الطبية. لو السؤال طبي أو خطير، انصح العميل بالتواصل مع الكوتش مباشرة.
- كن مختصراً وعملياً وودوداً. أجب بالعربية.
- لا تقدّم نصائح عامة عشوائية غير مرتبطة ببرنامج العميل.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const result = await zai.chat.completions.create({
      messages,
      temperature: 0.6,
    });

    const reply = result.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("[api/ai/chat] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
