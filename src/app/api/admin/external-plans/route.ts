import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  generateNutritionPlanAI,
  generateWorkoutPlanAI,
  regenerateMeal,
  regenerateFoodItem,
  regenerateWorkoutDay,
  substituteExercise,
} from "@/lib/plan-generator";
import {
  renderMealPlanText,
  renderWorkoutPlanText,
  type ExternalMealPlan,
  type ExternalWorkoutPlan,
} from "@/lib/external-plan-text";

/**
 * ADMIN EXTERNAL PLANS — Phase 71 (owner request 2026-09-01):
 * «ضيف فى داشبورد الادمن طريقى توليد خطط تدريب وتغذية خارج الاعضاء
 *  مع كتابة التفاصيل يدوى»
 *
 * Phase 78 (owner request 2026-09-01):
 * «توليد الخطط لغير الاعضاء عند الادمن مطلوب تعديلها بالكامل لتصبح توليد
 *  بالذكاء الاصطناعي مع امكانية تحديد عدد الوجبات و السعرات ونوع النظام
 *  الغذائي واضافة تفاصيل (نفس نموذج توليد الخطط للعملاء) كذلك خطط التمرين»
 *
 * → POST with ai:true now runs the SAME server engine members use
 *   (plan-generator.ts → generateNutritionPlanAI / generateWorkoutPlanAI,
 *   OpenRouter+Groq chain with local fallback). The admin fills a small
 *   client-style brief:
 *     meal    → meals_count / calories / diet_type / details (+ optional
 *               person data weight-height-age-gender for BMR/TDEE math)
 *     workout → days_per_week / goal / level / location / details
 *   The structured result is stored in content.plan, rendered to Arabic
 *   text in content.text — copy/download/preview/edit keep working.
 *
 * Manual training/nutrition plans for people who are NOT members.
 * Every verb is admin-only (requireAdmin) and hits the DB through the
 * service-role client; the external_plans RLS (0058) is the second
 * layer of defense — is_admin() only.
 *
 * UNLIMITED: no caps, no quotas (owner decree «الادمن بلا حدود»). The AI
 * engine here is the SAME one members get — no separate quota consumed
 * because external plans are not tied to any client profile.
 *
 * GET    /api/admin/external-plans?type=workout|meal|all&q=<search>
 *        &status=draft|final|all&offset=0&limit=50
 * POST   (ai generation)
 *        { ai: true, person_name, person_contact?, plan_type, title?,
 *          status?,
 *          meal:    { meals_count, calories?, diet_type, details?,
 *                     person_data?: { weight?, height?, age?, gender? } },
 *          workout: { days_per_week, goal, level, location?, details? } }
 * POST   (regeneration actions — owner Phase 78 «اعادة توليد»)
 *        { action: "regenerate_plan", id } — same stored brief, fresh roll
 *        { action: "regenerate_meal", id, meal_index }
 *        { action: "regenerate_item", id, meal_index, item_index }
 *        { action: "regenerate_day", id, day_index }
 *        { action: "regenerate_exercise", id, day_index, exercise_index }
 *        Phase 79 (owner «للادمن حفظ للخطط المولدة»): EVERY regeneration
 *        action first snapshots the previous version into content.history
 *        (last 5) and { action: "restore_version", id, version_index }
 *        brings any saved version back — nothing generated is ever lost.
 *        (legacy manual) { person_name, ..., text, notes? }
 * PATCH  { id, person_name?, person_contact?, plan_type?, title?, text?,
 *          notes?, status? }
 * DELETE /api/admin/external-plans?id=<uuid>
 */

export const maxDuration = 60; // AI chain self-clamps ≤ 52s (see plan-generator.ts)

const MAX_TEXT = 100_000;
const MAX_SHORT = 200;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: "bad_request", message }, { status });
}

function extractText(content: unknown): string {
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text: unknown }).text ?? "");
  }
  return "";
}

/* ─────────────────── AI GENERATION (Phase 78, owner) ─────────────────── */

function numOr(v: unknown, def: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : def;
}

