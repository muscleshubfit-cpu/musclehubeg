/**
 * Plan Generator — uses OpenRouter's best available free models to produce
 * detailed, structured workout and nutrition plans.
 *
 * The output format matches the reference PDF style:
 * - Nutrition: data analysis section (BMR, TDEE, body fat estimate) +
 * macros table (protein/carbs/fat in grams + calories) + supplement
 * recommendations + meals with numbered items, alternatives, and
 * per-meal totals (calories + protein)
 * - Workout: weekly split with day-by-day exercises (sets, reps, rest,
 * notes, image), rest days interleaved, and an overview section
 *
 * The coach can optionally override:
 * - targetCalories (number)
 * - macros: { protein_g, carbs_g, fat_g }
 * - foods: string[] (preferred foods to include)
 * - mealsCount (number)
 *
 * When the AI call fails (network, quota, region block), we fall back to
 * the local rule-based generator in ai-local.ts so the workflow never
 * breaks for the coach.
 */

import { callAIWithFallback, parseJSON, type AIProvider } from "@/lib/ai-provider";
import {
 generateNutritionPlan,
 generateWorkoutPlan,
 type ClientContext,
} from "@/lib/ai-local";

// OpenRouter's best available free models, ordered by preference.
// We try them in order — the first that returns valid JSON wins.
// (callAIWithFallback tries the env-configured provider first, then
// falls back to every other provider whose key is set. We pass an
// explicit OpenRouter override so plans always go through OpenRouter
// regardless of what's set in AI Settings.)
const OPENROUTER_FREE_MODELS = [
 "nvidia/nemotron-3-ultra-550b-a55b:free", // 1M context, biggest
 "google/gemma-4-31b-it:free", // 262K, non-reasoning, returns clean content
 "google/gemma-4-26b-a4b-it:free", // 262K, non-reasoning
 "nvidia/nemotron-3-super-120b-a12b:free", // 262K
 "openai/gpt-oss-20b:free", // 131K, reasoning
 "poolside/laguna-s-2.1:free", // 262K
];

// OpenRouter API key (from env). We read it directly so plans always use
// OpenRouter even if the user changed the default provider in AI Settings.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export type PlanOverrides = {
 targetCalories?: number;
 macros?: { protein_g: number; carbs_g: number; fat_g: number };
 foods?: string[]; // preferred foods to include
 mealsCount?: number; // override meals-per-day
 notes?: string; // free-text instructions from the coach
};

export type NutritionPlanContent = {
 overview: string;
 data_analysis?: {
 gender?: string;
 weight?: string;
 height?: string;
 age?: string;
 neck?: string;
 waist?: string;
 hip?: string;
 activity?: string;
 health?: string;
 body_fat_pct?: string;
 fat_mass?: string;
 lean_mass?: string;
 bmr?: number;
 tdee?: number;
 };
 daily_calories: number;
 macros: {
 protein_g: number;
 carbs_g: number;
 fat_g: number;
 protein_cal?: number;
 carbs_cal?: number;
 fat_cal?: number;
 };
 supplements?: Array<{
 name: string;
 dose: string;
 timing: string;
 purpose: string;
 }>;
 health_notes?: string[]; // specific recommendations (e.g. iron for anemia)
 water_target?: string; // e.g. "2.5 - 3 لتر يومياً"
 meals: Array<{
 name: string;
 time?: string; // e.g. "بعد الاستيقاظ" or "قبل النوم بـ 45 دقيقة"
 items: Array<{
 food: string;
 amount: string;
 calories: number;
 protein_g?: number;
 alternatives?: string; // "أو 180 جم سمك مشوي / 150 جم لحم أحمر"
 }>;
 total_calories?: number;
 total_protein_g?: number;
 notes?: string;
 }>;
 // Original simple-format meals are kept for backwards compat with the
 // existing PlanViewerModal. The new fields (data_analysis, supplements,
 // health_notes, water_target, alternatives, totals) are optional.
};

