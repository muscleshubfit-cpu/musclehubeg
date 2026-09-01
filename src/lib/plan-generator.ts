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
import { EXERCISES, CATEGORY_LABELS, EQUIPMENT_LABELS, LEVEL_LABELS } from "@/lib/exercises";

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
      carbs_g?: number; // produced by the coach editor's auto-calc + meal totals
      fat_g?: number;
      alternatives?: string; // "أو 180 جم سمك مشوي / 150 جم لحم أحمر"
    }>;
    total_calories?: number;
    total_protein_g?: number;
    total_carbs_g?: number; // recomputed by CoachClientView editor after item edits
    total_fat_g?: number;
    notes?: string;
    /** Exactly ≤2 complete replacement meals (owner directive #2). */
    meal_alternatives?: MealAlternative[];
  }>;
  // Original simple-format meals are kept for backwards compat with the
  // existing PlanViewerModal. The new fields (data_analysis, supplements,
  // health_notes, water_target, alternatives, totals, meal_alternatives)
  // are optional.
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

/* ─────────────────── PHASE 62 VARIETY ENGINE ───────────────────
 * The old "استخدم تنويع N" seed sentence was too weak: free models
 * weight the structured JSON contract far above it, and the anchored
 * few-shot examples pulled every plan toward the same foods/lifts.
 * Each generation now carries: (1) a ROTATED explicit direction
 * (cuisine emphasis for nutrition, training emphasis for workout),
 * (2) a hard no-copy law for the examples, and (3) an avoid-list of
 * names already used in the client's previous plans.
 * ───────────────────────────────────────────────────────────── */
const NUTRITION_CUISINE_ROTATIONS = [
  "اتجاه بحري (سمك، جمبري، تونا، سلمون) كأساس للبروتين",
  "اتجاه شرقي بالفرن (دجاج/لحم بالفرن مع خضار مشكلة)",
  "اتجاه نباتي جزئي (عدس، حمص، فاصوليا مع ألبان قليلة الدسم)",
  "اتجاه مصري شعبي خفيف (مشويات، شوربات، محشيات صحية)",
  "اتجاه متوسطي (زيت زيتون، جبن أبيض، زيتون، خضار مشوية)",
  "اتجاه وجبات سريعة صحية (شكشوكة، سلطة تونا، راب دجاج، بول)",
];
const WORKOUT_EMPHASIS_ROTATIONS = [
  "ابدأ الأسبوع بتركيز أعلى على الجزء العلوي واختم بالسفلي",
  "ابدأ الأسبوع بتركيز أعلى على الجزء السفلي واختم بالعلوي",
  "ركّز على المعدات الحرة (بار/دمبل) أكثر من الأجهزة",
  "ركّز على الأجهزة والكابل ووزن الجسم أكثر من البار",
  "أضف لمسة قوة (مجموعات أقل وتكرارات أقل وأوزان أعلى) للأيام الرئيسية",
  "أضف لمسة تحمّل (تكرارات أعلى وراحات أقصر) للأيام الرئيسية",
];

export function buildVarietyBlock(
  kind: "nutrition" | "workout",
  seed: number,
  avoidNames: string[],
): string {
  const list = kind === "nutrition" ? NUTRITION_CUISINE_ROTATIONS : WORKOUT_EMPHASIS_ROTATIONS;
  const direction = list[Math.abs(seed) % list.length];
  const clean = avoidNames.filter((n) => typeof n === "string" && n.trim().length > 1);
  const avoidBlock =
    clean.length > 0
      ? `\n\n⚠ أصناف/تمارين استُخدمت في خطط سابقة لنفس العميل — اختر بدائل مختلفة عنها قدر الإمكان:\n${clean.slice(0, 60).map((n) => `- ${n}`).join("\n")}`
      : "";
  return `\n\n⚠ تعليمات تنويع إلزامية لهذا التوليد (#${Math.abs(seed)}):\n- الاتجاه المطلوب هذه المرة: ${direction}\n- كل وجبة/يوم يجب أن يختلف في أصنافه وترتيبه عن باقي الوجبات/الأيام.\n- ممنوع نسخ أمثلة التعليمات الحرفية — اختر أصنافاً/تمارين جديدة مناسبة لبيانات العميل.${avoidBlock}`;
}

/**
 * OWNER DIRECTIVE #2 (2026-08-27): every meal ships with TWO complete
 * alternative meals (same calorie share / macros share). Structured
 * full-meal objects — NOT free-text strings — so PlanViewerModal can
 * render real tables and users can act on them.
 */