/** Diet-type label the admin picks from → calories goal for BMR/TDEE math. */
function dietGoalHint(dietType: string): string {
  const d = dietType.toLowerCase();
  if (/تنشيف|خسارة|دهون|تنحيف|fat|loss/.test(d)) return "fat loss";
  if (/تضخيم|بناء|عضلات|mass|gain|bulk/.test(d)) return "muscle gain";
  return "general fitness";
}

/**
 * AI generation — SAME engine as member/client plans
 * (plan-generator.ts → generateNutritionPlanAI / generateWorkoutPlanAI).
 */
async function generateExternalPlanAI(
  body: Record<string, unknown>,
): Promise<
  | { ok: true; title: string; text: string; structured: ExternalMealPlan | ExternalWorkoutPlan; source: string }
  | { ok: false; message: string }
> {
  const planType = String(body.plan_type ?? "").trim();
  if (planType !== "workout" && planType !== "meal") {
    return { ok: false, message: "نوع الخطة لازم يكون workout أو meal" };
  }

  const details = String(body.details ?? "").trim().slice(0, 4000);
  const personName = String(body.person_name ?? "").trim() || "الشخص";

  if (planType === "meal") {
    const mealCfg = (body.meal && typeof body.meal === "object"
      ? body.meal
      : {}) as Record<string, unknown>;
    const mealsCount = Math.min(6, Math.max(3, Math.round(numOr(mealCfg.meals_count, 4))));
    const caloriesRaw = numOr(mealCfg.calories, 0);
    const calories =
      caloriesRaw > 0 ? Math.min(6000, Math.max(800, Math.round(caloriesRaw))) : 0;
    const dietType =
      String(mealCfg.diet_type ?? "متوازن").trim().slice(0, 120) || "متوازن";
    const pd = (mealCfg.person_data && typeof mealCfg.person_data === "object"
      ? mealCfg.person_data
      : {}) as Record<string, unknown>;

    const ctx = {
      name: personName,
      nutrition: {
        weight: pd.weight ? numOr(pd.weight, 80) : undefined,
        height: pd.height ? numOr(pd.height, 175) : undefined,
        age: pd.age ? numOr(pd.age, 25) : undefined,
        gender: String(pd.gender ?? "male").trim() || "male",
        meals: String(mealsCount),
        diet: dietType,
        notes: details || undefined,
      },
      fitness: { goal: dietGoalHint(dietType) },
      recent_plan_names: [],
    };

    const res = await generateNutritionPlanAI(ctx as never, {
      targetCalories: calories > 0 ? calories : undefined,
      mealsCount,
      notes: details || undefined,
    });
    const structured = res.content as ExternalMealPlan;
    return {
      ok: true,
      title: res.title,
      text: renderMealPlanText(structured),
      structured,
      source: res.source,
    };
  }

  // workout
  const woCfg = (body.workout && typeof body.workout === "object"
    ? body.workout
    : {}) as Record<string, unknown>;
  const daysPerWeek = Math.min(6, Math.max(2, Math.round(numOr(woCfg.days_per_week, 4))));
  const goal = String(woCfg.goal ?? "لياقة عامة").trim().slice(0, 120) || "لياقة عامة";
  const level = String(woCfg.level ?? "متوسط").trim().slice(0, 60) || "متوسط";
  const location = String(woCfg.location ?? "جيم").trim().slice(0, 60) || "جيم";

  const ctx = {
    name: personName,
    nutrition: {},
    fitness: {
      goal,
      days: String(daysPerWeek),
      experience: level,
      location,
      notes: details || undefined,
    },
    recent_plan_names: [],
  };

  const res = await generateWorkoutPlanAI(ctx as never, {
    notes: details || undefined,
  });
  const structured = res.content as ExternalWorkoutPlan;
  return {
    ok: true,
    title: res.title,
    text: renderWorkoutPlanText(structured),
    structured,
    source: res.source,
  };
}

