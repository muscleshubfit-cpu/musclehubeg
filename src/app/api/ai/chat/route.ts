import { NextRequest, NextResponse } from "next/server";
import { callAIWithFallback, type AIProvider } from "@/lib/ai-provider";
import { generateChatReply } from "@/lib/ai-local";
import { listPlans, listProgress, getQuestionnaire, listAllSubscriptions } from "@/lib/data";
import { getTier } from "@/lib/plans";

/**
 * AI Coach chat endpoint.
 * Uses OpenRouter AI, falls back to local rule-based chat.
 *
 * POST /api/ai/chat
 * Body: { message, history, userId, userName }
 * Returns: { reply, source }
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
 }
 }

 // Try Gemini AI first
 const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
 const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
 if (OPENROUTER_KEY) {
 try {
 const systemInstruction = buildSystemPrompt(clientContext);
 const messages = [
 ...history.slice(-10).map((m: any) => ({
 role: m.role,
 content: m.content,
 })),
 { role: "user", content: message },
 ];

 const chatPrompt = messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
 const fullPrompt = `${systemInstruction}\n\n${chatPrompt}\n\nAssistant:`;
 const models = ["google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];
 for (const model of models) {
 try {
 const { text } = await callAIWithFallback(fullPrompt, { temperature: 0.6, maxTokens: 1000, timeoutMs: 30_000 }, { provider: "openrouter" as AIProvider, apiKey: OPENROUTER_KEY, model, baseUrl: OPENROUTER_BASE });
 if (text && text.length > 10) return NextResponse.json({ reply: text, source: `openrouter:${model}` });
 } catch (e) { console.error(`[chat] OpenRouter ${model} failed:`, e); }
 }
 
 } catch (aiErr) {
 console.error("[api/ai/chat] Gemini failed, falling back to local:", aiErr);
 }
 }

 // Fallback to local rule-based chat
 const reply = generateChatReply(message, clientContext);
 return NextResponse.json({ reply, source: "local" });
 } catch (e: any) {
 console.error("[api/ai/chat] Error:", e?.message || e);
 return NextResponse.json(
 { error: e?.message || "Internal server error" },
 { status: 500 },
 );
 }
}

function buildSystemPrompt(ctx: any): string {
 const plans = ctx.current_plans || [];
 const nutrition = ctx.nutrition || {};
 const fitness = ctx.fitness || {};
 const subscription = ctx.subscription;

 let planInfo = "لا توجد خطط مفعّلة بعد.";
 if (plans.length > 0) {
 planInfo = plans.map((p: any) => {
 const c = p.content;
 if (p.type === "meal" || p.type === "nutrition") {
 return `خطة تغذية "${p.title}": ${c?.daily_calories || "?"} كالوري/يوم، بروتين ${c?.macros?.protein_g || "?"}جم، كارب ${c?.macros?.carbs_g || "?"}جم، دهون ${c?.macros?.fat_g || "?"}جم، ${c?.meals?.length || 0} وجبات`;
 }
 if (p.type === "workout") {
 const trainingDays = c?.days?.filter((d: any) => !d.isRest) || [];
 return `برنامج تمارين "${p.title}": ${trainingDays.length} أيام تدريب، الأيام: ${c?.days?.map((d: any) => `${d.day}(${d.isRest ? "راحة" : d.focus})`).join("، ")}`;
 }
 return p.title;
 }).join("\n");
 }

 return `أنت EVO، المساعد الذكي لمنصة MuscleHub للكوتشينج الرياضي والتغذية. اسم الكوتش أحمد زكي.
دورك أن تتصرف كمدرب شخصي ذكي للعميل.

بيانات العميل الحالية:
${JSON.stringify({
 name: ctx.name,
 weight: nutrition.weight,
 height: nutrition.height,
 age: nutrition.age,
 target: nutrition.target || nutrition.target_weight,
 goal: fitness.goal,
 activity: fitness.activity,
 training_days: fitness.days,
 location: fitness.location,
 experience: fitness.experience,
 injuries: fitness.injuries,
 allergies: nutrition.allergies,
 disliked_foods: nutrition.disliked,
 diet: nutrition.diet,
 subscription_tier: subscription?.tier,
 swap_limit: subscription?.swapLimit,
 recent_weight: ctx.recent_measurements?.[0]?.weight,
}, null, 2)}

الخطط المفعّلة:
${planInfo}

القواعد:
- أجب بالعربية دائماً.
- أجب بناءً على بيانات العميل الفعلية أعلاه.
- لا تخترع أرقاماً غير موجودة في بياناته.
- عند طلب تبديل طعام، احسب الجرامات المكافئة بالسعرات والماكروز.
- عند طلب تبديل تمرين، اقترح تمريناً يستهدف نفس العضلة.
- كن مختصراً وعملياً وودوداً.
- لا تقدّم نصائح طبية. لو السؤال طبي، انصح بالتواصل مع الكوتش.
- ذكّر العميل بحد التبديلات اليومي لو سأل عن التبديلات.
- لو خلص العميل حد التبديلات، اقترح طلب تبديل من المدرب.`;
}