export type WorkoutPlanContent = {
 overview: string;
 days: Array<{
 day: string;
 focus: string;
 isRest?: boolean;
 exercises: Array<{
 name: string;
 sets: number;
 reps: string;
 rest: string;
 notes: string;
 image?: string;
 }>;
 }>;
 // New optional fields for the richer format
 weekly_volume?: string; // e.g. "20 مجموعة أسبوعياً، 8 تمارين رئيسية"
 progression?: string; // how to progress week-over-week
};

export type GeneratePlanResult = {
 title: string;
 content: NutritionPlanContent | WorkoutPlanContent;
 source: string; // which model served the request
};

/**
 * Generate a nutrition plan via OpenRouter AI, with fallback to local.
 */
export async function generateNutritionPlanAI(
 ctx: ClientContext,
 overrides?: PlanOverrides,
): Promise<GeneratePlanResult> {
 const name = ctx.name || "العميل";
 const prompt = buildNutritionPrompt(ctx, name, overrides);

 try {
 // Try each free OpenRouter model in order until one returns valid JSON.
 for (const model of OPENROUTER_FREE_MODELS) {
 if (!OPENROUTER_KEY) break;
 try {
 const { text } = await callAIWithFallback(
 prompt,
 {
 systemPrompt: NUTRITION_SYSTEM_PROMPT,
 temperature: 0.7,
 maxTokens: 8000,
 jsonMode: true,
 timeoutMs: 180_000, // 3 min — long plans can be slow on free models
 },
 {
 provider: "openrouter" as AIProvider,
 apiKey: OPENROUTER_KEY,
 model,
 baseUrl: OPENROUTER_BASE,
 },
 );
 const parsed = parseJSON<NutritionPlanContent>(text);
 if (parsed && parsed.meals && parsed.meals.length > 0) {
 return {
 title: `خطة تغذية - ${name}`,
 content: normalizeNutritionPlan(parsed, overrides),
 source: `openrouter:${model}`,
 };
 }
 } catch (e: any) {
 console.error(`[plan-generator] OpenRouter ${model} failed:`, e?.message);
 // try next model
 }
 }
 } catch (e: any) {
 console.error("[plan-generator] All OpenRouter models failed:", e?.message);
 }

 // Fallback: local rule-based generator
 const local = generateNutritionPlan(ctx);
 return {
 title: `خطة تغذية - ${name}`,
 content: normalizeNutritionPlan(local, overrides),
 source: "local-fallback",
 };
}

/**
 * Generate a workout plan via OpenRouter AI, with fallback to local.
 */
export async function generateWorkoutPlanAI(
 ctx: ClientContext,
 overrides?: PlanOverrides,
): Promise<GeneratePlanResult> {
 const name = ctx.name || "العميل";
 const prompt = buildWorkoutPrompt(ctx, name, overrides);

 try {
 for (const model of OPENROUTER_FREE_MODELS) {
 if (!OPENROUTER_KEY) break;
 try {
 const { text } = await callAIWithFallback(
 prompt,
 {
 systemPrompt: WORKOUT_SYSTEM_PROMPT,
 temperature: 0.7,
 maxTokens: 8000,
 jsonMode: true,
 timeoutMs: 180_000,
 },
 {
 provider: "openrouter" as AIProvider,
 apiKey: OPENROUTER_KEY,
 model,
 baseUrl: OPENROUTER_BASE,
 },
 );
 const parsed = parseJSON<WorkoutPlanContent>(text);
 if (parsed && parsed.days && parsed.days.length > 0) {
 return {
 title: `برنامج تمارين - ${name}`,
 content: normalizeWorkoutPlan(parsed),
 source: `openrouter:${model}`,
 };
 }
 } catch (e: any) {
 console.error(`[plan-generator] OpenRouter ${model} failed:`, e?.message);
 }
 }
 } catch (e: any) {
 console.error("[plan-generator] All OpenRouter models failed:", e?.message);
 }

 const local = generateWorkoutPlan(ctx);
 return {
 title: `برنامج تمارين - ${name}`,
 content: normalizeWorkoutPlan(local),
 source: "local-fallback",
 };
}

/**
 * Regenerate a single meal — used by both coach (in the editor) and client
 * (via the swap button, when the plan was added by the coach manually).
 *
 * The new meal will have the same total calories and similar macros to the
 * original, but different foods.
 */