export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const status = searchParams.get("status") || "all";
  const q = (searchParams.get("q") || "").trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100), 500);

  let query = supabaseAdmin
    .from("external_plans")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type === "workout" || type === "meal") {
    query = query.eq("plan_type", type);
  }
  if (status === "draft" || status === "final") {
    query = query.eq("status", status);
  }
  if (q) {
    // Search by person name OR title (case-insensitive)
    query = query.or(`person_name.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[api/admin/external-plans] GET failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plans = (data || []).map((row) => {
    const r = row as Record<string, unknown>;
    const content =
      r.content && typeof r.content === "object"
        ? (r.content as Record<string, unknown>)
        : null;
    // Phase 79: history SUMMARIES only (at + action) — the full snapshot
    // lives server-side and restore_version reads it from the DB, so the
    // list response stays lean even with 5 versions per plan.
    const hist = Array.isArray(content?.history)
      ? (content.history as Array<Record<string, unknown>>)
      : [];
    return {
      ...r,
      text: extractText(r.content),
      // Phase 78: structured plan + AI provenance for per-element regen UI
      plan: content?.plan ?? null,
      ai: content?.ai ?? null,
      history: hist.map((h) => ({ at: String(h?.at ?? ""), action: String(h?.action ?? "") })),
    };
  });

  return NextResponse.json({
    plans,
    total: count ?? 0,
    offset,
    limit,
    // Owner decree: this tool has NO caps
    unlimited: true,
  });
}

/* ───────────── Partial regeneration actions (owner Phase 78) ───────────── */

function mealCtxFromParams(params: Record<string, unknown>): Record<string, unknown> {
  const mealCfg = (params.meal && typeof params.meal === "object"
    ? params.meal
    : {}) as Record<string, unknown>;
  const pd = (mealCfg.person_data && typeof mealCfg.person_data === "object"
    ? mealCfg.person_data
    : {}) as Record<string, unknown>;
  return {
    name: String(params.person_name ?? "").trim() || "الشخص",
    nutrition: {
      weight: pd.weight ? numOr(pd.weight, 80) : undefined,
      height: pd.height ? numOr(pd.height, 175) : undefined,
      age: pd.age ? numOr(pd.age, 25) : undefined,
      gender: String(pd.gender ?? "male") || "male",
      diet: String(mealCfg.diet_type ?? "متوازن") || "متوازن",
    },
    fitness: { goal: dietGoalHint(String(mealCfg.diet_type ?? "")) },
    recent_plan_names: [],
  };
}

function workoutCtxFromParams(params: Record<string, unknown>): Record<string, unknown> {
  const woCfg = (params.workout && typeof params.workout === "object"
    ? params.workout
    : {}) as Record<string, unknown>;
  const details = String(params.details ?? "").trim();
  return {
    name: String(params.person_name ?? "").trim() || "الشخص",
    nutrition: {},
    fitness: {
      goal: String(woCfg.goal ?? "لياقة عامة") || "لياقة عامة",
      days: String(woCfg.days_per_week ?? 4),
      experience: String(woCfg.level ?? "متوسط") || "متوسط",
      location: String(woCfg.location ?? "جيم") || "جيم",
      ...(details ? { injuries: details } : {}),
    },
    recent_plan_names: [],
  };
}

async function handleRegenerationAction(
  action: string,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const id = String(body.id ?? "").trim();
  if (!id) return bad("id مطلوب");

  const { data: row, error: fetchErr } = await supabaseAdmin!
    .from("external_plans")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !row) return bad("الخطة غير موجودة", 404);

  const r = row as Record<string, unknown>;
  const content = (r.content && typeof r.content === "object"
    ? r.content
    : {}) as Record<string, unknown>;
  const structured = content.plan as ExternalMealPlan | ExternalWorkoutPlan | undefined;
  const aiMeta = (content.ai && typeof content.ai === "object"
    ? content.ai
    : {}) as Record<string, unknown>;
  const params = (aiMeta.params && typeof aiMeta.params === "object"
    ? aiMeta.params
    : {}) as Record<string, unknown>;
  const planType = String(r.plan_type ?? "");
  const details = String(params.details ?? "").trim();

  /* ── VERSION HISTORY LAW (Phase 79, owner «للادمن حفظ للخطط المولدة») ──
   * Every regeneration action FIRST snapshots the previous version (text +
   * structured plan) into content.history — capped at the last 5 — so a
   * regenerate can never destroy a generated plan irreversibly, and any
   * saved version can be brought back with action=restore_version. */
  const HISTORY_CAP = 5;
  type HistoryEntry = { at: string; action: string; text: string; plan: unknown };
  const prevHistory: HistoryEntry[] = Array.isArray(content.history)
    ? (content.history as HistoryEntry[]).filter(
        (h) => h && typeof h === "object" && typeof h.at === "string",
      )
    : [];
  const snapshot = (label: string): HistoryEntry[] =>
    [
      ...prevHistory,
      {
        at: new Date().toISOString(),
        action: label,
        text: typeof content.text === "string" ? content.text : "",
        plan: content.plan ?? null,
      },
    ].slice(-HISTORY_CAP);

  const save = async (
    newContent: Record<string, unknown>,
    opts?: { history?: HistoryEntry[] },
  ) => {
    const payload = { ...newContent, history: opts?.history ?? snapshot(action) };
    const { data, error } = await supabaseAdmin!
      .from("external_plans")
      .update({
        content: payload as unknown as Database["public"]["Tables"]["external_plans"]["Update"]["content"],
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error(`[api/admin/external-plans] ${action} failed:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const updated = data as Record<string, unknown>;
    const c = updated.content as Record<string, unknown> | null;
    return NextResponse.json({
      ok: true,
      plan: { ...updated, text: extractText(updated.content) },
      ai: c?.ai ?? null,
    });
  };

  const metaPatch = (extra: Record<string, unknown>) => ({
    ...aiMeta,
    ...extra,
    last_action: action,
    last_at: new Date().toISOString(),
  });

  /* 0) Restore a saved version — Phase 79 «حفظ للخطط المولدة» */
  if (action === "restore_version") {
    if (prevHistory.length === 0) {
      return bad("مفيش نسخ محفوظة للخطة دي — إعادة التوليد هي اللي بتحفظ نسخ تلقائياً");
    }
    const idx = Math.round(numOr(body.version_index, -1));
    const version = prevHistory[idx];
    if (!version) return bad("رقم النسخة غير صالح");
    // The CURRENT state goes into history first — restore is reversible.
    const nextHistory: HistoryEntry[] = [
      ...prevHistory.filter((_, i) => i !== idx),
      {
        at: new Date().toISOString(),
        action: "restore_backup",
        text: typeof content.text === "string" ? content.text : "",
        plan: content.plan ?? null,
      },
    ].slice(-HISTORY_CAP);
    if (!version.text && !version.plan) return bad("النسخة المحفوظة فاضية — مش قادر أسترجعها");
    return save(
      {
        text: String(version.text ?? ""),
        ...(version.plan ? { plan: version.plan } : {}),
        ai: metaPatch({ last_source: "restore" }),
      },
      { history: nextHistory },
    );
  }

  /* 1) Whole plan — same stored brief, fresh variety roll */
  if (action === "regenerate_plan") {
    if (!params || Object.keys(params).length === 0) {
      return bad("مفيش مواصفات توليد محفوظة للخطة دي — اعمل خطة جديدة بالذكاء الاصطناعي");
    }
    const gen = await generateExternalPlanAI(params);
    if (!gen.ok) return bad(gen.message, 502);
    return save({
      text: gen.text,
      plan: gen.structured,
      ai: metaPatch({
        source: gen.source,
        generated_at: new Date().toISOString(),
        regenerations: Number(aiMeta.regenerations ?? 0) + 1,
      }),
    });
  }

  /* 2) ONE meal — regenerateMeal with other meals' foods as avoid-list */
  if (action === "regenerate_meal") {
    if (planType !== "meal" || !structured || !Array.isArray((structured as ExternalMealPlan).meals)) {
      return bad("الخطة دي مش خطة تغذية مولدة بالذكاء الاصطناعي");
    }
    const mp = structured as ExternalMealPlan;
    const mealIndex = Math.round(numOr(body.meal_index, -1));
    const meal = mp.meals[mealIndex];
    if (!meal) return bad("رقم الوجبة غير صالح");
    const target =
      meal.total_calories ||
      Math.round((mp.daily_calories || 0) / Math.max(1, mp.meals.length));
    const avoidNames = mp.meals
      .filter((_, i) => i !== mealIndex)
      .flatMap((m) => (m.items || []).map((it) => it.food));
    try {
      const out = await regenerateMeal(
        { name: meal.name, items: meal.items, notes: meal.notes },
        target,
        mealCtxFromParams(params) as never,
        details || undefined,
        avoidNames,
      );
      const items = (out.meal.items || []).map((it: Record<string, unknown>) => ({
        food: String(it?.food ?? ""),
        amount: String(it?.amount ?? ""),
        calories: typeof it?.calories === "number" ? it.calories : 0,
        protein_g: it?.protein_g,
        alternatives: it?.alternatives,
      }));
      const mealAlternatives = (out.suggestions || [])
        .slice(0, 2)
        .map((s: Record<string, unknown>) => {
          const altItems = (Array.isArray(s?.items) ? s.items : []).slice(0, 12)
            .map((it: Record<string, unknown>) => ({
              food: String(it?.food ?? ""),
              amount: String(it?.amount ?? ""),
              calories: typeof it?.calories === "number" ? it.calories : 0,
            }));
          return {
            name: String(s?.name ?? "بديل"),
            items: altItems,
            total_calories:
              typeof s?.total_calories === "number"
                ? s.total_calories
                : altItems.reduce((sum, it) => sum + it.calories, 0),
          };
        })
        .filter((alt) => alt.items.length > 0);
      const newMeal = {
        name: String(out.meal.name ?? meal.name),
        time: ((out.meal as Record<string, unknown>).time as string | undefined) ?? meal.time,
        items,
        total_calories: items.reduce((sum, it) => sum + (it.calories || 0), 0),
        total_protein_g: items.reduce((sum, it) => sum + (Number(it.protein_g) || 0), 0),
        notes: ((out.meal as Record<string, unknown>).notes as string | undefined) ?? meal.notes,
        ...(mealAlternatives.length > 0 ? { meal_alternatives: mealAlternatives } : {}),
      };
      const newPlan: ExternalMealPlan = {
        ...mp,
        meals: mp.meals.map((m, i) => (i === mealIndex ? newMeal : m)),
      };
      return save({
        text: renderMealPlanText(newPlan),
        plan: newPlan,
        ai: metaPatch({ last_source: out.source }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل إعادة توليد الوجبة";
      return bad(msg, 502);
    }
  }

  /* 3) ONE food item — focused single-item swap, same calories ±15% */
  if (action === "regenerate_item") {
    if (planType !== "meal" || !structured || !Array.isArray((structured as ExternalMealPlan).meals)) {
      return bad("الخطة دي مش خطة تغذية مولدة بالذكاء الاصطناعي");
    }
    const mp = structured as ExternalMealPlan;
    const mealIndex = Math.round(numOr(body.meal_index, -1));
    const itemIndex = Math.round(numOr(body.item_index, -1));
    const meal = mp.meals[mealIndex];
    const item = meal?.items?.[itemIndex];
    if (!meal || !item) return bad("رقم الوجبة أو الصنف غير صالح");
    const avoidNames = mp.meals.flatMap((m, mi) =>
      (m.items || [])
        .filter((_, ii) => mi !== mealIndex || ii !== itemIndex)
        .map((it) => it.food),
    );
    try {
      const out = await regenerateFoodItem(
        item,
        mealCtxFromParams(params) as never,
        avoidNames,
        details || undefined,
      );
      const newPlan: ExternalMealPlan = {
        ...mp,
        meals: mp.meals.map((m, mi) =>
          mi !== mealIndex
            ? m
            : {
                ...m,
                items: m.items.map((it, ii) => (ii === itemIndex ? out.item : it)),
              },
        ),
      };
      return save({
        text: renderMealPlanText(newPlan),
        plan: newPlan,
        ai: metaPatch({ last_source: out.source }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل إعادة توليد الصنف";
      return bad(msg, 502);
    }
  }

  /* 4) ONE workout day — same focus, avoid other days' exercises */
  if (action === "regenerate_day") {
    if (planType !== "workout" || !structured || !Array.isArray((structured as ExternalWorkoutPlan).days)) {
      return bad("الخطة دي مش خطة تمارين مولدة بالذكاء الاصطناعي");
    }
    const wp = structured as ExternalWorkoutPlan;
    const dayIndex = Math.round(numOr(body.day_index, -1));
    const day = wp.days[dayIndex];
    if (!day || day.isRest) return bad("رقم اليوم غير صالح");
    const avoidNames = wp.days
      .filter((_, i) => i !== dayIndex)
      .flatMap((d) => (d.exercises || []).map((ex) => ex.name));
    try {
      const out = await regenerateWorkoutDay(
        { day: day.day, focus: day.focus, exercises: day.exercises },
        workoutCtxFromParams(params) as never,
        avoidNames,
        details || undefined,
      );
      const newPlan: ExternalWorkoutPlan = {
        ...wp,
        days: wp.days.map((d, i) => (i === dayIndex ? out.day : d)),
      };
      return save({
        text: renderWorkoutPlanText(newPlan),
        plan: newPlan,
        ai: metaPatch({ last_source: out.source }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل إعادة توليد اليوم";
      return bad(msg, 502);
    }
  }

  /* 5) ONE exercise — library-ranked substitute (existing engine) */
  if (action === "regenerate_exercise") {
    if (planType !== "workout" || !structured || !Array.isArray((structured as ExternalWorkoutPlan).days)) {
      return bad("الخطة دي مش خطة تمارين مولدة بالذكاء الاصطناعي");
    }
    const wp = structured as ExternalWorkoutPlan;
    const dayIndex = Math.round(numOr(body.day_index, -1));
    const exerciseIndex = Math.round(numOr(body.exercise_index, -1));
    const day = wp.days[dayIndex];
    const exercise = day?.exercises?.[exerciseIndex];
    if (!day || !exercise) return bad("رقم اليوم أو التمرين غير صالح");
    try {
      const woCtx = workoutCtxFromParams(params) as {
        fitness?: Record<string, unknown>;
      };
      const out = await substituteExercise({
        exercise: {
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          focus: day.focus,
        },
        reason: String(body.reason ?? "التنويع"),
        location: String(woCtx.fitness?.location ?? "جيم"),
        clientContext: woCtx as never,
      });
      const newPlan: ExternalWorkoutPlan = {
        ...wp,
        days: wp.days.map((d, di) =>
          di !== dayIndex
            ? d
            : {
                ...d,
                exercises: d.exercises.map((ex, ei) =>
                  ei === exerciseIndex
                    ? {
                        name: out.replacement.name,
                        sets: Number(out.replacement.sets) || exercise.sets,
                        reps: out.replacement.reps || exercise.reps,
                        rest: out.replacement.rest || exercise.rest,
                        notes: out.replacement.notes || exercise.notes,
                        exerciseSlug: out.replacement.exerciseSlug || undefined,
                      }
                    : ex,
                ),
              },
        ),
      };
      return save({
        text: renderWorkoutPlanText(newPlan),
        plan: newPlan,
        ai: metaPatch({ last_source: out.source }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل استبدال التمرين";
      return bad(msg, 502);
    }
  }

  return bad("action غير معروف");
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  /* ── Regeneration actions (owner Phase 78 «اعادة توليد») — dispatched
     before create validation: these operate on an EXISTING plan row. ── */
  const action = String(body.action ?? "").trim();
  if (action) {
    return await handleRegenerationAction(action, body);
  }

  const personName = String(body.person_name ?? "").trim();
  const personContact = String(body.person_contact ?? "").trim().slice(0, MAX_SHORT) || null;
  const planType = String(body.plan_type ?? "").trim();
  const status = String(body.status ?? "final").trim() === "draft" ? "draft" : "final";

  if (personName.length < 2 || personName.length > MAX_SHORT) {
    return bad("اسم الشخص مطلوب (من حرفين لحد 200 حرف)");
  }
  if (planType !== "workout" && planType !== "meal") {
    return bad("نوع الخطة لازم يكون workout أو meal");
  }

  /* ── AI GENERATION (owner Phase 78) — same engine as client plans ── */
  if (body.ai === true) {
    const gen = await generateExternalPlanAI(body);
    if (!gen.ok) return bad(gen.message);

    const customTitle = String(body.title ?? "").trim();
    const title = (customTitle.length >= 3 ? customTitle : gen.title).slice(0, MAX_SHORT);
    const notes = String(body.notes ?? "").trim().slice(0, MAX_SHORT) || null;

    const { data, error } = await supabaseAdmin
      .from("external_plans")
      .insert({
        person_name: personName,
        person_contact: personContact,
        plan_type: planType,
        title,
        notes,
        content: {
          text: gen.text,
          plan: gen.structured,
          ai: {
            source: gen.source,
            generated_at: new Date().toISOString(),
            engine: "plan-generator (same as member plans)",
            // Stored brief → powers «إعادة توليد» with the SAME inputs
            params: {
              person_name: personName,
              plan_type: planType,
              meal: body.meal ?? null,
              workout: body.workout ?? null,
              details: String(body.details ?? "").trim().slice(0, 4000) || null,
            },
          },
        } as unknown as Database["public"]["Tables"]["external_plans"]["Insert"]["content"],
        status,
        created_by: auth.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[api/admin/external-plans] AI POST failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      plan: { ...row, text: extractText(row.content) },
      ai_source: gen.source,
    });
  }

  /* ── Legacy manual path (kept for programmatic use) ── */
  const title = String(body.title ?? "").trim();
  const text = String(body.text ?? "").slice(0, MAX_TEXT).trim();
  const notes = String(body.notes ?? "").trim().slice(0, MAX_SHORT) || null;

  if (title.length < 3 || title.length > MAX_SHORT) {
    return bad("عنوان الخطة مطلوب (من 3 لحد 200 حرف)");
  }
  if (text.length < 10) {
    return bad("اكتب تفاصيل الخطة (10 أحرف على الأقل)");
  }

  const { data, error } = await supabaseAdmin
    .from("external_plans")
    .insert({
      person_name: personName,
      person_contact: personContact,
      plan_type: planType,
      title,
      notes,
      content: { text },
      status,
      created_by: auth.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[api/admin/external-plans] POST failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({ ok: true, plan: { ...row, text: extractText(row.content) } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return bad("id مطلوب");

  const update: Database["public"]["Tables"]["external_plans"]["Update"] = {};

  if (body.person_name !== undefined) {
    const v = String(body.person_name).trim();
    if (v.length < 2 || v.length > MAX_SHORT) return bad("اسم الشخص غير صالح");
    update.person_name = v;
  }
  if (body.person_contact !== undefined) {
    update.person_contact = String(body.person_contact).trim().slice(0, MAX_SHORT) || null;
  }
  if (body.plan_type !== undefined) {
    const v = String(body.plan_type).trim();
    if (v !== "workout" && v !== "meal") return bad("نوع الخطة غير صالح");
    update.plan_type = v;
  }
  if (body.title !== undefined) {
    const v = String(body.title).trim();
    if (v.length < 3 || v.length > MAX_SHORT) return bad("عنوان الخطة غير صالح");
    update.title = v;
  }
  if (body.text !== undefined) {
    const v = String(body.text).slice(0, MAX_TEXT).trim();
    if (v.length < 10) return bad("تفاصيل الخطة قصيرة جدًا");
    // Preserve the AI structured plan (content.plan + content.ai) when the
    // admin hand-edits the rendered text — only `text` is replaced.
    const { data: existing } = await supabaseAdmin
      .from("external_plans")
      .select("content")
      .eq("id", id)
      .single();
    const prevContent =
      existing && typeof existing === "object" && "content" in existing
        ? ((existing as { content: unknown }).content as Record<string, unknown> | null)
        : null;
    update.content = {
      ...(prevContent && typeof prevContent === "object" ? prevContent : {}),
      text: v,
    };
  }
  if (body.notes !== undefined) {
    update.notes = String(body.notes).trim().slice(0, MAX_SHORT) || null;
  }
  if (body.status !== undefined) {
    const v = String(body.status).trim();
    if (v !== "draft" && v !== "final") return bad("الحالة غير صالحة");
    update.status = v;
  }

  if (Object.keys(update).length === 0) {
    return bad("مفيش حاجة للتحديث");
  }

  const { data, error } = await supabaseAdmin
    .from("external_plans")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[api/admin/external-plans] PATCH failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({ ok: true, plan: { ...row, text: extractText(row.content) } });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return bad("id مطلوب");

  const { error } = await supabaseAdmin
    .from("external_plans")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[api/admin/external-plans] DELETE failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
