import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser, authRequired } from "@/lib/auth-server";
import { getLimits, type MembershipTier } from "@/lib/memberships";

/**
 * POST /api/tools/save-meal-plan
 *
 * Saves a meal plan from the Meal Planner tool.
 * Enforces membership limits:
 *   Free: 1 plan, Premium: 10, Pro: 50, Coaching: 10
 * Staff (coach/admin) are UNLIMITED — owner decree 2026-09-01:
 * «الادمن بلا حدود في كل وظائف الموقع».
 *
 * Body:
 *   {
 *     title?: string,
 *     plan_data: {
 *       meals: Array<{
 *         name: string,
 *         items: Array<{
 *           name: string,
 *           source: "local" | "openfoodfacts",
 *           grams: number,
 *           per100g: { calories, protein, carbs, fat }
 *         }>
 *       }>
 *     }
 *   }
 */
export async function POST(request: NextRequest) {
  if (!authRequired) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => ({}));
  const { title, plan_data } = body;

  if (!plan_data || !Array.isArray(plan_data.meals)) {
    return NextResponse.json(
      { error: "Missing plan_data.meals" },
      { status: 400 },
    );
  }

  // Validate structure + cap meal count by tier
  const tier: MembershipTier = auth.membership_tier;
  const limits = getLimits(tier);
  const maxMeals = limits.mealPlannerMaxMeals;
  const maxSaved = limits.mealPlannerMaxSaved;
  // Phase 71 — staff bypass: admins/coaches never hit the caps.
  const unlimited = auth.is_staff === true;

  if (!unlimited && maxMeals !== null && plan_data.meals.length > maxMeals) {
    return NextResponse.json(
      {
        error: "Too many meals",
        limit: maxMeals,
        current: plan_data.meals.length,
        message: `Your ${tier} plan allows up to ${maxMeals} meals per plan.`,
      },
      { status: 403 },
    );
  }

  // Compute totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  for (const meal of plan_data.meals) {
    if (!Array.isArray(meal.items)) continue;
    for (const item of meal.items) {
      const g = Number(item.grams) || 0;
      const factor = g / 100;
      totalCalories += Math.round((item.per100g?.calories || 0) * factor);
      totalProtein  += Math.round((item.per100g?.protein  || 0) * factor);
      totalCarbs    += Math.round((item.per100g?.carbs    || 0) * factor);
      totalFat      += Math.round((item.per100g?.fat      || 0) * factor);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Count current plans for this user
  const { count } = await supabase
    .from("meal_plans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.id);

  if (!unlimited && maxSaved !== null && (count || 0) >= maxSaved) {
    return NextResponse.json(
      {
        error: "Limit reached",
        limit: maxSaved,
        current: count,
        message: `You've reached your limit of ${maxSaved} saved meal plans. Upgrade your membership for more.`,
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: auth.id,
      title: title || null,
      plan_data,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      meal_count: plan_data.meals.length,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[api/tools/save-meal-plan] Insert failed:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data?.id,
    created_at: data?.created_at,
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    },
    remaining: !unlimited && maxSaved !== null ? maxSaved - ((count || 0) + 1) : null,
  });
}
