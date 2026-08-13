import { NextRequest, NextResponse } from "next/server";
import { callFreeOpenRouter } from "@/lib/ai-provider";
import { generateChatReply } from "@/lib/ai-local";
import { listPlans, listProgress, getQuestionnaire, getSubscriptionForClient } from "@/lib/data";
import { getTier } from "@/lib/plans";
import { requireUser, isAuthConfigured } from "@/lib/auth-server";

/**
 * AI Coach chat endpoint.
 * Uses OpenRouter AI, falls back to local rule-based chat.
 *
 * POST /api/ai/chat
 * Body: { message, history, userName? }
 * Returns: { reply, source }
 *
 * SECURITY: the caller's userId is taken from the verified Supabase session,
 * NEVER from the request body. This prevents IDOR (a caller pretending to be
 * another user to read their plans / progress / questionnaires / subscription).
 *
 * In demo mode (Supabase not configured) there is no server-side session;
 * the route falls through to the local rule-based reply with no per-user
 * context (same behavior as before — demo mode is client-only).
 */
export async function POST(request: NextRequest) {
 try {
 // 1. Authenticate (skip in demo mode — preserves preview behavior)
 let userId: string | undefined;
 let userName: string | undefined;
 if (isAuthConfigured) {
 const auth = await requireUser(request);
 if (auth instanceof Response) return auth;
 userId = auth.id;
 userName = auth.full_name || auth.email || undefined;
 }

 const body = await request.json().catch(() => ({}));
 const { message, history = [] } = body;

 if (!message) {
 return NextResponse.json({ error: "Missing message" }, { status: 400 });
 }

 // 2. Build full client context from database (scoped to the session user)
 let clientContext: any = { name: userName || "العميل" };
 if (userId) {
 try {
 const [plans, progress, nutriQ, fitQ, sub] = await Promise.all([
 listPlans(userId),
 listProgress(userId),
 getQuestionnaire(userId, "nutrition"),
 getQuestionnaire(userId, "fitness"),
 getSubscriptionForClient(userId),
 ]);
 const tierId = (sub?.tier as any) || "starter";
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

 // Try OpenRouter free models (shared helper iterates the model list)
 if (process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY) {
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

 const { text, model } = await callFreeOpenRouter(fullPrompt, {
 temperature: 0.6,
 maxTokens: 1000,
 timeoutMs: 30_000,
 });
 if (text && text.length > 10) {
 return NextResponse.json({ reply: text, source: `openrouter:${model}` });
 }
 } catch (aiErr) {
 console.error("[api/ai/chat] OpenRouter failed, falling back to local:", aiErr);
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