export async function regenerateMeal(
 meal: { name?: string; items?: Array<{ food: string; amount: string; calories: number }>; notes?: string },
 targetCalories?: number,
 clientContext?: ClientContext,
 coachNote?: string,
): Promise<{ meal: any; source: string }> {
 const totalCals =
 targetCalories ||
 (meal.items || []).reduce((s, i) => s + (i.calories || 0), 0);

 const prompt = `أنت أخصائي تغذية محترف. أعد توليد وجبة بديلة بنفس السعرات (${totalCals} سعرة) ونفس نسب الماكروز قدر الإمكان.

${clientContext ? `بيانات العميل (راعِ الحساسية والأطعمة غير المحببة):
${JSON.stringify({ ...clientContext, name: undefined }, null, 2)}` : ""}

الوجبة الحالية (لاحظ تنوع الأصناف وابتعد عن التكرار):
${JSON.stringify(meal, null, 2)}

${coachNote ? `تعليمات الكوتش: ${coachNote}` : ""}

أعد وجبة واحدة جديدة (وليس نفس الوجبة) بصيغة JSON فقط:
{
 "name": "اسم الوجبة",
 "time": "وقت تقديم الوجبة (اختياري)",
 "items": [
 {
 "food": "اسم الطعام",
 "amount": "الكمية بالجرام (مثلاً: 150 جم)",
 "calories": 300,
 "protein_g": 30,
 "alternatives": "بدائل مكافئة (مثلاً: أو 180 جم سمك مشوي / 150 جم لحم أحمر)"
 }
 ],
 "total_calories": ${totalCals},
 "total_protein_g": 45,
 "notes": "ملاحظة قصيرة بالعربية"
}

تأكد أن مجموع سعرات الأصناف يساوي تقريباً ${totalCals}. استخدم أصناف عربية/مصرية متنوعة. لا تكرر نفس الأصناف الموجودة في الوجبة الحالية.`;

 try {
 for (const model of OPENROUTER_FREE_MODELS) {
 if (!OPENROUTER_KEY) break;
 try {
 const { text } = await callAIWithFallback(
 prompt,
 {
 systemPrompt: NUTRITION_SYSTEM_PROMPT,
 temperature: 0.8,
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
 const parsed = parseJSON<any>(text);
 if (parsed && parsed.items && parsed.items.length > 0) {
 return { meal: parsed, source: `openrouter:${model}` };
 }
 } catch (e: any) {
 console.error(`[regenerate-meal] OpenRouter ${model} failed:`, e?.message);
 }
 }
 } catch (e: any) {
 console.error("[regenerate-meal] All OpenRouter models failed:", e?.message);
 }

 // Fallback: return the original meal unchanged (the caller can show an error)
 throw new Error("تعذّر إعادة توليد الوجبة. حاول مرة أخرى.");
}

/* ----------------------------- Prompts ----------------------------- */

const NUTRITION_SYSTEM_PROMPT = `أنت أخصائي تغذية رياضية محترف يعمل مع الكوتش أحمد زكي (MuscleHub).
مهمتك: تصميم خطة تغذية مخصصة باللغة العربية بأسلوب احترافي يطابق شكل التقارير الطبية.

قواعد الإخراج:
- الإخراج JSON صالح فقط — لا نص قبله أو بعده، لا أسوار markdown.
- استخدم أصناف متنوعة من المطبخ العربي والمصري.
- لكل صنف: اذكر الكمية بالجرام (مثلاً "150 جم") والسعرات بدقة.
- استبدل العناصر غير المرغوبة ببدائل مناسبة.
- اذكر بدائل لكل صنف رئيسي (protein/carb) ليختار منها العميل.
- احسب المجموع الكلي للسعرات والبروتين لكل وجبة.

تنسيق JSON المطلوب:
{
 "overview": "نظرة عامة على الخطة والهدف",
 "data_analysis": {
 "gender": "ذكر/أنثى",
 "weight": "131 كجم",
 "height": "165 سم",
 "age": "30 سنة",
 "neck": "47 سم",
 "waist": "143 سم",
 "activity": "خفيف جداً",
 "health": "أنيميا (فقر دم)",
 "body_fat_pct": "~54%",
 "fat_mass": "70.7 كجم",
 "lean_mass": "60.3 كجم",
 "bmr": 1520,
 "tdee": 1800
 },
 "daily_calories": 1400,
 "macros": {
 "protein_g": 105,
 "carbs_g": 144,
 "fat_g": 45,
 "protein_cal": 420,
 "carbs_cal": 575,
 "fat_cal": 405
 },
 "supplements": [
 { "name": "مغنيسيوم", "dose": "200-400 مج", "timing": "قبل النوم بـ 30-60 دقيقة", "purpose": "تحسين جودة النوم وتقليل التوتر" }
 ],
 "health_notes": [
 "التركيز على مصادر الحديد (اللحوم الحمراء، الكبدة، السبانخ، العدس)",
 "إضافة فيتامين C مع الوجبات الرئيسية لزيادة امتصاص الحديد"
 ],
 "water_target": "2.5 إلى 3 لتر يومياً",
 "meals": [
 {
 "name": "الوجبة الأولى – الإفطار",
 "time": "بعد الاستيقاظ",
 "items": [
 { "food": "بيض مسلوق", "amount": "3 بيضات (150 جم)", "calories": 234, "protein_g": 18, "alternatives": "أو 50 جم جبن قريش + 2 بيض" },
 { "food": "خبز بلدي", "amount": "½ رغيف (65 جم)", "calories": 180, "alternatives": "أو 50 جم شوفان مطبوخ" },
 { "food": "سلطة خضراء كبيرة", "amount": "طبق كامل", "calories": 80, "alternatives": "طماطم + فلفل رومي + جرجير + خيار + عصرة ليمون" }
 ],
 "total_calories": 650,
 "total_protein_g": 45,
 "notes": "وجبة رئيسية — ركّز على البروتين"
 }
 ]
}

أهم النقاط:
- استخدم الرموز التعبيرية ( ) في overview و health_notes لتعزيز القراءة.
- اذكر ${"بدائل (alternatives)"} لكل صنف رئيسي.
- تأكد أن مجموع ${"total_calories"} لكل وجبة يقترب من ${"daily_calories"} الموزّع.`;

function buildNutritionPrompt(ctx: ClientContext, name: string, overrides?: PlanOverrides): string {
 const nutrition = ctx.nutrition || {};
 const fitness = ctx.fitness || {};
 const measurements = ctx.recent_measurements?.[0] || {};

 const weight = nutrition.weight || measurements.weight || "80";
 const height = nutrition.height || "175";
 const age = nutrition.age || "25";
 const target = nutrition.target || nutrition.target_weight || weight;
 const goal = fitness.goal || "general fitness";
 const activity = fitness.activity || "moderate";
 const meals = overrides?.mealsCount || nutrition.meals || "4";
 const diet = nutrition.diet || "balanced";
 const allergies = nutrition.allergies || "";
 const disliked = nutrition.disliked || "";
 const gender = nutrition.gender || "male";
 const neck = nutrition.neck || "";
 const waist = nutrition.waist || measurements.waist || "";
 const hip = nutrition.hip || "";
 const health = nutrition.health || nutrition.medical_conditions || "";

 const overridesText = overrides
 ? `
 تعليمات خاصة من الكوتش (يجب الالتزام بها):
${overrides.targetCalories ? `- السعرات المستهدفة اليومية: ${overrides.targetCalories} سعرة` : ""}
${overrides.macros ? `- الماكروز المطلوبة: بروتين ${overrides.macros.protein_g}جم / كارب ${overrides.macros.carbs_g}جم / دهون ${overrides.macros.fat_g}جم` : ""}
${overrides.foods && overrides.foods.length > 0 ? `- الأطعمة المطلوب تضمينها: ${overrides.foods.join("، ")}` : ""}
${overrides.notes ? `- ملاحظات إضافية: ${overrides.notes}` : ""}
`
 : "";

 return `صمّم خطة تغذية يومية مخصصة باللغة العربية لعميل اسمه ${name}.

 بيانات العميل الأساسية:
- الجنس: ${gender}
- الوزن: ${weight} كجم
- الطول: ${height} سم
- العمر: ${age} سنة
${neck ? `- محيط الرقبة: ${neck} سم` : ""}
${waist ? `- محيط الخصر: ${waist} سم` : ""}
${hip ? `- محيط الورك: ${hip} سم` : ""}
- الوزن المستهدف: ${target} كجم
- الهدف الرياضي: ${goal}
- مستوى النشاط: ${activity}
- عدد الوجبات: ${meals}
- النظام الغذائي المفضل: ${diet}
${allergies ? `- حساسية: ${allergies}` : "- حساسية: لا يوجد"}
${disliked ? `- أطعمة غير مرغوبة: ${disliked}` : ""}
${health ? `- الحالة الصحية: ${health}` : ""}
${overridesText}
احسب السعرات اليومية باستخدام معادلة Mifflin-St Jeor واحسب الماكروز حسب الهدف.
احسب نسبة الدهون باستخدام معادلة US Navy إذا توفّرت محيطات الجسم.
وزّع السعرات على ${meals} وجبات بشكل مناسب (الفطار أكبر من السناك).
لكل صنف: احسب الجرامات بالضبط لتطابق السعرات المستهدفة.
اذكر بدائل لكل صنف رئيسي.

أعد النتيجة بصيغة JSON صالحة فقط (بدون نص إضافي، بدون أسوار markdown) بالتنسيق المحدد في تعليمات النظام.`;
}

const WORKOUT_SYSTEM_PROMPT = `أنت مدرب لياقة محترف يعمل مع الكوتش أحمد زكي (MuscleHub).
مهمتك: تصميم برنامج تمارين أسبوعي مخصص باللغة العربية.

قواعد الإخراج:
- الإخراج JSON صالح فقط.
- استخدم أسماء أيام الأسبوع (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة).
- أدخل أيام راحة بين أيام التدريب.
- لكل يوم تدريبي: 4-6 تمارين مناسبة للعضلة المستهدفة.
- اجعل البرنامج متنوعاً — لا تكرر نفس التمارين في كل مرة.

تنسيق JSON:
{
 "overview": "نظرة عامة على البرنامج",
 "weekly_volume": "الحجم التدريبي الأسبوعي (مثلاً: 20 مجموعة)",
 "progression": "كيفية التقدم أسبوعياً (زيادة الوزن/التكرارات)",
 "days": [
 {
 "day": "السبت",
 "focus": "صدر وترايسبس",
 "isRest": false,
 "exercises": [
 {
 "name": "بنش بريس",
 "sets": 4,
 "reps": "6-8",
 "rest": "2-3 دقائق",
 "notes": "نصيحة قصيرة بالعربية",
 "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bench_press.jpg/200px-Bench_press.jpg"
 }
 ]
 },
 {
 "day": "الأحد",
 "focus": "راحة",
 "isRest": true,
 "exercises": []
 }
 ]
}`;

function buildWorkoutPrompt(ctx: ClientContext, name: string, overrides?: PlanOverrides): string {
 const fitness = ctx.fitness || {};
 const nutrition = ctx.nutrition || {};

 const goal = fitness.goal || "general fitness";
 const days = overrides?.mealsCount || fitness.days || "4"; // mealsCount reused as daysPerWeek
 const location = fitness.location || "gym";
 const experience = fitness.experience || "intermediate";
 const injuries = fitness.injuries || "";
 const weight = nutrition.weight || "80";
 const gender = nutrition.gender || "male";
 const weightNum = parseFloat(weight) || 80;
 const isHeavy = weightNum > 100; // heavy clients need joint-friendly exercises
 const isBeginner = experience.toLowerCase().includes("beginner") || experience.toLowerCase().includes("مبتدئ");
 const isHome = (location || "").toLowerCase().includes("home") || (location || "").includes("منزل");

 // Determine the split based on days/week — ensures full-body coverage
 const daysNum = parseInt(days) || 4;
 let splitDescription = "";
 if (daysNum <= 2) {
 splitDescription = `تقسيم: ${daysNum} يوم = كامل الجسم في كل يوم تدريب. كل يوم يجب أن يشمل:
- تمرين كبير للجزء السفلي (سكوات أو ديدليفت روماني)
- تمرين دفع للصدر/الأكتاف (بنش بريس أو ضغط كتف)
- تمرين سحب للظهر (تجديف أو سحب أمامي)
- تمرين للكور (بلانك أو كرنش)`;
 } else if (daysNum === 3) {
 splitDescription = `تقسيم: 3 أيام = كامل الجسم (Full Body A/B/C). كل يوم تدريب يجب أن يشمل:
- تمرين كبير سفلي (سكوات / ديدليفت / فرنت سكوات)
- تمرين دفع علوي (بنش بريس / ضغط كتف / بنش مائل)
- تمرين سحب (تجديف / سحب أمامي / هايبراكستينشن)
- تمرين مساعد للذراعين أو الكور
نوّع التمارين بين الأيام الثلاثة لتغطية كل عضلات الجسم.`;
 } else if (daysNum === 4) {
 splitDescription = `تقسيم: 4 أيام = Upper/Lower Split (أعلى/أسفل الجسم):
- اليوم 1: أعلى الجسم (صدر + ظهر + أكتاف + ذراعين)
- اليوم 2: أسفل الجسم (أرجل + كور)
- اليوم 3: أعلى الجسم (تمارين مختلفة عن اليوم 1)
- اليوم 4: أسفل الجسم (تمارين مختلفة عن اليوم 2)
هذا التقسيم يضمن تغطية كاملة لكل الجسم خلال الأسبوع.`;
 } else {
 splitDescription = `تقسيم: ${daysNum} أيام = Push/Pull/Legs/Upper/Lower:
- يوم Push (صدر + أكتاف + ترايسبس)
- يوم Pull (ظهر + بايسبس)
- يوم Legs (أرجل + كور)
- يوم Upper (أعلى الجسم كاملاً)
- يوم Lower (أسفل الجسم كاملاً)
نوّع التمارين بين الأيام لتغطية كل عضلات الجسم.`;
 }

 // Safety rules for beginners + heavy clients
 const safetyRules = isBeginner || isHeavy
 ? `

 قواعد أمان مهمة (العميل ${isBeginner ? "مبتدئ" : ""} ${isHeavy ? "وزنه كبير" : ""}):
- ممنوع: عقلة (Pull-ups) — صعبة جداً للمبتدئين وأصحاب الوزن الكبير. استخدم سحب أمامي (Lat Pulldown) بدلاً منها.
- ممنوع: ديبس (Dips) — تضع ضغط كبير على الكتف. استخدم ضغط بالدمبل أو بنش بريس بدلاً منها.
- ممنوع: ديدليفت تقليدي (Conventional Deadlift) من الأرض — استخدم رومانيان ديدليفت (RDL) بدلاً منها (أأمن للظهر).
- ممنوع: فرنت سكوات (Front Squat) — استخدم سكوات عادي أو جوب سكوات.
- استخدم: تمارين بالماكينات (ليج بريس، سحب أمامي، تجديف بالكابل) — أكثر أماناً للمبتدئين.
- استخدم: أوزان أخف + تكرارات أعلى (12-15 بدلاً من 6-8).
- ركّز على التقنية الصحيحة قبل زيادة الوزن.
- تمارين الكور مهمة جداً لحماية الظهر (بلانك، كرنش، bird dog).`
 : "";

 const overridesText = overrides?.notes
 ? `\n تعليمات خاصة من الكوتش: ${overrides.notes}\n`
 : "";

 return `صمّم برنامج تمارين أسبوعي مخصص باللغة العربية لعميل اسمه ${name}.

 بيانات العميل:
- الجنس: ${gender}
- الوزن: ${weight} كجم ${isHeavy ? "(وزن كبير — استخدم تمارين لطيفة بالمفاصل)" : ""}
- الهدف: ${goal}
- أيام التدريب/أسبوع: ${days}
- مكان التدريب: ${location} ${isHome ? "(منزل — استخدم تمارين بوزن الجسم أو دمبل)" : ""}
- مستوى الخبرة: ${experience} ${isBeginner ? "(مبتدئ — تجنب التمارين المتقدمة)" : ""}
- إصابات: ${injuries || "لا يوجد"}
${overridesText}
${splitDescription}${safetyRules}

قواعد إضافية:
- صمّم برنامج لـ ${days} أيام تدريب مع إدراج أيام راحة بينها.
- لكل يوم تدريبي: 4-6 تمارين مناسبة.
- اجعل البرنامج متنوعاً — لا تكرر نفس التمارين في كل يوم.
- لكل تمرين: اذكر المجموعات والتكرارات والراحة وملاحظة قصيرة عن التقنية.
- استخدم أسماء أيام الأسبوع (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة).

أعد النتيجة بصيغة JSON صالحة فقط (بدون نص إضافي، بدون أسوار markdown) بالتنسيق:
{
 "overview": "نظرة عامة",
 "weekly_volume": "الحجم الأسبوعي",
 "progression": "طريقة التقدم",
 "days": [
 {
 "day": "السبت",
 "focus": "صدر وترايسبس",
 "isRest": false,
 "exercises": [
 { "name": "بنش بريس", "sets": 4, "reps": "8-12", "rest": "90 ثانية", "notes": "نصيحة بالعربية" }
 ]
 }
 ]
}`;
}

/* --------------------------- Normalizers --------------------------- */

/**
 * Normalize a nutrition plan to ensure all required fields exist and
 * totals are computed correctly. Applies coach overrides if provided.
 */
function normalizeNutritionPlan(plan: any, overrides?: PlanOverrides): NutritionPlanContent {
 const meals = (plan.meals || []).map((m: any) => {
 const items = (m.items || []).map((it: any) => ({
 food: it.food || "",
 amount: it.amount || "",
 calories: typeof it.calories === "number" ? it.calories : 0,
 protein_g: it.protein_g,
 alternatives: it.alternatives,
 }));
 const total_calories =
 typeof m.total_calories === "number"
 ? m.total_calories
 : items.reduce((s: number, i: any) => s + (i.calories || 0), 0);
 const total_protein_g =
 typeof m.total_protein_g === "number"
 ? m.total_protein_g
 : items.reduce((s: number, i: any) => s + (i.protein_g || 0), 0);
 return {
 name: m.name || "وجبة",
 time: m.time,
 items,
 total_calories,
 total_protein_g,
 notes: m.notes,
 };
 });

 return {
 overview: plan.overview || "",
 data_analysis: plan.data_analysis,
 daily_calories:
 overrides?.targetCalories ||
 (typeof plan.daily_calories === "number" ? plan.daily_calories : 0),
 macros: {
 protein_g:
 overrides?.macros?.protein_g ||
 (plan.macros?.protein_g ?? 0),
 carbs_g:
 overrides?.macros?.carbs_g ||
 (plan.macros?.carbs_g ?? 0),
 fat_g:
 overrides?.macros?.fat_g ||
 (plan.macros?.fat_g ?? 0),
 protein_cal: plan.macros?.protein_cal,
 carbs_cal: plan.macros?.carbs_cal,
 fat_cal: plan.macros?.fat_cal,
 },
 supplements: plan.supplements,
 health_notes: plan.health_notes,
 water_target: plan.water_target,
 meals,
 };
}

function normalizeWorkoutPlan(plan: any): WorkoutPlanContent {
 return {
 overview: plan.overview || "",
 weekly_volume: plan.weekly_volume,
 progression: plan.progression,
 days: (plan.days || []).map((d: any) => ({
 day: d.day || "",
 focus: d.focus || "",
 isRest: !!d.isRest,
 exercises: (d.exercises || []).map((ex: any) => ({
 name: ex.name || "",
 sets: typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 0,
 reps: ex.reps || "",
 rest: ex.rest || "",
 notes: ex.notes || "",
 image: ex.image,
 })),
 })),
 };
}

/* ----------------- Coach-pasted plan normalizer ----------------- */

/**
 * Take free-text or loosely-structured plan content from the coach and
 * normalize it into the standard JSON format. Uses AI to parse the text,
 * then falls back to a simple best-effort structure if AI fails.
 *
 * This is what makes coach-added plans behave like AI-generated plans —
 * they get the same editable table UI and the same client-side
 * regenerate-meal button.
 */
export async function normalizeCoachPlanText(
 rawText: string,
 planType: "nutrition" | "workout",
): Promise<{ content: any; source: string }> {
 if (!rawText || !rawText.trim()) {
 return { content: null, source: "empty" };
 }

 // If it's already valid JSON, just normalize it.
 if (rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
 try {
 const parsed = JSON.parse(rawText);
 const normalized =
 planType === "nutrition"
 ? normalizeNutritionPlan(parsed)
 : normalizeWorkoutPlan(parsed);
 return { content: normalized, source: "json-direct" };
 } catch {
 // fall through to AI parsing
 }
 }

 const prompt = `أنت مساعد ذكي للكوتش أحمد زكي. مهمتك: تحويل نص خطة ${planType === "nutrition" ? "تغذية" : "تمارين"} حر (مكتوبة يدوياً أو منسوخة من PDF) إلى JSON منظم قابل للتعديل.

النص الأصلي:
"""
${rawText.slice(0, 8000)}
"""

استخرج كل المعلومات من النص وحوّلها إلى JSON بالتنسيق التالي:
${planType === "nutrition"
 ? `{
 "overview": "نظرة عامة من النص",
 "data_analysis": { "weight": "...", "height": "...", ... },
 "daily_calories": 1400,
 "macros": { "protein_g": 105, "carbs_g": 144, "fat_g": 45 },
 "supplements": [...],
 "health_notes": [...],
 "water_target": "...",
 "meals": [
 {
 "name": "الوجبة الأولى",
 "items": [
 { "food": "اسم الطعام", "amount": "100 جم", "calories": 165, "alternatives": "أو ..." }
 ],
 "total_calories": 650,
 "notes": "ملاحظات"
 }
 ]
}`
 : `{
 "overview": "نظرة عامة",
 "days": [
 {
 "day": "السبت",
 "focus": "صدر",
 "isRest": false,
 "exercises": [
 { "name": "بنش بريس", "sets": 4, "reps": "8-12", "rest": "90 ثانية", "notes": "..." }
 ]
 }
 ]
}`}

قواعد:
- إذا لم تجد قيمة لحق ما، اتركه فارغاً أو 0 — لا تخترع أرقاماً.
- احسب ${"total_calories"} لكل وجبة كمجموع سعرات أصنافها.
- حافظ على أسماء الأصناف والكميات كما هي في النص الأصلي.
- أعد JSON صالح فقط (بدون نص إضافي، بدون أسوار markdown).`;

 try {
 for (const model of OPENROUTER_FREE_MODELS) {
 if (!OPENROUTER_KEY) break;
 try {
 const { text } = await callAIWithFallback(
 prompt,
 {
 systemPrompt: "أنت مساعد ذكي لتحويل نصوص الخطط إلى JSON منظم. أعد JSON صالح فقط.",
 temperature: 0.3, // low temp for faithful extraction
 maxTokens: 6000,
 jsonMode: true,
 timeoutMs: 120_000,
 },
 {
 provider: "openrouter" as AIProvider,
 apiKey: OPENROUTER_KEY,
 model,
 baseUrl: OPENROUTER_BASE,
 },
 );
 const parsed = parseJSON<any>(text);
 if (parsed && (parsed.meals || parsed.days)) {
 const normalized =
 planType === "nutrition"
 ? normalizeNutritionPlan(parsed)
 : normalizeWorkoutPlan(parsed);
 return { content: normalized, source: `openrouter:${model}` };
 }
 } catch (e: any) {
 console.error(`[normalize-coach-plan] OpenRouter ${model} failed:`, e?.message);
 }
 }
 } catch (e: any) {
 console.error("[normalize-coach-plan] All models failed:", e?.message);
 }

 // Last-resort fallback: wrap the raw text in a minimal structure
 if (planType === "nutrition") {
 return {
 content: normalizeNutritionPlan({
 overview: rawText.slice(0, 500),
 daily_calories: 0,
 macros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
 meals: [],
 }),
 source: "raw-text-fallback",
 };
 }
 return {
 content: normalizeWorkoutPlan({
 overview: rawText.slice(0, 500),
 days: [],
 }),
 source: "raw-text-fallback",
 };
}
