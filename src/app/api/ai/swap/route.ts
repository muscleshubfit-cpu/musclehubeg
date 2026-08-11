import { NextRequest, NextResponse } from "next/server";
import { callAIWithFallback, parseJSON, type AIProvider } from "@/lib/ai-provider";

/**
 * Swap a meal or exercise for an alternative.
 * Uses OpenRouter's best free models, with local fallback.
 *
 * POST /api/ai/swap
 * Body: { type, item, clientContext, note }
 * Returns: { replacement, source }
 */
export const maxDuration = 180;

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

// Try multiple free OpenRouter models in order
const FREE_MODELS = [
 "nvidia/nemotron-3-ultra-550b-a55b:free",
 "google/gemma-4-31b-it:free",
 "google/gemma-4-26b-a4b-it:free",
 "openai/gpt-oss-20b:free",
 "poolside/laguna-s-2.1:free",
];

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

أعد وجبة واحدة بديلة بصيغة JSON فقط (بدون أسوار markdown):
{
 "name": "اسم الوجبة",
 "items": [
 { "food": "اسم الطعام", "amount": "الكمية بالجرام", "calories": 300, "alternatives": "أو 180 جم سمك مشوي" }
 ],
 "total_calories": ${targetCalories},
 "notes": "ملاحظة قصيرة"
}`;

 // Try OpenRouter free models
 for (const model of FREE_MODELS) {
 if (!OPENROUTER_KEY) break;
 try {
 const { text } = await callAIWithFallback(
 prompt,
 {
 systemPrompt: "أنت أخصائي تغذية محترف. أعد JSON صالح فقط.",
 temperature: 0.7,
 maxTokens: 2000,
 jsonMode: true,
 timeoutMs: 90_000,
 },
 {
 provider: "openrouter" as AIProvider,
 apiKey: OPENROUTER_KEY,
 model,
 baseUrl: OPENROUTER_BASE,
 },
 );
 const replacement = parseJSON<any>(text);
 if (replacement && replacement.items) {
 return NextResponse.json({ replacement, source: `openrouter:${model}` });
 }
 } catch (e: any) {
 console.error(`[api/ai/swap] OpenRouter ${model} failed:`, e?.message);
 }
 }
 } else if (type === "exercise") {
 const prompt = `أنت مدرب لياقة. استبدل التمرين التالي بتمرين بديل يستهدف نفس العضلة (${item.focus || "غير محدد"}) بنفس الحجم والشدة.

${clientContext ? `بيانات العميل (راعِ المعدات والإصابات):
${JSON.stringify(clientContext, null, 2)}` : ""}

التمرين الحالي:
${JSON.stringify(item, null, 2)}

${note ? `طلب العميل: ${note}` : ""}

أعد تمريناً واحداً بديلاً بصيغة JSON فقط (بدون أسوار markdown):
{
 "name": "اسم التمرين",
 "sets": 4,
 "reps": "8-12",
 "rest": "90 ثانية",
 "notes": "نصيحة قصيرة",
 "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/..."
}`;

 for (const model of FREE_MODELS) {
 if (!OPENROUTER_KEY) break;
 try {
 const { text } = await callAIWithFallback(
 prompt,
 {
 systemPrompt: "أنت مدرب لياقة محترف. أعد JSON صالح فقط.",
 temperature: 0.7,
 maxTokens: 1000,
 jsonMode: true,
 timeoutMs: 60_000,
 },
 {
 provider: "openrouter" as AIProvider,
 apiKey: OPENROUTER_KEY,
 model,
 baseUrl: OPENROUTER_BASE,
 },
 );
 const replacement = parseJSON<any>(text);
 if (replacement && replacement.name) {
 return NextResponse.json({ replacement, source: `openrouter:${model}` });
 }
 } catch (e: any) {
 console.error(`[api/ai/swap] OpenRouter ${model} failed:`, e?.message);
 }
 }
 }

 // Fallback: simple local replacement
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
 source: "local-fallback",
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
 source: "local-fallback",
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