export type MealAlternative = {
  name: string;
  items: Array<{ food: string; amount: string; calories: number }>;
  total_calories?: number;
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
  const prompt = `${buildNutritionPrompt(ctx, name, overrides, targets)}${buildVarietyBlock("nutrition", seed, ctx.recent_plan_names ?? [])}`;

  try {
    // Use callFreeAIFallbackChain — OpenRouter + Groq interleaved (owner
    // directive). Chain self-clamps maxModels × timeoutMs ≤ 52s (Vercel Hobby).
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        tag: "plan:nutrition",
        systemPrompt: NUTRITION_SYSTEM_PROMPT,
        temperature: 0.7,
        // GHA-native budget (workflow sets AI_CHAIN_TOTAL_BUDGET_MS=180000):
        // full plans now include 2 structured alternatives per meal.
        maxTokens: 7000,
        jsonMode: true,
        timeoutMs: 70_000,
        // QUALITY-FIRST LAW (2026-08-28i): 5 buckets — under provider
        // saturation the strongest available model must stay reachable.
        maxModels: 5,
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
  const prompt = `${buildWorkoutPrompt(ctx, name, overrides)}${buildVarietyBlock("workout", seed, ctx.recent_plan_names ?? [])}`;

  try {
    // OpenRouter + Groq only (owner directive) — clamped ≤ 52s.
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        tag: "plan:workout",
        systemPrompt: WORKOUT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 4000,
        jsonMode: true,
        timeoutMs: 35_000,
        // QUALITY-FIRST LAW (2026-08-28i): 4 buckets + a humane 35s window
        // (was 26s — too tight for a multi-week program on slow models).
        maxModels: 4,
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
 * OWNER DIRECTIVE #2 (2026-08-27): returns the replacement meal PLUS three
 * additional alternative suggestions, each with macros + calories. The
 * regeneration reason (allergy / dislike / boredom) steers the model.
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
  avoidNames: string[] = [],
): Promise<{ meal: any; suggestions: any[]; source: string }> {
  const totalCals =
    targetCalories ||
    (meal.items || []).reduce((s, i) => s + (i.calories || 0), 0);

  const avoidBlock =
    Array.isArray(avoidNames) && avoidNames.length > 0
      ? `\nأصناف أخرى في نفس الخطة (تجنب تكرارها في الوجبة الجديدة والاقتراحات):
${avoidNames.slice(0, 40).join("، ")}\n`
      : "";

  const prompt = `أنت أخصائي تغذية محترف. أعد توليد وجبة بديلة بنفس السعرات (${totalCals} سعرة) ونفس نسب الماكروز قدر الإمكان.
${avoidBlock}
${
  clientContext
    ? `بيانات العميل (راعِ الحساسية والأطعمة غير المحببة):
${JSON.stringify({ ...clientContext, name: undefined }, null, 2)}`
    : ""
}

الوجبة الحالية (لاحظ تنوع الأصناف وابتعد عن التكرار):
${JSON.stringify(meal, null, 2)}

${coachNote ? `تعليمات الكوتش: ${coachNote}` : ""}

أعد النتيجة بصيغة JSON فقط (بدون أسوار markdown):
{
 "meal": {
   "name": "اسم الوجبة",
   "time": "وقت تقديم الوجبة (اختياري)",
   "items": [
     { "food": "اسم الطعام", "amount": "الكمية بالجرام (مثلاً: 150 جم)", "calories": 300, "protein_g": 30, "alternatives": "أو 180 جم سمك مشوي" }
   ],
   "total_calories": ${totalCals},
   "total_protein_g": 45,
   "notes": "ملاحظة قصيرة بالعربية"
 },
 "suggestions": [
   { "name": "اقتراح بديل 1", "items": [ { "food": "..", "amount": "..", "calories": 0 } ], "total_calories": ${totalCals}, "why": "سبب ملاءمته بالعربية" },
   { "name": "اقتراح بديل 2", "items": [ { "food": "..", "amount": "..", "calories": 0 } ], "total_calories": ${totalCals}, "why": ".." },
   { "name": "اقتراح بديل 3", "items": [ { "food": "..", "amount": "..", "calories": 0 } ], "total_calories": ${totalCals}, "why": ".." }
 ]
}

تأكد أن مجموع سعرات أصناف الوجبة الرئيسية وكل اقتراح يساوي تقريباً ${totalCals}. استخدم أصناف عربية/مصرية متنوعة. لا تكرر نفس الأصناف الموجودة في الوجبة الحالية.`;

  try {
    // OpenRouter + Groq only — GHA budget allows richer output now.
    const { text, model, provider } = await callFreeAIFallbackChain(
      prompt,
      {
        tag: "plan:nutrition-alt",
        systemPrompt: NUTRITION_SYSTEM_PROMPT,
        temperature: 0.8,
        maxTokens: 2600,
        jsonMode: true,
        timeoutMs: 60_000,
        maxModels: 3,
      },
    );
    const parsed = parseJSON<any>(text);
    if (parsed?.meal?.items?.length > 0) {
      return {
        meal: parsed.meal,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 3)
          : [],
        source: `${provider}:${model}`,
      };
    }
    // Backward-compat shape (flat meal object without wrapper).
    if (parsed && parsed.items && parsed.items.length > 0) {
      return { meal: parsed, suggestions: [], source: `${provider}:${model}` };
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

const NUTRITION_SYSTEM_PROMPT = `أنت أخصائي تغذية رياضية محترف يعمل في منصة Musclehubeg.
مهمتك: تصميم خطة تغذية مخصصة باللغة العربية بأسلوب احترافي يطابق شكل التقارير الطبية.

قواعد الإخراج:
- الإخراج JSON صالح فقط — لا نص قبله أو بعده، لا أسوار markdown.
- استخدم أصناف متنوعة من المطبخ العربي والمصري.
- لكل صنف: اذكر الكمية بالجرام (مثلاً "150 جم") والسعرات بدقة.
- استبدل العناصر غير المرغوبة ببدائل مناسبة.
- اذكر بدائل لكل صنف رئيسي (protein/carb) ليختار منها العميل.
- لكل وجبة: أضف حقل "meal_alternatives" يحتوي بالضبط على وجبتين بديلتين كاملتين (كل بديل بحصة سعرات مكافئة ±10%).
- احسب المجموع الكلي للسعرات والبروتين لكل وجبة.

⚠ قانون التنويع الإلزامي (PHASE 62):
- النموذج التوضيحي أدناه يشرح "الشكل" فقط — ممنوع منعاً باتاً نسخ أصنافه (بيض مسلوق، خبز بلدي، فول، شوفان، جبن قريش…) إلا إذا كان مناسبين فعلاً لبيانات العميل المحددة.
- نوّع مصادر البروتين عبر الوجبات والأيام (سمك، دجاج، لحم قليل الدهن، تونا، جمبري، بيض، بقوليات، ألبان قليلة الدسم…).
- نوّع مصادر الكارب (رز، بطاطس، بطاطا، مكرونة، بلغر، كسكسي، ذرة، خبز أسمر…) ولا تكرر نفس الكارب في كل وجبة.
- نوّع الخضار والفواكه والمكسرات والزيوت بين الوجبات.
- إذا توفرت قائمة "أصناف استُخدمت سابقاً" في التعليمات فاختر أصنافاً مختلفة عنها قدر الإمكان.

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
 "notes": "وجبة رئيسية — ركّز على البروتين",
 "meal_alternatives": [
 { "name": "بديل 1 – فول بالليمون", "items": [ { "food": "فول مدمس", "amount": "200 جم", "calories": 230 }, { "food": "خبز بلدي", "amount": "½ رغيف", "calories": 180 }, { "food": "جبن قريش", "amount": "50 جم", "calories": 90 }, { "food": "خضار طازجة", "amount": "طبق", "calories": 80 } ], "total_calories": 580 },
 { "name": "بديل 2 – شوفان باللبن", "items": [ { "food": "شوفان", "amount": "70 جم", "calories": 260 }, { "food": "لبن زبادي", "amount": "250 جم", "calories": 150 }, { "food": "موزة", "amount": "1 وسطة", "calories": 105 }, { "food": "مكسرات", "amount": "15 جم", "calories": 90 } ], "total_calories": 605 }
 ]
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

const WORKOUT_SYSTEM_PROMPT = `أنت مدرب لياقة محترف يعمل في منصة Musclehubeg.
مهمتك: تصميم برنامج تمارين أسبوعي مخصص باللغة العربية.

قواعد الإخراج:
- الإخراج JSON صالح فقط.
- استخدم أسماء أيام الأسبوع (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة).
- أدخل أيام راحة بين أيام التدريب.
- لكل يوم تدريبي: 4-6 تمارين مناسبة للعضلة المستهدفة.
- اجعل البرنامج متنوعاً — لا تكرر نفس التمارين في كل مرة.
- استخدم أسماء تمارين مطابقة لمكتبة التمارين لدينا بالإنجليزية (Bench Press, Squat, Deadlift, etc.) لتظهر صورها تلقائياً.
- لا تضع حقل image — الصور تُولّد تلقائياً من اسم التمرين.

⚠ قانون التنويع الإلزامي (PHASE 62):
- النموذج التوضيحي أدناه يشرح "الشكل" فقط — ممنوع نسخ نفس التمارين في كل خطة.
- لكل مجموعة عضلية استخدم تنويعات مختلفة عبر الأيام والخطط (بنش بريس / بنش دمبل / بنش مائل / ضغط / جهاز كتّل، سكوات / ليج بريس / رومانيان / لونجز…).
- غيّر ترتيب التمارين وأسلوب التنفيذ (دمبل مقابل بار مقابل جهاز مقابل وزن الجسم) بين خطة وأخرى.
- إذا توفرت قائمة "تمارين استُخدمت سابقاً" في التعليمات فاختر بدائل مختلفة عنها قدر الإمكان مع الحفاظ على نفس الوظيفة العضلية.

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
    // Owner directive #2: keep up to TWO structured whole-meal alternatives,
    // normalizing each alternative's totals exactly like top-level meals.
    const meal_alternatives = Array.isArray(m.meal_alternatives)
      ? m.meal_alternatives.slice(0, 2).map((alt: any) => {
          const altItems = Array.isArray(alt?.items)
            ? alt.items.slice(0, 12).map((it: any) => ({
                food: String(it?.food ?? ""),
                amount: String(it?.amount ?? ""),
                calories: typeof it?.calories === "number" ? it.calories : 0,
              }))
            : [];
          return {
            name: String(alt?.name || "بديل"),
            items: altItems,
            total_calories:
              typeof alt?.total_calories === "number"
                ? alt.total_calories
                : altItems.reduce((s: number, i: any) => s + (i.calories || 0), 0),
          };
        })
      : undefined;
    return {
      name: m.name || "وجبة",
      time: m.time,
      items,
      total_calories,
      total_protein_g,
      notes: m.notes,
      ...(meal_alternatives && meal_alternatives.length > 0
        ? { meal_alternatives }
        : {}),
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

  const prompt = `أنت مساعد ذكي في منصة Musclehubeg. مهمتك: تحويل نص خطة ${planType === "nutrition" ? "تغذية" : "تمارين"} حر (مكتوبة يدوياً أو منسوخة من PDF) إلى JSON منظم قابل للتعديل.

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
        tag: "plan:json-normalize",
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

/* ─────────────────────────────────────────────────────────────────────────
 * OWNER DIRECTIVE #2 (2026-08-27) — Safe exercise substitution.
 *
 * SAFETY MODEL: the AI never invents a substitute from thin air. The
 * candidate pool is filtered DETERMINISTICALLY from our own 868-exercise
 * library (same muscle category, allowed equipment, safe level, injury
 * blacklist), and the AI may ONLY rank/narrate within that vetted list.
 * If the AI call fails entirely, the first vetted candidate is returned
 * deterministically — the job NEVER fails open into an unsafe exercise.
 * ──────────────────────────────────────────────────────────────────────── */

export type SubstituteExerciseInput = {
  /** Current exercise row from the plan (name + optional sets/reps/rest). */
  exercise: {
    name: string;
    sets?: number;
    reps?: string;
    rest?: string;
    focus?: string; // day focus text, e.g. "صدر وترايسبس"
  };
  /** Why we're swapping — drives both filters and the AI explanation. */
  reason?: string;
  /** gym | home | … — home restricts equipment to bodyweight/dumbbell/band. */
  location?: string;
  clientContext?: ClientContext;
};

export type SubstituteExerciseResult = {
  replacement: {
    name: string;
    nameAr: string;
    sets: number;
    reps: string;
    rest: string;
    notes: string;
    exerciseSlug: string;
    image?: string;
  };
  alternatives: Array<{
    name: string;
    why: string;
    sets: number;
    reps: string;
    rest: string;
  }>;
  libraryMatched: boolean;
  source: string;
};

/** Keyword-driven safety blacklist on reason text. */
function injuryBlacklist(reason: string): Array<{ test: RegExp; slugs: RegExp[] }> {
  const r = reason.toLowerCase();
  const rules: Array<{ test: RegExp; slugs: RegExp[] }> = [];
  if (/knee|ركبة|رباط صليبي|acl/.test(r))
    rules.push({ test: /./, slugs: [/squat(?!.*box)/, /lunge/, /jump/, /plyo/, /leg-?press(?!.*machine-light)/, /step-?up/] });
  if (/shoulder|كتف|rotator/.test(r))
    rules.push({ test: /./, slugs: [/overhead[- ]?press/, /dip/, /behind[- ]?neck/, /upright[- ]?row/, /military/ ] });
  if (/\bback\b|ظهر| lumbar|قرص|slipped|hernia/.test(r))
    rules.push({ test: /./, slugs: [/deadlift/, /good[- ]?morning/, /bent[- ]?over[- ]?row/ , /squat/] });
  if (/wrist|رسغ|معصم|elbow|كوع|مرفق|tennis/.test(r))
    rules.push({ test: /./, slugs: [/push[- ]?up/, /bench[- ]?press/, /dip/ , /diamond/] });
  if (/ankle|كاحل/.test(r))
    rules.push({ test: /./, slugs: [/jump/, /plyo/, /rope/, /run/, /burpee/] });
  return rules;
}

function buildCandidatePool(input: SubstituteExerciseInput): any[] {
  const { exercise, reason = "", location = "" } = input;

  // 1. Resolve the current exercise in the library → inherit its category.
  const current = findExerciseInLibrary(exercise.name);
  let category: string | null =
    current?.category ??
    (() => {
      const focus = `${exercise.focus || ""} ${exercise.name}`.toLowerCase();
      if (/صدر|chest|pec/.test(focus)) return "chest";
      if (/ظهر|back|lat|وجهة/.test(focus)) return "back";
      if (/كتف|shoulder|delt/.test(focus)) return "shoulders";
      if (/رجل|رجلين|أرجل|ساق|leg|quad|glute/.test(focus)) return "legs";
      if (/بايسبس|bicep/.test(focus)) return "biceps";
      if (/ترايسبس|tricep/.test(focus)) return "triceps";
      if (/بطن|كور|core|crunch|plank|abs/.test(focus)) return "core";
      if (/كارديو|cardio|هوائي/.test(focus)) return "cardio";
      return null;
    })();
  if (!category) category = "legs"; // extremely defensive default

  // 2. Equipment whitelist by training location.
  const isHome = /home|منزل|بيت/.test(location.toLowerCase());
  const okEquipment: string[] = isHome
    ? ["bodyweight", "dumbbell", "band", "none", "kettlebell"]
    : ["barbell", "dumbbell", "bodyweight", "cable", "machine", "kettlebell", "band", "none"];

  // 3. Beginner clients stay at beginner/intermediate difficulty.
  const experience = String(input.clientContext?.fitness?.experience || "").toLowerCase();
  const isBeginner = /beginner|مبتدئ/.test(experience);

  // 4. Injury blacklist.
  const blacklistedSlugs = injuryBlacklist(reason);
  const isBlacklisted = (e: any): boolean =>
    blacklistedSlugs.some((rule) =>
      rule.slugs.some((slugRe) => slugRe.test(String(e.slug || "").toLowerCase())),
    );

  const candidates = EXERCISES.filter(
    (e) =>
      e.category === category &&
      okEquipment.includes(e.equipment) &&
      !isBlacklisted(e) &&
      (!isBeginner || e.level !== "advanced") &&
      e.nameEn.toLowerCase() !== String(exercise.name).toLowerCase().trim(),
  );

  // Diversify equipment picks then cap the AI-facing list.
  const picked: any[] = [];
  for (const lvl of ["beginner", "intermediate", "advanced"]) {
    for (const eq of okEquipment) {
      const hit = candidates.find((c) => c.level === lvl && c.equipment === eq && !picked.includes(c));
      if (hit) picked.push(hit);
      if (picked.length >= 10) break;
    }
    if (picked.length >= 10) break;
  }
  const base = picked.length > 0 ? picked : candidates.slice(0, 8);
  // PHASE 62 VARIETY: shuffle the final ordering. The old deterministic
  // level×equipment loop always presented the SAME first candidates, and
  // the model (temp 0.4) re-picked the same #1 every time.
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base;
}

export async function substituteExercise(
  input: SubstituteExerciseInput,
): Promise<SubstituteExerciseResult> {
  const pool = buildCandidatePool(input);
  const current = findExerciseInLibrary(input.exercise.name);
  const fallbackSets = input.exercise.sets ?? 3;
  const fallbackReps = input.exercise.reps || "10-12";
  const fallbackRest = input.exercise.rest || "90 ثانية";

  const fmtSets = (n: any, dflt: number) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.round(Number(n)) : dflt);
  const sRep = (v: any) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : "");
  const sTxt = (v: any, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");

  type SubstituteAlt = SubstituteExerciseResult["alternatives"][number];

  const shapeOne = (c: any, overrides?: Partial<SubstituteExerciseResult["replacement"]>) => ({
    name: c?.nameEn || input.exercise.name,
    nameAr: c?.nameAr || "",
    sets: fmtSets(overrides?.sets ?? fallbackSets, fallbackSets),
    reps: sRep(overrides?.reps) || fallbackReps,
    rest: sRep(overrides?.rest) || fallbackRest,
    notes: sTxt(overrides?.notes) ||
      `بديل آمن لـ ${input.exercise.name}${input.reason ? ` (${input.reason})` : ""}`,
    exerciseSlug: c?.slug || "",
  });

  // Deterministic safety net — always available.
  const deterministic = () => {
    if (pool.length === 0) throw new Error("لا يوجد بديل آمن مطابق في مكتبة التمارين.");
    // PHASE 62 VARIETY: random pick instead of always pool[0] — repeated
    // swaps on the same exercise now surface different safe options.
    const best = pool[Math.floor(Math.random() * pool.length)];
    const alts = pool
      .filter((c) => c !== best)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((c) => ({
        name: c.nameEn,
        why: `نفس العضلة المستهدفة (${CATEGORY_LABELS[c.category]?.ar || c.category}) ومستوى مناسب`,
        sets: fallbackSets,
        reps: fallbackReps,
        rest: fallbackRest,
      }));
    return {
      replacement: shapeOne(best),
      alternatives: alts,
      libraryMatched: true,
      source: "library-deterministic",
    } as SubstituteExerciseResult;
  };

  // No usable pool → deterministic path or hard error.
  if (pool.length < 2) {
    if (pool.length === 1) {
      return {
        replacement: shapeOne(pool[0]),
        alternatives: [],
        libraryMatched: true,
        source: "library-deterministic",
      };
    }
    throw new Error("لا يوجد بديل آمن مطابق في مكتبة التمارين.");
  }

  try {
    const candidateList = pool
      .map((c, i) => `${i + 1}. ${c.nameEn} (${c.nameAr}) — معدات: ${EQUIPMENT_LABELS[c.equipment]?.ar}, مستوى: ${LEVEL_LABELS[c.level]?.ar}`)
      .join("\n");

    const prompt = `أنت مدرب لياقة تصحيحي محترف. العميل يحتاج بديلاً للتمرين التالي.

التمرين الحالي: ${input.exercise.name}
سبب الاستبدال: ${input.reason || "التنويع"}
اليوم المستهدف: ${input.exercise.focus || ""}
${input.clientContext ? `بيانات العميل: ${JSON.stringify({ injuries: input.clientContext.fitness?.injuries, experience: input.clientContext.fitness?.experience }, null, 2)}\n` : ""}
اختر من هذه القائمة المعتمدة فقط (ممنوع ذكر أي تمرين خارجها):
${candidateList}

أعد JSON فقط:
{
 "choice_index": رقم التمرين الأنسب من القائمة (1-${pool.length}),
 "sets": 4,
 "reps": "8-12",
 "rest": "90 ثانية",
 "why_ar": "لماذا هو الأنسب بالنسبة للسبب المذكور (جملتان بالعربية)",
 "alternatives": [
   { "index": رقم آخر من القائمة, "why": "سبب قصير" },
   { "index": رقم ثالث من القائمة, "why": "سبب قصير" },
   { "index": رقم رابع مختلف تماماً من القائمة, "why": "سبب قصير" }
 ]
}`;

    const { text, model } = await callFreeAIFallbackChain(
      prompt,
      {
        tag: "plan:exercise-corrective",
        systemPrompt:
          "أنت مدرب لياقة تصحيحي. تعيد JSON صالحاً فقط وتلتزم حرفياً بقائمة التمارين المعتمدة المعطاة لك.",
        temperature: 0.4,
        maxTokens: 900,
        jsonMode: true,
        timeoutMs: 45_000,
        maxModels: 2,
      },
    );
    const parsed = parseJSON<any>(text);
    const idx = Number(parsed?.choice_index);
    if (!parsed || !Number.isInteger(idx) || idx < 1 || idx > pool.length) {
      return deterministic();
    }
    const chosen = pool[idx - 1];
    const pickAlt = (a: any): SubstituteAlt | null => {
      const i2 = Number(a?.index);
      if (!Number.isInteger(i2) || i2 < 1 || i2 > pool.length || pool[i2 - 1] === chosen) return null;
      const c = pool[i2 - 1];
      return {
        name: c.nameEn,
        why: sTxt(a?.why, 200) || `خيار معتمد من القائمة الآمنة`,
        sets: fmtSets(parsed.sets, fallbackSets),
        reps: sRep(parsed.reps) || fallbackReps,
        rest: sRep(parsed.rest) || fallbackRest,
      };
    };
    const alts: SubstituteAlt[] = (Array.isArray(parsed.alternatives) ? parsed.alternatives : [])
      .map(pickAlt)
      .filter(Boolean)
      .slice(0, 3);
    while (alts.length < 3) {
      const extra = pool.find((c) => c !== chosen && !alts.some((a) => a.name === c.nameEn));
      if (!extra) break;
      alts.push({
        name: extra.nameEn,
        why: `داخل القائمة الآمنة (فلاتر الإصابة والمعدات)`,
        sets: fmtSets(parsed.sets, fallbackSets),
        reps: sRep(parsed.reps) || fallbackReps,
        rest: sRep(parsed.rest) || fallbackRest,
      });
    }

    return {
      replacement: shapeOne(chosen, { notes: sTxt(parsed?.why_ar, 300) }),
      alternatives: alts,
      libraryMatched: Boolean(current),
      source: `ai-ranked:${model}`,
    };
  } catch (e: any) {
    console.error("[substitute-exercise] AI ranking failed, deterministic path:", e?.message);
    return deterministic();
  }
}

/* ───────────────── Phase 78 — EXTERNAL PLAN PARTIAL REGEN (owner) ─────────────────
 * Owner request: «اعادة توليد للخطة وكذلك اعادة توليد وجبة واحده او صنف واحد،
 *  كذلك لخطط التمرين» — the admin external-plans console can now regenerate:
 *   - the whole plan (same stored brief → generateXPlanAI, variety seed re-rolls)
 *   - ONE meal (regenerateMeal — existing)
 *   - ONE food item (regenerateFoodItem — new, focused single-item prompt)
 *   - ONE workout day (regenerateWorkoutDay — new, same focus, avoid other days)
 *   - ONE exercise (substituteExercise — existing, library-ranked)
 */

/**
 * Regenerate a SINGLE food item — same calories (±15%) and same nutritional
 * role as the original, steered by the person context + avoid-list.
 * Throws on AI failure so the caller keeps the original item untouched.
 */
export async function regenerateFoodItem(
  item: { food: string; amount: string; calories: number; alternatives?: string },
  clientContext?: ClientContext,
  avoidNames: string[] = [],
  coachNote?: string,
): Promise<{ item: { food: string; amount: string; calories: number; alternatives?: string }; source: string }> {
  const targetCals = Math.max(10, Math.round(item.calories || 0));
  const avoid =
    avoidNames.filter((n) => typeof n === "string" && n.trim().length > 1).slice(0, 40);
  const ctx = clientContext ? JSON.stringify({ ...clientContext, name: undefined }, null, 2) : "";

  const prompt = `أنت أخصائي تغذية محترف. استبدل صنفًا واحدًا فقط بصنف بديل مكافئ.

الصنف الحالي: ${item.food} — الكمية: ${item.amount} — السعرات: ${targetCals} سعرة
${ctx ? `بيانات الشخص (راعِ الحساسية والأطعمة غير المحببة):\n${ctx}\n` : ""}${
    avoid.length > 0
      ? `أصناف ممنوع اقتراحها (موجودة في باقي الخطة — ممنوع التكرار):\n${avoid.join("، ")}\n`
      : ""
  }${coachNote ? `تعليمات إضافية: ${coachNote}\n` : ""}
قواعد إلزامية:
- البديل لنفس الدور الغذائي (بروتين↔بروتين، كارب↔كارب، دهون↔دهون، خضار↔خضار، فاكهة↔فاكهة، ألبان↔ألبان).
- السعرات ${Math.round(targetCals * 0.85)}–${Math.round(targetCals * 1.15)} سعرة (±15%).
- كميات واقعية بالجرام/الوحدات بنفس أسلوب «${item.amount}».
- اذكر بديل ثانٍ داخل حقل alternatives بنفس أسلوب «أو ...».
- استخدم أصناف عربية/مصرية متوفرة.

أعد JSON فقط (بدون أسوار markdown):
{ "food": "اسم الصنف البديل", "amount": "الكمية", "calories": ${targetCals}, "alternatives": "أو بديل ثانٍ بالكمية" }`;

  const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
    tag: "plan:item-regen",
    systemPrompt:
      "أنت أخصائي تغذية. تعيد JSON صالحاً فقط — صنف واحد بديل مكافئ دون أي نص إضافي.",
    temperature: 0.7,
    maxTokens: 400,
    jsonMode: true,
    timeoutMs: 30_000,
    maxModels: 3,
  });
  const parsed = parseJSON<any>(text);
  const food = String(parsed?.food ?? "").trim();
  if (!food) throw new Error("تعذّر إعادة توليد الصنف. حاول مرة أخرى.");
  const cals = Number(parsed?.calories);
  return {
    item: {
      food,
      amount: String(parsed?.amount ?? item.amount).trim() || item.amount,
      calories: Number.isFinite(cals) && cals > 0 ? Math.round(cals) : targetCals,
      alternatives: typeof parsed?.alternatives === "string" && parsed.alternatives.trim()
        ? parsed.alternatives.trim().slice(0, 200)
        : item.alternatives,
    },
    source: `${provider}:${model}`,
  };
}

/**
 * Regenerate a SINGLE workout day — same weekly slot + same focus
 * (target muscles), 4-6 exercises, avoiding every exercise used in the
 * other days of the same plan. Names are matched to the exercise library
 * (same law as normalizeWorkoutPlan) so images/slugs keep working.
 * Throws on AI failure so the caller keeps the original day untouched.
 */
export async function regenerateWorkoutDay(
  day: {
    day: string;
    focus: string;
    exercises: Array<{ name: string; sets: number; reps: string; rest: string; notes: string }>;
  },
  clientContext?: ClientContext,
  avoidNames: string[] = [],
  coachNote?: string,
): Promise<{
  day: { day: string; focus: string; isRest: false; exercises: Array<{ name: string; sets: number; reps: string; rest: string; notes: string; image?: string; exerciseSlug?: string }> };
  source: string;
}> {
  const fitness = clientContext?.fitness || {};
  const isHome = String(fitness.location || "").includes("منزل") || String(fitness.location || "").toLowerCase().includes("home");
  const currentList = (day.exercises || []).map((e) => e.name).join("، ") || "لا يوجد";
  const avoid = avoidNames.filter((n) => typeof n === "string" && n.trim().length > 1).slice(0, 60);

  const prompt = `أنت مدرب لياقة محترف في منصة Musclehubeg. أعد توليد يوم تدريبي واحد فقط.

اليوم الحالي: ${day.day} — التركيز: ${day.focus}
التمارين الحالية (لا تكررها): ${currentList}
${avoid.length > 0 ? `تمارين باقي أيام الخطة (ممنوع تكرارها في هذا اليوم):\n${avoid.join("، ")}\n` : ""}${
    clientContext
      ? `بيانات المتدرب: الهدف ${fitness.goal || "لياقة عامة"} • المستوى ${fitness.experience || "متوسط"} • المكان ${fitness.location || "جيم"}${fitness.injuries ? ` • إصابات: ${fitness.injuries}` : ""}\n`
      : ""
  }${isHome ? "⚠ المكان منزل — تمارين بوزن الجسم أو دمبل أو مقاومة فقط، بدون أجهزة جيم.\n" : ""}${coachNote ? `تعليمات إضافية: ${coachNote}\n` : ""}
قواعد إلزامية:
- نفس يوم الأسبوع «${day.day}» ونفس التركيز العضلي «${day.focus}».
- 4-6 تمارين مختلفة تماماً عن الحالية وعن باقي الأيام.
- لكل تمرين: sets (رقم)، reps، rest، و notes نصيحة قصيرة بالعربية.
- استخدم أسماء تمارين إنجليزية مطابقة لمكتبتنا (Bench Press, Squat, Lat Pulldown, Dumbbell Row…) لتظهر صورها تلقائياً.

أعد JSON فقط (بدون أسوار markdown):
{ "focus": "${day.focus}", "exercises": [ { "name": "Bench Press", "sets": 4, "reps": "6-8", "rest": "90 ثانية", "notes": "نصيحة بالعربية" } ] }`;

  const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
    tag: "plan:day-regen",
    systemPrompt:
      "أنت مدرب لياقة محترف. تعيد JSON صالحاً فقط — يوم تدريبي واحد بدون أي نص إضافي.",
    temperature: 0.7,
    maxTokens: 1200,
    jsonMode: true,
    timeoutMs: 45_000,
    maxModels: 3,
  });
  const parsed = parseJSON<any>(text);
  const exercises = Array.isArray(parsed?.exercises) ? parsed.exercises : [];
  if (exercises.length === 0) throw new Error("تعذّر إعادة توليد اليوم. حاول مرة أخرى.");

  const shaped = exercises.slice(0, 8).map((ex: any) => {
    const name = String(ex?.name ?? "");
    const matched = findExerciseInLibrary(name);
    return {
      name: matched ? matched.nameEn : name,
      sets: typeof ex?.sets === "number" ? ex.sets : parseInt(ex?.sets) || 3,
      reps: String(ex?.reps ?? "10-12"),
      rest: String(ex?.rest ?? "90 ثانية"),
      notes: String(ex?.notes ?? ""),
      image: matched ? getExerciseImageFromLibrary(matched) : undefined,
      exerciseSlug: matched ? matched.slug : undefined,
    };
  });

  return {
    day: {
      day: day.day,
      focus: String(parsed?.focus ?? day.focus).slice(0, 120) || day.focus,
      isRest: false,
      exercises: shaped,
    },
    source: `${provider}:${model}`,
  };
}
