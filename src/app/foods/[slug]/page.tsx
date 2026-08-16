"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  getFoodBySlug,
  getRelatedFoods,
  calculateNutrition,
  CATEGORY_LABELS,
  TAG_LABELS,
} from "@/lib/foods";
import { ArrowLeft, Calculator, Target } from "lucide-react";

export default function FoodDetailPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const params = useParams();
  const slug = params?.slug as string;

  const food = useMemo(() => getFoodBySlug(slug), [slug]);

  // Default grams = the food's default serving
  const [grams, setGrams] = useState<number>(food?.defaultGrams || 100);

  // Re-sync when food changes (e.g. user navigates to a different food)
  useMemo(() => {
    if (food) setGrams(food.defaultGrams);
  }, [food?.slug]);

  if (!food) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <SiteHeader variant="landing" />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isAr ? "الأكلة غير موجودة" : "Food not found"}
          </h1>
          <a
            href="/foods"
            className="mt-6 inline-block rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white"
          >
            {isAr ? "العودة للمكتبة" : "Back to library"}
          </a>
        </main>
      </div>
    );
  }

  const nutrition = calculateNutrition(food, grams);
  const related = getRelatedFoods(food);
  const categoryLabel = isAr ? CATEGORY_LABELS[food.category].ar : CATEGORY_LABELS[food.category].en;

  // Quick gram presets
  const gramPresets = [food.defaultGrams, 50, 100, 150, 200, 250].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  ).slice(0, 5).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Back link */}
        <a
          href="/foods"
          className="inline-flex items-center gap-1.5 text-sm font-normal text-[#0071e3] hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {isAr ? "كل الأكلات" : "All foods"}
        </a>

        {/* Header */}
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div className="overflow-hidden rounded-3xl bg-[#f5f5f7]">
            <div className="aspect-square w-full">
              <img
                src={food.image}
                alt={isAr ? food.imageAltAr : food.imageAltEn}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
                {CATEGORY_LABELS[food.category].emoji} {categoryLabel}
              </span>
              {food.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${TAG_LABELS[tag]?.color || "#6e6e73"}15`,
                    color: TAG_LABELS[tag]?.color || "#6e6e73",
                  }}
                >
                  {isAr ? TAG_LABELS[tag]?.ar : TAG_LABELS[tag]?.en}
                </span>
              ))}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {isAr ? food.nameAr : food.nameEn}
            </h1>
            <p className="mt-1 text-base font-normal text-[#6e6e73]" dir="ltr">
              {isAr ? food.nameEn : food.nameAr}
            </p>

            {/* Default serving */}
            <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-3">
              <p className="text-xs font-medium text-[#6e6e73]">
                {isAr ? "الحصة الافتراضية" : "Default serving"}
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {isAr ? food.defaultServingAr : food.defaultServingEn} ({food.defaultGrams}g)
              </p>
            </div>

            {/* Per 100g reference */}
            <div className="mt-4">
              <p className="text-xs font-medium text-[#6e6e73]">
                {isAr ? "القيم الغذائية لكل 100g:" : "Nutrition per 100g:"}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-[#f5f5f7] p-2 text-center">
                  <p className="text-sm font-semibold text-[#0071e3]">{food.per100g.calories}</p>
                  <p className="text-[10px] font-normal text-[#6e6e73]">{isAr ? "سعرة" : "kcal"}</p>
                </div>
                <div className="rounded-lg bg-[#f5f5f7] p-2 text-center">
                  <p className="text-sm font-semibold text-[#34c759]">{food.per100g.protein}g</p>
                  <p className="text-[10px] font-normal text-[#6e6e73]">{isAr ? "بروتين" : "Protein"}</p>
                </div>
                <div className="rounded-lg bg-[#f5f5f7] p-2 text-center">
                  <p className="text-sm font-semibold text-[#ff9500]">{food.per100g.carbs}g</p>
                  <p className="text-[10px] font-normal text-[#6e6e73]">{isAr ? "كارب" : "Carbs"}</p>
                </div>
                <div className="rounded-lg bg-[#f5f5f7] p-2 text-center">
                  <p className="text-sm font-semibold text-[#ff3b30]">{food.per100g.fat}g</p>
                  <p className="text-[10px] font-normal text-[#6e6e73]">{isAr ? "دهون" : "Fat"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Macro Calculator */}
        <section className="mt-10 rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Calculator className="h-5 w-5 text-[#0071e3]" />
            {isAr ? "حاسبة الجرامات" : "Grams Calculator"}
          </h2>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "غيّر الجرامات وشوف السعرات والماكروز تتحدث تلقائياً."
              : "Change the grams and see calories + macros update automatically."}
          </p>

          {/* Gram input */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-[#1d1d1f]">
              {isAr ? "الجرامات" : "Grams"}
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="flex-1 accent-[#0071e3]"
              />
              <input
                type="number"
                value={grams}
                onChange={(e) => setGrams(Math.max(0, Number(e.target.value)))}
                min="0"
                className="w-24 rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#0071e3]"
              />
              <span className="text-sm font-normal text-[#6e6e73]">g</span>
            </div>

            {/* Quick presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              {gramPresets.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrams(g)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    grams === g
                      ? "bg-[#1d1d1f] text-white"
                      : "bg-white text-[#6e6e73] hover:text-[#1d1d1f]"
                  }`}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {nutrition && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              <div className="rounded-2xl bg-[#1d1d1f] p-4 text-center text-white">
                <p className="text-2xl font-semibold">{nutrition.calories}</p>
                <p className="mt-0.5 text-[10px] font-normal text-gray-400">
                  {isAr ? "سعرة حرارية" : "Calories"}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center">
                <p className="text-2xl font-semibold text-[#34c759]">{nutrition.protein}g</p>
                <p className="mt-0.5 text-[10px] font-normal text-[#6e6e73]">
                  {isAr ? "بروتين" : "Protein"}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center">
                <p className="text-2xl font-semibold text-[#ff9500]">{nutrition.carbs}g</p>
                <p className="mt-0.5 text-[10px] font-normal text-[#6e6e73]">
                  {isAr ? "كارب" : "Carbs"}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center">
                <p className="text-2xl font-semibold text-[#ff3b30]">{nutrition.fat}g</p>
                <p className="mt-0.5 text-[10px] font-normal text-[#6e6e73]">
                  {isAr ? "دهون" : "Fat"}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-white p-4 text-center sm:col-span-1">
                <p className="text-2xl font-semibold text-[#8b5cf6]">{nutrition.fiber}g</p>
                <p className="mt-0.5 text-[10px] font-normal text-[#6e6e73]">
                  {isAr ? "ألياف" : "Fiber"}
                </p>
              </div>
            </div>
          )}

          {/* Per-macro calculation */}
          <div className="mt-6 rounded-2xl bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-[#0071e3]" />
              {isAr ? "عايز توصل لماكرو معين؟" : "Want to hit a specific macro?"}
            </h3>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">
              {isAr
                ? "الجرامات اللازمة من الأكلة دي عشان توصل للهدف:"
                : "Grams of this food needed to hit the target:"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: isAr ? "30g بروتين" : "30g protein", target: 30, macro: "protein" as const },
                { label: isAr ? "50g كارب" : "50g carbs", target: 50, macro: "carbs" as const },
                { label: isAr ? "20g دهون" : "20g fat", target: 20, macro: "fat" as const },
                { label: isAr ? "300 سعرة" : "300 kcal", target: 300, macro: "calories" as const },
              ].map((item) => {
                const per100 = food.per100g[item.macro];
                const gramsNeeded = per100 > 0 ? Math.round((item.target / per100) * 100) : 0;
                return (
                  <button
                    key={item.label}
                    onClick={() => gramsNeeded > 0 && setGrams(gramsNeeded)}
                    disabled={gramsNeeded === 0 || gramsNeeded > 1000}
                    className="rounded-xl bg-[#f5f5f7] p-3 text-center transition-colors hover:bg-[#e5e5e7] disabled:opacity-50"
                  >
                    <p className="text-[10px] font-normal text-[#6e6e73]">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                      {gramsNeeded > 0 && gramsNeeded <= 1000 ? `${gramsNeeded}g` : "—"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Share buttons */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4">
          <p className="text-sm font-medium text-[#1d1d1f]">
            {isAr ? "شارك الأكلة دي" : "Share this food"}
          </p>
          <ShareButtons
            title={isAr ? `${food.nameAr} | MuscleHub` : `${food.nameEn} | MuscleHub`}
            text={isAr ? `${food.per100g.calories} سعرة و ${food.per100g.protein}g بروتين لكل 100g` : `${food.per100g.calories} cal and ${food.per100g.protein}g protein per 100g`}
          />
        </div>

        {/* CTA */}
        <div className="mt-6 rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-6 text-center">
          <p className="text-base font-normal text-[#1d1d1f]">
            {isAr
              ? "عايز خطة وجبات مخصصة بالماكروز الصح لهدفك؟"
              : "Want a personalized meal plan with the right macros for your goal?"}
          </p>
          <a
            href="/pricing"
            className="mt-3 inline-block rounded-full bg-[#0071e3] px-5 py-2 text-xs font-normal text-white hover:opacity-90"
          >
            {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
          </a>
        </div>

        {/* Related foods */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "أكلات مشابهة" : "Related foods"}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {related.map((rel) => (
                <a
                  key={rel.slug}
                  href={`/foods/${rel.slug}`}
                  className="group overflow-hidden rounded-2xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={rel.image}
                      alt={isAr ? rel.imageAltAr : rel.imageAltEn}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold">{isAr ? rel.nameAr : rel.nameEn}</p>
                    <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                      {rel.per100g.calories} kcal · {rel.per100g.protein}g protein
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
