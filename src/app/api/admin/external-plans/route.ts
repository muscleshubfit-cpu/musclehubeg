import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  generateNutritionPlanAI,
  generateWorkoutPlanAI,
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
    return { ...r, text: extractText(r.content) };
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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

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
          plan: gen.structured as unknown as Database["public"]["Tables"]["external_plans"]["Insert"]["content"],
          ai: {
            source: gen.source,
            generated_at: new Date().toISOString(),
            engine: "plan-generator (same as member plans)",
          },
        },
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
