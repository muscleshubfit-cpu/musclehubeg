"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { SiteHeader } from "@/components/SiteHeader";
import { AdSenseAd } from "@/components/AdSenseAd";
import { OtherTools } from "@/components/OtherTools";
import { LeadCaptureCard } from "@/components/LeadCaptureCard";
import { ShareButtons } from "@/components/ShareButtons";

type Unit = "metric" | "imperial";

export default function BMICalculatorPage() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  const [unit, setUnit] = useState<Unit>("metric");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState<{
    bmi: number;
    category: string;
    color: string;
    idealWeightMin: number;
    idealWeightMax: number;
  } | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || w <= 0 || h <= 0) return;

    let bmi: number;
    let weightKg: number;
    let heightM: number;

    if (unit === "metric") {
      weightKg = w;
      heightM = h / 100;
      bmi = weightKg / (heightM * heightM);
    } else {
      // Imperial: weight in lbs, height in inches
      weightKg = w * 0.453592;
      heightM = (h * 0.0254);
      bmi = weightKg / (heightM * heightM);
    }

    bmi = Math.round(bmi * 10) / 10;

    let category: string;
    let color: string;

    if (bmi < 18.5) {
      category = isAr ? "نقص في الوزن" : "Underweight";
      color = "#ff9500";
    } else if (bmi < 25) {
      category = isAr ? "وزن مثالي" : "Normal weight";
      color = "#34c759";
    } else if (bmi < 30) {
      category = isAr ? "زيادة في الوزن" : "Overweight";
      color = "#ff9500";
    } else {
      category = isAr ? "سمنة" : "Obese";
      color = "#ff3b30";
    }

    // Ideal weight range (BMI 18.5 - 24.9)
    const idealWeightMin = Math.round(18.5 * heightM * heightM * (unit === "metric" ? 1 : 2.20462));
    const idealWeightMax = Math.round(24.9 * heightM * heightM * (unit === "metric" ? 1 : 2.20462));

    setResult({ bmi, category, color, idealWeightMin, idealWeightMax });
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "حاسبة مؤشر كتلة الجسم" : "BMI Calculator"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "احسب مؤشر كتلة الجسم (BMI) واعرف هل وزنك مثالي."
              : "Calculate your Body Mass Index (BMI) and check if your weight is healthy."}
          </p>
        </div>

        {/* Calculator */}
        <div className="mt-10 rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          {/* Unit toggle */}
          <div className="mb-6">
            <div className="inline-flex rounded-full bg-white p-1">
              <button
                onClick={() => setUnit("metric")}
                className={`rounded-full px-5 py-2 text-sm font-normal transition-all ${
                  unit === "metric" ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]"
                }`}
              >
                {isAr ? "متري (كجم/سم)" : "Metric (kg/cm)"}
              </button>
              <button
                onClick={() => setUnit("imperial")}
                className={`rounded-full px-5 py-2 text-sm font-normal transition-all ${
                  unit === "imperial" ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]"
                }`}
              >
                {isAr ? "إمبراطوري (رطل/إنش)" : "Imperial (lb/in)"}
              </button>
            </div>
          </div>

          {/* Weight + Height */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {isAr ? `الوزن (${unit === "metric" ? "كجم" : "رطل"})` : `Weight (${unit === "metric" ? "kg" : "lb"})`}
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={unit === "metric" ? "75" : "165"}
                className="w-full rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                {isAr ? `الطول (${unit === "metric" ? "سم" : "إنش"})` : `Height (${unit === "metric" ? "cm" : "in"})`}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={unit === "metric" ? "175" : "69"}
                className="w-full rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
          </div>

          {/* Calculate */}
          <button
            onClick={calculate}
            className="w-full rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
          >
            {isAr ? "احسب" : "Calculate"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* BMI Score */}
            <div className="rounded-3xl bg-[#1d1d1f] p-8 text-center text-white">
              <p className="text-xs font-normal uppercase tracking-wide text-gray-400">
                {isAr ? "مؤشر كتلة الجسم" : "Your BMI"}
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">
                {result.bmi}
              </p>
              <p className="mt-3 inline-block rounded-full px-4 py-1 text-sm font-medium" style={{ backgroundColor: `${result.color}20`, color: result.color }}>
                {result.category}
              </p>
            </div>

            {/* BMI Scale */}
            <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
              <h3 className="text-lg font-semibold tracking-tight">
                {isAr ? "مقياس BMI" : "BMI Scale"}
              </h3>
              <div className="mt-4 space-y-2">
                {[
                  { range: isAr ? "أقل من 18.5" : "Below 18.5", label: isAr ? "نقص وزن" : "Underweight", color: "#ff9500", active: result.bmi < 18.5 },
                  { range: "18.5 - 24.9", label: isAr ? "وزن مثالي" : "Normal", color: "#34c759", active: result.bmi >= 18.5 && result.bmi < 25 },
                  { range: "25 - 29.9", label: isAr ? "زيادة وزن" : "Overweight", color: "#ff9500", active: result.bmi >= 25 && result.bmi < 30 },
                  { range: isAr ? "30 فأكثر" : "30 and above", label: isAr ? "سمنة" : "Obese", color: "#ff3b30", active: result.bmi >= 30 },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                      row.active ? "bg-white" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-normal">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.label}
                    </span>
                    <span className="text-sm font-normal text-[#6e6e73]">{row.range}</span>
                  </div>
                ))}
              </div>

              {/* Ideal weight */}
              <div className="mt-6 rounded-2xl bg-white p-4 text-center">
                <p className="text-sm font-normal text-[#6e6e73]">
                  {isAr ? "وزنك المثالي" : "Your ideal weight"}
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.idealWeightMin} - {result.idealWeightMax} {unit === "metric" ? (isAr ? "كجم" : "kg") : (isAr ? "رطل" : "lb")}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-6 text-center">
              <p className="text-base font-normal text-[#1d1d1f]">
                {isAr
                  ? "محتاج خطة مخصصة للوصول لوزنك المثالي؟"
                  : "Need a personalized plan to reach your ideal weight?"}
              </p>
              <button
                onClick={() => navigate("pricing")}
                className="mt-4 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
              </button>
            </div>

            {/* Lead Capture (Email / WhatsApp) — optional */}
            <LeadCaptureCard
              toolSlug="bmi-calculator"
              resultSummary={
                isAr
                  ? `BMI: ${result.bmi} (${result.category}) · الوزن المثالي: ${result.idealWeightMin}-${result.idealWeightMax} ${unit === "metric" ? "كجم" : "lb"}`
                  : `BMI: ${result.bmi} (${result.category}) · Ideal weight: ${result.idealWeightMin}-${result.idealWeightMax} ${unit === "metric" ? "kg" : "lb"}`
              }
              resultJson={result}
            />

            {/* Share buttons */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4">
              <ShareButtons
                title={
                  isAr
                    ? `نتائجي من حاسبة BMI: ${result.bmi} (${result.category}) | MuscleHub`
                    : `My BMI results: ${result.bmi} (${result.category}) | MuscleHub`
                }
              />
            </div>

            {/* AdSense */}
            <AdSenseAd format="auto" />
            <OtherTools current="bmi-calculator" />
          </div>
        )}

        {/* SEO content */}
        <div className="mt-12 space-y-4 text-base font-normal leading-relaxed text-[#6e6e73]">
          <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
            {isAr ? "إيه هو مؤشر كتلة الجسم (BMI)؟" : "What is Body Mass Index (BMI)?"}
          </h2>
          <p>
            {isAr
              ? "مؤشر كتلة الجسم (BMI) هو مقياس بيستخدم الطول والوزن لتقدير كمية الدهون في الجسم. البي إم آي بيساعد على تحديد هل وزنك في النطاق الصحي أم لا. معادلة BMI هي: الوزن بالكيلوجرام ÷ (الطول بالمتر × الطول بالمتر)."
              : "Body Mass Index (BMI) is a measure that uses your height and weight to estimate body fat. BMI helps determine if your weight is in a healthy range. The formula is: weight (kg) ÷ height (m)²."}
          </p>
          <p>
            {isAr
              ? "رغم إن BMI أداة مفيدة، إلا إنها مش بتفرّق بين العضلات والدهون. الرياضيون ممكن يكون عندهم BMI عالي بسبب كتلة العضلات مش الدهون. الأفضل تستخدم BMI كنقطة بداية وتراجع مختص لو محتاج تقييم أدق."
              : "While BMI is a useful tool, it doesn't distinguish between muscle and fat. Athletes may have a high BMI due to muscle mass, not fat. Use BMI as a starting point and consult a professional for a more accurate assessment."}
          </p>
        </div>
      </main>
    </div>
  );
}
