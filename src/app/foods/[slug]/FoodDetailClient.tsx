"use client";

import { useState, useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  calculateNutrition,
  CATEGORY_LABELS,
  TAG_LABELS,
  type Food,
} from "@/lib/foods-shared";
import { ArrowLeft, Calculator, Target } from "lucide-react";

/**
 * Client component for food detail page.
 * Receives the food (and its related foods) as props from the server
 * component (which generates metadata + JSON-LD schemas server-side).
 * BUNDLE LAW (2026-09-05): imports come from foods-shared (tiny) — the
 * full 8,830-food array is server-only; `related` is computed on the
 * server and passed as a prop so this component never needs the array.
 * Accepts an optional `lang` prop — the /ar/foods/[slug] mirror passes
 * lang="ar" to force Arabic rendering (ProgramDetailClient pattern).
 * Internal links stay inside the current language's URL space so the
 * AR mirror never bounces Arabic users (or crawlers) back to the EN
 * canonical route — and so every Arabic detail page has crawlable
 * Arabic internal links (SEO 404 fix, 2026-09-01).
 */
export default function FoodDetailClient({
  food,
  related: relatedProp,
  lang: langProp,
}: {
  food: Food | null;
  related?: Food[];
  lang?: Lang;
}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";
  const base = isAr ? "/ar/foods" : "/foods";

  // Default grams = the food's default serving
  const [grams, setGrams] = useState<number>(food?.defaultGrams || 100);
  // Custom macro target — user picks a macro (calories/protein/carbs/fat) + value
  const [customTarget, setCustomTarget] = useState<{
    macro: "calories" | "protein" | "carbs" | "fat";
    value: string;
  }>({ macro: "calories", value: "" });

  // Re-sync when food changes (e.g. user navigates to a different food)
  useEffect(() => {
    if (food) setGrams(food.defaultGrams);
  }, [food?.slug, food?.defaultGrams]);

  if (!food) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <SiteHeader variant="landing" />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isAr ? "الأكلة غير موجودة" : "Food not found"}
          </h1>
          <a
            href={base}
            className="mt-6 inline-block rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white"
          >
            {isAr ? "العودة للمكتبة" : "Back to library"}
          </a>
        </main>
      </div>
    );
  }

  const nutrition = calculateNutrition(food, grams);
  // Server-computed related foods (prop) — no client data dependency.
  const related = relatedProp ?? [];
  const categoryLabel = isAr ? CATEGORY_LABELS[food.category].ar : CATEGORY_LABELS[food.category].en;

  // Quick gram presets
  const gramPresets = [food.defaultGrams, 50, 100, 150, 200, 250].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  ).slice(0, 5).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* #17 fix: visible breadcrumb trail */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-[#6e6e73]">
          <a href={isAr ? "/ar" : "/"} className="hover:text-[#0071e3]">{isAr ? "الرئيسية" : "Home"}</a>
          <span className="text-[#d2d2d7]">›</span>
          <a href={base} className="hover:text-[#0071e3]">{isAr ? "الأكلات" : "Foods"}</a>
          <span className="text-[#d2d2d7]">›</span>
          <span className="font-medium text-[#1d1d1f]">{isAr ? food.nameAr : food.nameEn}</span>
        </nav>

        {/* Header */}
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Info card — no image */}
          <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
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
            <div className="mt-4 rounded-2xl bg-white p-3">
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

          {/* Hit a specific macro — custom input + quick presets */}
          <div className="mt-6 rounded-2xl bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-[#0071e3]" />
              {isAr ? "عايز توصل لماكرو معين؟" : "Want to hit a specific macro?"}
            </h3>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">
              {isAr
                ? "اكتب الهدف أو دوس على زرار جاهز — هاتحسب الجرامات تلقائياً."
                : "Enter your target or click a preset — grams will be calculated automatically."}
            </p>

            {/* Macro type selector + custom input */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                { macro: "calories", labelAr: "سعرات", labelEn: "Calories", color: "#0071e3", unit: "kcal" },
                { macro: "protein", labelAr: "بروتين", labelEn: "Protein", color: "#34c759", unit: "g" },
                { macro: "carbs", labelAr: "كارب", labelEn: "Carbs", color: "#ff9500", unit: "g" },
                { macro: "fat", labelAr: "دهون", labelEn: "Fat", color: "#ff3b30", unit: "g" },
              ] as const).map((m) => {
                const per100 = food.per100g[m.macro as keyof typeof food.per100g];
                const targetValue = customTarget.macro === m.macro ? customTarget.value : "";
                const gramsNeeded = per100 > 0 && targetValue
                  ? Math.round((Number(targetValue) / per100) * 100)
                  : 0;
                const isActive = customTarget.macro === m.macro;
                return (
                  <div
                    key={m.macro}
                    className={`rounded-xl border-2 p-2 transition-colors ${
                      isActive ? "bg-[#f5f5f7]" : "border-transparent bg-[#f5f5f7]/50"
                    }`}
                    style={isActive ? { borderColor: m.color } : {}}
                  >
                    <button
                      onClick={() => setCustomTarget({ macro: m.macro, value: customTarget.value || "" })}
                      className="flex w-full items-center justify-between text-xs font-medium"
                    >
                      <span style={{ color: m.color }}>
                        {isAr ? m.labelAr : m.labelEn}
                      </span>
                      <span className="text-[10px] text-[#6e6e73]">{m.unit}</span>
                    </button>
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setCustomTarget({ macro: m.macro, value: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="mt-1 w-full rounded-lg border border-[#d2d2d7] bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-[#0071e3]"
                    />
                    {isActive && targetValue && gramsNeeded > 0 && gramsNeeded <= 2000 && (
                      <button
                        onClick={() => setGrams(gramsNeeded)}
                        className="mt-1 w-full rounded-lg bg-[#0071e3] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#0058b9]"
                      >
                        {isAr ? "اضبط" : "Set"} {gramsNeeded}g →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick presets */}
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-medium text-[#6e6e73]">
                {isAr ? "أهداف سريعة:" : "Quick targets:"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { macro: "protein", label: "30g protein", target: 30 },
                  { macro: "protein", label: "50g protein", target: 50 },
                  { macro: "carbs", label: "50g carbs", target: 50 },
                  { macro: "carbs", label: "100g carbs", target: 100 },
                  { macro: "fat", label: "20g fat", target: 20 },
                  { macro: "calories", label: "300 kcal", target: 300 },
                  { macro: "calories", label: "500 kcal", target: 500 },
                ].map((preset) => {
                  const per100 = food.per100g[preset.macro as keyof typeof food.per100g];
                  const gramsNeeded = per100 > 0 ? Math.round((preset.target / per100) * 100) : 0;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => gramsNeeded > 0 && gramsNeeded <= 2000 && setGrams(gramsNeeded)}
                      disabled={gramsNeeded === 0 || gramsNeeded > 2000}
                      className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-[11px] font-medium text-[#0071e3] transition-colors hover:bg-[#0071e3]/20 disabled:opacity-40"
                    >
                      {preset.label}
                      {gramsNeeded > 0 && gramsNeeded <= 2000 && (
                        <span className="ms-1 text-[#6e6e73]">→ {gramsNeeded}g</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Share buttons */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4">
          <p className="text-sm font-medium text-[#1d1d1f]">
            {isAr ? "شارك الأكلة دي" : "Share this food"}
          </p>
          <ShareButtons
            title={isAr ? `${food.nameAr} | Alkemos` : `${food.nameEn} | Alkemos`}
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
            href={isAr ? "/ar/memberships" : "/memberships"}
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
                  href={`${base}/${rel.slug}`}
                  className="group rounded-2xl bg-[#f5f5f7] p-4 transition-opacity hover:opacity-90"
                >
                  <p className="text-sm font-semibold">{isAr ? rel.nameAr : rel.nameEn}</p>
                  <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                    {rel.per100g.calories} kcal · {rel.per100g.protein}g protein
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
