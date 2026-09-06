"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { SiteHeader } from "@/components/SiteHeader";
import { AdSenseAd } from "@/components/AdSenseAd";
import { OtherTools } from "@/components/OtherTools";
import { LeadCaptureCard } from "@/components/LeadCaptureCard";
import { SaveResultButton } from "@/components/SaveResultButton";
import { ShareButtons } from "@/components/ShareButtons";

type DietType = "balanced" | "low_carb" | "high_protein" | "keto" | "low_fat";

const DIET_PRESETS: Record<DietType, { protein: number; carbs: number; fat: number; label_ar: string; label_en: string }> = {
  balanced: { protein: 30, carbs: 40, fat: 30, label_ar: "متوازن", label_en: "Balanced" },
  low_carb: { protein: 40, carbs: 20, fat: 40, label_ar: "قليل الكارب", label_en: "Low Carb" },
  high_protein: { protein: 45, carbs: 35, fat: 20, label_ar: "عالي البروتين", label_en: "High Protein" },
  keto: { protein: 25, carbs: 5, fat: 70, label_ar: "كيتو", label_en: "Keto" },
  low_fat: { protein: 35, carbs: 55, fat: 10, label_ar: "قليل الدهون", label_en: "Low Fat" },
};

export default function MacroCalculatorPage() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  const [calories, setCalories] = useState("");
  const [diet, setDiet] = useState<DietType>("balanced");
  const [result, setResult] = useState<{
    protein_g: number; carbs_g: number; fat_g: number;
    protein_cal: number; carbs_cal: number; fat_cal: number;
  } | null>(null);

  const calculate = () => {
    const cal = parseInt(calories);
    if (!cal || cal <= 0) return;

    const preset = DIET_PRESETS[diet];
    const protein_cal = Math.round(cal * preset.protein / 100);
    const carbs_cal = Math.round(cal * preset.carbs / 100);
    const fat_cal = Math.round(cal * preset.fat / 100);

    setResult({
      protein_g: Math.round(protein_cal / 4),
      carbs_g: Math.round(carbs_cal / 4),
      fat_g: Math.round(fat_cal / 9),
      protein_cal, carbs_cal, fat_cal,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />
      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "حاسبة الماكروز" : "Macro Calculator"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[var(--muted-foreground)] md:text-lg">
            {isAr ? "وزّع سعراتك على بروتين وكارب ودهون حسب نظامك الغذائي." : "Split your calories into protein, carbs, and fat."}
          </p>
        </div>

        <div className="mt-10 rounded-3xl bg-[var(--tint)] p-6 md:p-8">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">{isAr ? "السعرات اليومية" : "Daily Calories"}</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="2000"
              className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]" />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">{isAr ? "نظام غذائي" : "Diet Type"}</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIET_PRESETS) as DietType[]).map((d) => (
                <button key={d} onClick={() => setDiet(d)}
                  className={`rounded-full px-4 py-2 text-sm font-normal transition-all ${diet === d ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
                  {isAr ? DIET_PRESETS[d].label_ar : DIET_PRESETS[d].label_en}
                </button>
              ))}
            </div>
          </div>

          <button onClick={calculate} className="w-full btn-chrome px-6 py-3 text-base">
            {isAr ? "احسب" : "Calculate"}
          </button>
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-[var(--radius-chrome)] bg-black p-6 text-center text-white">
                <p className="text-3xl font-semibold tracking-tight">{result.protein_g}g</p>
                <p className="mt-1 text-xs font-normal text-blue-100">{isAr ? "بروتين" : "Protein"}</p>
                <p className="mt-1 text-xs font-normal text-blue-200">{result.protein_cal} {isAr ? "سعرة" : "cal"}</p>
              </div>
              <div className="rounded-[var(--radius-chrome)] bg-black p-6 text-center text-white">
                <p className="text-3xl font-semibold tracking-tight">{result.carbs_g}g</p>
                <p className="mt-1 text-xs font-normal text-gray-400">{isAr ? "كارب" : "Carbs"}</p>
                <p className="mt-1 text-xs font-normal text-gray-500">{result.carbs_cal} {isAr ? "سعرة" : "cal"}</p>
              </div>
              <div className="rounded-3xl bg-[var(--muted-foreground)] p-6 text-center text-white">
                <p className="text-3xl font-semibold tracking-tight">{result.fat_g}g</p>
                <p className="mt-1 text-xs font-normal text-gray-300">{isAr ? "دهون" : "Fat"}</p>
                <p className="mt-1 text-xs font-normal text-gray-400">{result.fat_cal} {isAr ? "سعرة" : "cal"}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--edge)] bg-[var(--tint)] p-6 text-center">
              <p className="text-base font-normal text-[var(--text)]">{isAr ? "محتاج خطة وجبات بالماكروز دي؟" : "Need a meal plan with these macros?"}</p>
              <button onClick={() => navigate("memberships")} className="mt-4 btn-chrome px-6 py-2.5 text-sm">
                {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
              </button>
            </div>

            {/* Save + Download */}
            <SaveResultButton
              toolSlug="macro-calculator"
              title={`Macros: P${result.protein_g}g C${result.carbs_g}g F${result.fat_g}g`}
              resultData={{ ...result, calories, diet }}
            />

            {/* Lead Capture (Email / WhatsApp) — optional */}
            <LeadCaptureCard
              toolSlug="macro-calculator"
              resultSummary={
                isAr
                  ? `السعرات: ${calories} · ${DIET_PRESETS[diet].label_ar} · بروتين: ${result.protein_g}g · كارب: ${result.carbs_g}g · دهون: ${result.fat_g}g`
                  : `Calories: ${calories} · ${DIET_PRESETS[diet].label_en} · Protein: ${result.protein_g}g · Carbs: ${result.carbs_g}g · Fat: ${result.fat_g}g`
              }
              resultJson={{ ...result, calories, diet }}
            />

            {/* Share buttons */}
            <div className="rounded-2xl bg-[var(--tint)] p-4">
              <ShareButtons
                title={
                  isAr
                    ? `ماكروزي: بروتين ${result.protein_g}g · كارب ${result.carbs_g}g · دهون ${result.fat_g}g | Alkemos`
                    : `My macros: Protein ${result.protein_g}g · Carbs ${result.carbs_g}g · Fat ${result.fat_g}g | Alkemos`
                }
              />
            </div>

            <AdSenseAd format="auto" />
          </div>
        )}

        {/* DELIVERY 0050: other-tools links always visible at the bottom (owner request) */}
        <OtherTools current="macro-calculator" />

        <div className="mt-12 space-y-4 text-base font-normal leading-relaxed text-[var(--muted-foreground)]">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{isAr ? "إيه هي الماكروز؟" : "What are macros?"}</h2>
          <p>{isAr ? "الماكروز هي العناصر الغذائية الكبرى: البروتين (4 سعرات/جرام)، الكاربوهيدرات (4 سعرات/جرام)، والدهون (9 سعرات/جرام). توزيع الماكروز بيحدد نوع نظامك الغذائي — زي الكيتو (عالي دهون) أو عالي البروتين (لكمال الأجسام)." : "Macros are the three main nutrients: Protein (4 cal/g), Carbohydrates (4 cal/g), and Fat (9 cal/g). Your macro split determines your diet type — like Keto (high fat) or High Protein (for bodybuilding)."}</p>
        </div>
      </main>
    </div>
  );
}
