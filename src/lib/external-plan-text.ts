/**
 * External Plan text renderer — owner request 2026-09-01:
 * «توليد الخطط لغير الاعضاء عند الادمن مطلوب تعديلها بالكامل لتصبح توليد
 *  بالذكاء الاصطناعي مع امكانية تحديد عدد الوجبات و السعرات ونوع النظام
 *  الغذائي واضافة تفاصيل (نفس نموذج توليد الخطط للعملاء) كذلك خطط التمرين»
 *
 * The admin external-plans generator now produces the SAME structured plan
 * content the member flow uses (plan-generator.ts → generateNutritionPlanAI /
 * generateWorkoutPlanAI). external_plans.content stores BOTH:
 *   { text: <rendered text>, plan: <structured>, ai: <provenance> }
 * — `text` keeps every existing verb working (GET extractText, copy,
 *   download, preview, manual PATCH edit) while `plan` preserves the rich
 *   structure for any future renderer.
 *
 * This module renders the structured content into a clean Arabic text block
 * that the admin can copy/download and send directly to the person.
 */

export type ExternalMealPlan = {
  overview: string;
  data_analysis?: Record<string, unknown>;
  daily_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  supplements?: Array<{ name: string; dose: string; timing: string; purpose: string }>;
  health_notes?: string[];
  water_target?: string;
  meals: Array<{
    name: string;
    time?: string;
    items: Array<{ food: string; amount: string; calories: number; alternatives?: string }>;
    total_calories?: number;
    total_protein_g?: number;
    notes?: string;
    meal_alternatives?: Array<{
      name: string;
      items: Array<{ food: string; amount: string; calories: number }>;
      total_calories?: number;
    }>;
  }>;
};

export type ExternalWorkoutPlan = {
  overview: string;
  weekly_volume?: string;
  progression?: string;
  days: Array<{
    day: string;
    focus: string;
    isRest?: boolean;
    exercises: Array<{ name: string; sets: number; reps: string; rest: string; notes: string }>;
  }>;
};

const LINE = "──────────────────────────────";

export function renderMealPlanText(p: ExternalMealPlan): string {
  const out: string[] = [];
  out.push(`السعرات اليومية: ${p.daily_calories || 0} سعرة`);
  const m = p.macros || { protein_g: 0, carbs_g: 0, fat_g: 0 };
  out.push(
    `الماكروز: بروتين ${m.protein_g ?? 0} جم • كارب ${m.carbs_g ?? 0} جم • دهون ${m.fat_g ?? 0} جم`,
  );
  if (p.water_target) out.push(`الماء: ${p.water_target}`);
  if (p.overview) {
    out.push("", LINE, "نظرة عامة", LINE, p.overview);
  }

  for (const meal of p.meals || []) {
    out.push("", LINE, `${meal.name}${meal.time ? ` (${meal.time})` : ""}`);
    for (const it of meal.items || []) {
      out.push(`• ${it.food} — ${it.amount} — ${it.calories} سعرة`);
      if (it.alternatives) out.push(`  بديل: ${it.alternatives}`);
    }
    if (typeof meal.total_calories === "number") {
      out.push(
        `= إجمالي الوجبة: ${meal.total_calories} سعرة${
          meal.total_protein_g ? ` • بروتين ${meal.total_protein_g} جم` : ""
        }`,
      );
    }
    if (meal.notes) out.push(`ملاحظة: ${meal.notes}`);
    for (const alt of meal.meal_alternatives || []) {
      out.push(`↺ بديل كامل — ${alt.name}:`);
      for (const it of alt.items || []) {
        out.push(`   • ${it.food} — ${it.amount} — ${it.calories} سعرة`);
      }
      if (typeof alt.total_calories === "number") {
        out.push(`   = ${alt.total_calories} سعرة`);
      }
    }
  }

  if (p.supplements && p.supplements.length > 0) {
    out.push("", LINE, "المكملات المقترحة", LINE);
    for (const s of p.supplements) {
      out.push(`• ${s.name} — ${s.dose} — ${s.timing}${s.purpose ? ` — ${s.purpose}` : ""}`);
    }
  }
  if (p.health_notes && p.health_notes.length > 0) {
    out.push("", LINE, "توصيات صحية", LINE);
    for (const h of p.health_notes) out.push(`• ${h}`);
  }
  return out.join("\n");
}

export function renderWorkoutPlanText(p: ExternalWorkoutPlan): string {
  const out: string[] = [];
  if (p.overview) out.push("نظرة عامة", LINE, p.overview, "");
  if (p.weekly_volume) out.push(`الحجم التدريبي الأسبوعي: ${p.weekly_volume}`);
  if (p.progression) out.push(`التقدم الأسبوعي: ${p.progression}`);

  for (const day of p.days || []) {
    if (day.isRest) {
      out.push("", LINE, `${day.day} — راحة${day.focus ? ` (${day.focus})` : ""}`);
      continue;
    }
    out.push("", LINE, `${day.day} — ${day.focus}`);
    for (const ex of day.exercises || []) {
      out.push(`• ${ex.name}: ${ex.sets} مجموعات × ${ex.reps} — راحة ${ex.rest}`);
      if (ex.notes) out.push(`  ${ex.notes}`);
    }
  }
  return out.join("\n");
}
