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

import {
  callFreeAIFallbackChain,
  parseJSON,
} from "@/lib/ai-provider";
import {
  generateNutritionPlan,
  generateWorkoutPlan,
  type ClientContext,
} from "@/lib/ai-local";
import { EXERCISES } from "@/lib/exercises";

// Plan generator uses callFreeAIFallbackChain (interleaved OpenRouter + Groq)
// for all AI calls — strongest free models first, with Groq for speed.
// No Gemini dependency.

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
      exerciseSlug?: string; // links to our exercise library
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
 * Generate a nutrition plan via AI, with fallback to local.
 *
 * #3 FIX (2026-08-27): daily calories / BMR / TDEE / macros are computed
 * SERVER-SIDE first (computeNutritionTargets), injected into the prompt as
 * MANDATORY numbers, then RE-ENFORCED on the parsed output via
 * normalizeNutritionPlan(targets) — the model cannot overwrite them.
 */
export async function generateNutritionPlanAI(
  ctx: ClientContext,
  overrides?: PlanOverrides,
): Promise<GeneratePlanResult> {
  const name = ctx.name || "العميل";
  const targets = computeNutritionTargets(ctx, overrides);
  // Add a randomization seed to the prompt so each generation produces
  // different meal/exercise choices even for the same client.
  const seed = Math.floor(Math.random() * 1000000);
  const prompt = `${buildNutritionPrompt(ctx, name, overrides, targets)}

ملاحظة: كل توليد يجب أن ينتج خطة مختلفة. استخدم تنويع ${seed} لاختيار أصناف جديدة.`;

  try {
    // Use callFreeAIFallbackChain — OpenRouter + Groq interleaved (owner
    // directive). Chain self-clamps maxModels × timeoutMs ≤ 52s (Vercel Hobby).
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        systemPrompt: NUTRITION_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 4000,
        jsonMode: true,
        timeoutMs: 26_000,
        maxModels: 2,
      },
    );
    const parsed = parseJSON<NutritionPlanContent>(text);
    if (parsed && parsed.meals && parsed.meals.length > 0) {
      return {
        title: `خطة تغذية - ${name}`,
        content: normalizeNutritionPlan(parsed, overrides, targets),
        source: `${provider}:${model}`,
      };
    }
  } catch (e: any) {
    console.error("[plan-generator] Nutrition plan AI failed:", e?.message);
  }

  // Fallback: local rule-based generator
  const local = generateNutritionPlan(ctx);
  return {
    title: `خطة تغذية - ${name}`,
    content: normalizeNutritionPlan(local, overrides, targets),
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
  // Randomization seed for variety
  const seed = Math.floor(Math.random() * 1000000);
  const prompt = `${buildWorkoutPrompt(ctx, name, overrides)}

ملاحظة: كل توليد يجب أن ينتج برنامج مختلف. استخدم تنويع ${seed} لاختيار تمارين جديدة.`;

  try {
    // OpenRouter + Groq only (owner directive) — clamped ≤ 52s.
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        systemPrompt: WORKOUT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 4000,
        jsonMode: true,
        timeoutMs: 26_000,
        maxModels: 2,
      },
    );
    const parsed = parseJSON<WorkoutPlanContent>(text);
    if (parsed && parsed.days && parsed.days.length > 0) {
      return {
        title: `برنامج تمارين - ${name}`,
        content: normalizeWorkoutPlan(parsed),
        source: `${provider}:${model}`,
      };
    }
  } catch (e: any) {
    console.error("[plan-generator] Workout plan AI failed:", e?.message);
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
  meal: {
    name?: string;
    items?: Array<{ food: string; amount: string; calories: number }>;
    notes?: string;
  },
  targetCalories?: number,
  clientContext?: ClientContext,
  coachNote?: string,
): Promise<{ meal: any; source: string }> {
  const totalCals =
    targetCalories ||
    (meal.items || []).reduce((s, i) => s + (i.calories || 0), 0);

  const prompt = `أنت أخصائي تغذية محترف. أعد توليد وجبة بديلة بنفس السعرات (${totalCals} سعرة) ونفس نسب الماكروز قدر الإمكان.

${
  clientContext
    ? `بيانات العميل (راعِ الحساسية والأطعمة غير المحببة):
${JSON.stringify({ ...clientContext, name: undefined }, null, 2)}`
    : ""
}

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
    // OpenRouter + Groq only — clamped ≤ 52s.
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        systemPrompt: NUTRITION_SYSTEM_PROMPT,
        temperature: 0.8,
        maxTokens: 1500,
        jsonMode: true,
        timeoutMs: 24_000,
        maxModels: 2,
      },
    );
    const parsed = parseJSON<any>(text);
    if (parsed && parsed.items && parsed.items.length > 0) {
      return { meal: parsed, source: `${provider}:${model}` };
    }
  } catch (e: any) {
    console.error("[regenerate-meal] AI failed:", e?.message);
  }

  // Fallback: return the original meal unchanged (the caller can show an error)
  throw new Error("تعذّر إعادة توليد الوجبة. حاول مرة أخرى.");
}

/* ----------------- Deterministic calorie/macro computation ----------------- */

/**
 * OWNER DIRECTIVE (#3, 2026-08-27): the AI must NOT compute calories/macros
 * by itself — server-side math only. These targets are computed deterministically,
 * injected into the prompt as MANDATORY values, and re-enforced on the parsed
 * output in normalizeNutritionPlan() so whatever the model returns cannot
 * overwrite them.
 *
 * Formulas (documented for the owner):
 *   BMR   = Mifflin-St Jeor  → male: 10W + 6.25H - 5A + 5 | female: 10W + 6.25H - 5A - 161
 *   TDEE  = BMR × activity multiplier (1.2 sedentary … 1.9 athlete)
 *   Goal adjust: weight-loss −20% deficit · muscle-gain +10% surplus · else maintain
 *   Macros (default): protein 2.0 g/kg · fat 25% of kcal · carbs = remaining kcal / 4
 *     (protein set aside first at 4 kcal/g; coach overrides always win)
 *   Body fat (optional): US Navy method when neck+waist(+hip for females) exist.
 */
export type NutritionTargets = {
  gender: "male" | "female";
  weightKg: number;
  heightCm: number;
  ageYears: number;
  bmr: number;
  tdee: number;
  dailyCalories: number;
  goalAdjustmentPct: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  bodyFatPct: number | null;
};

function numOr(v: any, fallback: number): number {
  const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Map questionnaire activity strings (AR or EN) to a TDEE multiplier. */
function activityMultiplier(activity: any): number {
  const a = String(activity || "").toLowerCase();
  if (/sedentary|خفيف جدا|قليل الحركة|مكتبي/.test(a)) return 1.2;
  if (/light|خفيف|1-3/.test(a)) return 1.375;
  if (/moderate|متوسط|معتدل|3-5/.test(a)) return 1.55;
  if (/very active|نشط جدا|6-7|رياضي ثقيل/.test(a)) return 1.725;
  if (/athlete|extra active|رياضي محترف|تدريب يومي/.test(a)) return 1.9;
  // Fallback heuristic on training days/week when activity label is vague.
  return 1.55;
}

function computeNutritionTargets(ctx: ClientContext, overrides?: PlanOverrides): NutritionTargets {
  const nutrition = ctx.nutrition || {};
  const fitness = ctx.fitness || {};
  const measurements = ctx.recent_measurements?.[0] || {};

  const genderRaw = String(nutrition.gender || "male").toLowerCase();
  const gender: "male" | "female" =
    genderRaw.includes("f") || /أنثى|بنت|امرأة|إمرأة|حرم/.test(genderRaw)
      ? "female"
      : "male";

  const weightKg = numOr(nutrition.weight ?? measurements.weight, 80);
  const heightCm = numOr(nutrition.height, 175);
  const ageYears = numOr(nutrition.age, 25);

  // Coach overrides are authoritative when present.
  const overrideCalories = numOr(overrides?.targetCalories, 0);

  // 1. BMR — Mifflin-St Jeor (gender-correct constant).
  const bmr = Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * ageYears + (gender === "male" ? 5 : -161),
  );

  // 2. TDEE — activity multiplier.
  const tdee = Math.round(bmr * activityMultiplier(fitness.activity));

  // 3. Goal adjustment.
  const goal = String(fitness.goal || "").toLowerCase();
  let goalAdjustmentPct = 0;
  if (/weight.?loss|lose|fat loss|تخفيس|تنحيف|خسارة وزن|دهون/.test(goal)) {
    goalAdjustmentPct = -20;
  } else if (/muscle|gain|bulk|mass|ضخام|بناء عضل|زيادة وزن/.test(goal)) {
    goalAdjustmentPct = +10;
  }

  let dailyCalories =
    overrideCalories > 0 ? Math.round(overrideCalories) : Math.round(tdee * (1 + goalAdjustmentPct / 100));
  // Safety floor: never below 1200 kcal (medical minimum).
  dailyCalories = Math.max(1200, dailyCalories);

  // 4. Macros — protein-first policy unless overridden.
  const protein_g = overrides?.macros?.protein_g ?? Math.round(2.0 * weightKg);
  const fat_g = overrides?.macros?.fat_g ?? Math.round((dailyCalories * 0.25) / 9);
  const carbsFromProteinFat = dailyCalories - protein_g * 4 - fat_g * 9;
  const carbs_g = overrides?.macros?.carbs_g ?? Math.max(50, Math.round(carbsFromProteinFat / 4));

  // 5. Body fat — US Navy (optional inputs).
  let bodyFatPct: number | null = null;
  const neck = numOr(nutrition.neck, 0);
  const waist = numOr(nutrition.waist ?? measurements.waist, 0);
  const hip = numOr(nutrition.hip, 0);
  if (neck > 0 && waist > 0) {
    try {
      bodyFatPct =
        gender === "male"
          ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450
          : hip > 0
            ? 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(heightCm)) - 450
            : null;
      if (bodyFatPct !== null) bodyFatPct = Math.round(Math.max(3, Math.min(70, bodyFatPct)) * 10) / 10;
    } catch {
      bodyFatPct = null;
    }
  }

  return { gender, weightKg, heightCm, ageYears, bmr, tdee, dailyCalories, goalAdjustmentPct, macros: { protein_g, carbs_g, fat_g }, bodyFatPct };
}

const ACTIVITY_AR: Record<string, string> = {
  "1.2": "خفيف جداً (قليل الحركة)",
  "1.375": "خفيف (١-٣ أيام تدريب)",
  "1.55": "متوسط (٣-٥ أيام تدريب)",
  "1.725": "نشط جداً (٦-٧ أيام)",
  "1.9": "رياضي محترف / عمل بدني شاق",
};

function goalLabelAr(pct: number): string {
  if (pct < 0) return `خسارة وزن (عجز حراري ${Math.abs(pct)}%)`;
  if (pct > 0) return `بناء عضل (فائض حراري ${pct}%)`;
  return "الحفاظ على الوزن";
}

function activityLabelAr(mult: number): string {
  const entries = Object.entries(ACTIVITY_AR);
  let best = entries[0];
  for (const e of entries) {
    if (Math.abs(parseFloat(e[0]) - mult) < Math.abs(parseFloat(best[0]) - mult)) best = e;
  }
  return best[1];
}

const NUTRITION_SYSTEM_PROMPT = `أنت أخصائي تغذية رياضية محترف يعمل في منصة MuscleHubEG.
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

function buildNutritionPrompt(
  ctx: ClientContext,
  name: string,
  overrides: PlanOverrides | undefined,
  targets?: NutritionTargets,
): string {
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

  // #3 FIX — deterministic server-computed targets are MANDATORY.
  const targetsText = targets
    ? `

⚠ مهمة جداً — أرقام رسمية محسوبة مسبقاً من نظام المنصة (إلزامية):
- BMR (Mifflin-St Jeor): ${targets.bmr} سعرة
- TDEE: ${targets.tdee} سعرة
- مستوى النشاط المعتمد: ${activityLabelAr(targets.tdee / Math.max(1, targets.bmr))}
- الهدف المعتمد: ${goalLabelAr(targets.goalAdjustmentPct)}
- daily_calories اليومية = ${targets.dailyCalories} سعرة (ضع هذا الرقم كما هو في المخرجات)
- الماكروز الرسمية: بروتين ${targets.macros.protein_g}جم (${targets.macros.protein_g * 4} سعرة) / كارب ${targets.macros.carbs_g}جم (${targets.macros.carbs_g * 4} سعرة) / دهون ${targets.macros.fat_g}جم (${targets.macros.fat_g * 9} سعرة)
${targets.bodyFatPct !== null ? `- body_fat_pct (US Navy): ~${targets.bodyFatPct}%` : ""}
ممنوع تغيير هذه الأرقام أو إعادة حسابها. مهمتك الوحيدة: توزيع الوجبات والأصناف بحيث يقترب مجموع كل وجبة من حصتها من ${targets.dailyCalories} سعرة، مع ذكر سعرات تقديرية لكل صنف (تُدقق في المراجعة).`
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
${(nutrition as any).notes ? `- ملاحظات إضافية من استبيان التغذية: ${(nutrition as any).notes}` : ""}
${(fitness as any).notes && !(nutrition as any).notes ? `- ملاحظات إضافية من استبيان اللياقة: ${(fitness as any).notes}` : (fitness as any).notes ? `- ملاحظات اللياقة: ${(fitness as any).notes}` : ""}
${overridesText}
الأرقام الرسمية (daily_calories / الماكروز / BMR / TDEE) تم حسابها مسبقاً من نظام المنصة في قسم "أرقام رسمية" أعلاه — انسخها كما هي ولا تعيد حسابها.
مهمتك هي فقط توزيع الوجبات والأصناف.
وزّع السعرات على ${meals} وجبات بشكل مناسب (الفطار أكبر من السناك).
لكل صنف: اذكر الكمية بالجرام والسعرات التقديرية بحيث يقترب مجموع الوجبة من حصتها.
اذكر بدائل لكل صنف رئيسي.
${targetsText}

أعد النتيجة بصيغة JSON صالحة فقط (بدون نص إضافي، بدون أسوار markdown) بالتنسيق المحدد في تعليمات النظام.`;
}

const WORKOUT_SYSTEM_PROMPT = `أنت مدرب لياقة محترف يعمل في منصة MuscleHubEG.
مهمتك: تصميم برنامج تمارين أسبوعي مخصص باللغة العربية.

قواعد الإخراج:
- الإخراج JSON صالح فقط.
- استخدم أسماء أيام الأسبوع (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة).
- أدخل أيام راحة بين أيام التدريب.
- لكل يوم تدريبي: 4-6 تمارين مناسبة للعضلة المستهدفة.
- اجعل البرنامج متنوعاً — لا تكرر نفس التمارين في كل مرة.
- استخدم أسماء تمارين مطابقة لمكتبة التمارين لدينا بالإنجليزية (Bench Press, Squat, Deadlift, etc.) لتظهر صورها تلقائياً.
- لا تضع حقل image — الصور تُولّد تلقائياً من اسم التمرين.

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
 "name": "Bench Press",
 "sets": 4,
 "reps": "6-8",
 "rest": "2-3 دقائق",
 "notes": "نصيحة قصيرة بالعربية"
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

function buildWorkoutPrompt(
  ctx: ClientContext,
  name: string,
  overrides?: PlanOverrides,
): string {
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
  const isBeginner =
    experience.toLowerCase().includes("beginner") ||
    experience.toLowerCase().includes("مبتدئ");
  const isHome =
    (location || "").toLowerCase().includes("home") ||
    (location || "").includes("منزل");

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
  const safetyRules =
    isBeginner || isHeavy
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
 *
 * #3 FIX (2026-08-27): when deterministic targets are provided, the
 * persisted numbers come from SERVER math, not the model:
 *   - daily_calories ← targets (unless a coach override already won)
 *   - macros g + kcal splits ← recomputed from the enforced calories/grams
 *   - data_analysis.bmr/tdee/body_fat_pct ← server-computed values
 */
function normalizeNutritionPlan(
  plan: any,
  overrides?: PlanOverrides,
  targets?: NutritionTargets,
): NutritionPlanContent {
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

  // ── Deterministic number enforcement (#3 fix) ──────────────────────
  let daily_calories: number;
  if (overrides?.targetCalories && overrides.targetCalories > 0) {
    daily_calories = overrides.targetCalories;
  } else if (targets) {
    daily_calories = targets.dailyCalories; // server math wins over AI output
  } else {
    daily_calories =
      typeof plan.daily_calories === "number" ? plan.daily_calories : 0;
  }

  const protein_g =
    (overrides?.macros?.protein_g || targets?.macros.protein_g || plan.macros?.protein_g) ?? 0;
  const carbs_g =
    (overrides?.macros?.carbs_g || targets?.macros.carbs_g || plan.macros?.carbs_g) ?? 0;
  const fat_g =
    (overrides?.macros?.fat_g || targets?.macros.fat_g || plan.macros?.fat_g) ?? 0;

  const data_analysis = targets
    ? {
        ...(plan.data_analysis || {}),
        gender: targets.gender === "male" ? "ذكر" : "أنثى",
        weight: `${targets.weightKg} كجم`,
        height: `${targets.heightCm} سم`,
        age: `${targets.ageYears} سنة`,
        body_fat_pct:
          targets.bodyFatPct !== null ? `~${targets.bodyFatPct}%` : (plan.data_analysis?.body_fat_pct ?? ""),
        bmr: targets.bmr,
        tdee: targets.tdee,
      }
    : plan.data_analysis;

  return {
    overview: plan.overview || "",
    data_analysis,
    daily_calories,
    macros: {
      protein_g,
      carbs_g,
      fat_g,
      protein_cal: protein_g * 4,
      carbs_cal: carbs_g * 4,
      fat_cal: fat_g * 9,
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
      exercises: (d.exercises || []).map((ex: any) => {
        const name = ex.name || "";
        const matched = findExerciseInLibrary(name);
        return {
          name: matched ? matched.nameEn : name,
          sets: typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 0,
          reps: ex.reps || "",
          rest: ex.rest || "",
          notes: ex.notes || "",
          image: matched ? getExerciseImageFromLibrary(matched) : ex.image,
          exerciseSlug: matched ? matched.slug : undefined,
        };
      }),
    })),
  };
}

/**
 * Find an exercise in our library by name (fuzzy match).
 * The AI generates Arabic or English exercise names — we try to match them
 * to our 547-exercise library.
 */
function findExerciseInLibrary(name: string): any | null {
  if (!name) return null;
  const q = name.toLowerCase().trim();

  // Direct name match
  let match = EXERCISES.find((e) => e.nameEn.toLowerCase() === q);
  if (match) return match;

  // Partial name match
  match = EXERCISES.find(
    (e) =>
      e.nameEn.toLowerCase().includes(q) || q.includes(e.nameEn.toLowerCase()),
  );
  if (match) return match;

  // Arabic keyword matching
  const arabicMap: Array<{ keywords: string[]; enName: string }> = [
    { keywords: ["بنش بريس", "bench press"], enName: "Bench Press" },
    { keywords: ["سكوات", "squat"], enName: "Barbell Squat" },
    { keywords: ["ديدليفت", "deadlift"], enName: "Deadlift" },
    { keywords: ["عقلة", "pull-up", "pull up"], enName: "Pull-Up" },
    { keywords: ["ضغط أرضي", "push-up", "push up"], enName: "Push-Up" },
    { keywords: ["بلانك", "plank"], enName: "Plank" },
    { keywords: ["كرنش", "crunch"], enName: "Crunches" },
    { keywords: ["لانجز", "lunge"], enName: "Lunges" },
    { keywords: ["بايسبس", "bicep", "curl"], enName: "Dumbbell Bicep Curl" },
    { keywords: ["ترايسبس", "tricep", "pushdown"], enName: "Triceps Pushdown" },
    {
      keywords: ["كتف", "shoulder", "press"],
      enName: "Dumbbell Shoulder Press",
    },
    { keywords: ["تجديف", "row"], enName: "Bent Over Row" },
    { keywords: ["هيب ثرست", "hip thrust"], enName: "Barbell Hip Thrust" },
    { keywords: ["كاف", "calf"], enName: "Standing Calf Raises" },
    { keywords: ["ليج بريس", "leg press"], enName: "Leg Press" },
    { keywords: ["ليج كيرل", "leg curl"], enName: "Lying Leg Curls" },
    { keywords: ["ليج اكستنشن", "leg extension"], enName: "Leg Extensions" },
  ];

  for (const { keywords, enName } of arabicMap) {
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        match = EXERCISES.find((e) => e.nameEn === enName);
        if (match) return match;
        // Fuzzy: find any exercise whose name contains the English keyword
        match = EXERCISES.find((e) =>
          e.nameEn.toLowerCase().includes(kw.toLowerCase()),
        );
        if (match) return match;
      }
    }
  }

  return null;
}

