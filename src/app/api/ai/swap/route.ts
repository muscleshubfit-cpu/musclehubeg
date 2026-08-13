import { NextRequest, NextResponse } from "next/server";
import { callFreeOpenRouter, parseJSON } from "@/lib/ai-provider";
import { requireUser, isAuthConfigured } from "@/lib/auth-server";

/**
 * Swap a meal or exercise for an alternative.
 * Uses OpenRouter's best free models, with local fallback.
 *
 * POST /api/ai/swap
 * Body: { type, item, clientContext, note }
 * Returns: { replacement, source }
 *
 * Used by both the coach (plan editor) and the client (swap button).
 * Auth: any logged-in user (requireUser). The client_id for swap limit
 * accounting is taken from the verified session, NOT the body — so a
 * logged-in client can't swap on behalf of another user.
 */
export const maxDuration = 180;

export async function POST(request: NextRequest) {
 try {
 // Any logged-in user — both coach and clients use swaps.
 if (isAuthConfigured) {
 const auth = await requireUser(request);
 if (auth instanceof Response) return auth;
 }

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

 // Try OpenRouter free models (shared helper handles the iteration)
 try {
 const { text, model } = await callFreeOpenRouter(
 prompt,
 {
 systemPrompt: "أنت أخصائي تغذية محترف. أعد JSON صالح فقط.",
 temperature: 0.7,
 maxTokens: 2000,
 jsonMode: true,
 timeoutMs: 90_000,
 },
 );
 const replacement = parseJSON<any>(text);
 if (replacement && replacement.items) {
 return NextResponse.json({ replacement, source: `openrouter:${model}` });
 }
 } catch (e: any) {
 console.error("[api/ai/swap] meal OpenRouter failed:", e?.message);
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

 try {
 const { text, model } = await callFreeOpenRouter(
 prompt,
 {
 systemPrompt: "أنت مدرب لياقة محترف. أعد JSON صالح فقط.",
 temperature: 0.7,
 maxTokens: 1000,
 jsonMode: true,
 timeoutMs: 60_000,
 },
 );
 const replacement = parseJSON<any>(text);
 if (replacement && replacement.name) {
 return NextResponse.json({ replacement, source: `openrouter:${model}` });
 }
 } catch (e: any) {
 console.error("[api/ai/swap] exercise OpenRouter failed:", e?.message);
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