/**
 * Get the first image URL from an exercise in our library.
 */
function getExerciseImageFromLibrary(exercise: any): string | undefined {
  if (!exercise || !exercise.imageKey) return undefined;
  const images = exercise.imageKey.split(",").filter(Boolean);
  if (images.length === 0) return undefined;
  return `${images[0].trim()}`;
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

  const prompt = `أنت مساعد ذكي في منصة MuscleHubEG. مهمتك: تحويل نص خطة ${planType === "nutrition" ? "تغذية" : "تمارين"} حر (مكتوبة يدوياً أو منسوخة من PDF) إلى JSON منظم قابل للتعديل.

النص الأصلي:
"""
${rawText.slice(0, 8000)}
"""

استخرج كل المعلومات من النص وحوّلها إلى JSON بالتنسيق التالي:
${
  planType === "nutrition"
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
}`
}

قواعد:
- إذا لم تجد قيمة لحق ما، اتركه فارغاً أو 0 — لا تخترع أرقاماً.
- احسب ${"total_calories"} لكل وجبة كمجموع سعرات أصنافها.
- حافظ على أسماء الأصناف والكميات كما هي في النص الأصلي.
- أعد JSON صالح فقط (بدون نص إضافي، بدون أسوار markdown).`;

  try {
    // OpenRouter + Groq only — clamped ≤ 52s.
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        systemPrompt:
          "أنت مساعد ذكي لتحويل نصوص الخطط إلى JSON منظم. أعد JSON صالح فقط.",
        temperature: 0.3, // low temp for faithful extraction
        maxTokens: 4000,
        jsonMode: true,
        timeoutMs: 26_000,
        maxModels: 2,
      },
    );
    const parsed = parseJSON<any>(text);
    if (parsed && (parsed.meals || parsed.days)) {
      const normalized =
        planType === "nutrition"
          ? normalizeNutritionPlan(parsed)
          : normalizeWorkoutPlan(parsed);
      return { content: normalized, source: `${provider}:${model}` };
    }
  } catch (e: any) {
    console.error("[normalize-coach-plan] AI failed:", e?.message);
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
