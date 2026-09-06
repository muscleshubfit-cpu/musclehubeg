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

type Gender = "male" | "female";

export default function BodyFatCalculatorPage() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  const [gender, setGender] = useState<Gender>("male");
  const [height, setHeight] = useState("");
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [result, setResult] = useState<{ bf: number; category: string; color: string; fatMass: number; leanMass: number } | null>(null);

  const calculate = () => {
    const h = parseFloat(height);
    const n = parseFloat(neck);
    const w = parseFloat(waist);
    if (!h || !n || !w || h <= 0 || n <= 0 || w <= 0) return;

    let bf: number;
    if (gender === "male") {
      // Navy Method (men): 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
      const diff = w - n;
      if (diff <= 0) return;
      bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(h)) - 450;
    } else {
      const hp = parseFloat(hip);
      if (!hp || hp <= 0) return;
      const diff = w + hp - n;
      bf = 495 / (1.29579 - 0.35004 * Math.log10(diff) + 0.22100 * Math.log10(h)) - 450;
    }

    bf = Math.max(2, Math.round(bf * 10) / 10);

    let category: string;
    let color: string;
    if (gender === "male") {
      if (bf < 6) { category = isAr ? "أساسي" : "Essential"; color = "#ff3b30"; }
      else if (bf < 14) { category = isAr ? "رياضي" : "Athlete"; color = "#34c759"; }
      else if (bf < 18) { category = isAr ? "لياقة" : "Fitness"; color = "#34c759"; }
      else if (bf < 25) { category = isAr ? "متوسط" : "Average"; color = "#ff9500"; }
      else { category = isAr ? "سمنة" : "Obese"; color = "#ff3b30"; }
    } else {
      if (bf < 14) { category = isAr ? "أساسي" : "Essential"; color = "#ff3b30"; }
      else if (bf < 21) { category = isAr ? "رياضي" : "Athlete"; color = "#34c759"; }
      else if (bf < 25) { category = isAr ? "لياقة" : "Fitness"; color = "#34c759"; }
      else if (bf < 32) { category = isAr ? "متوسط" : "Average"; color = "#ff9500"; }
      else { category = isAr ? "سمنة" : "Obese"; color = "#ff3b30"; }
    }

    // Estimate weight from BMI approximation (BMI 22 = healthy midpoint).
    // Formula: BMI = weight / height_m² → weight = BMI × height_m²
    // For h=175cm → heightM=1.75 → weight = 22 × 1.75² = 67.375 kg
    const heightM = h / 100;
    const estimatedWeight = 22 * heightM * heightM; // kg, no extra multiplier
    const fatMass = Math.round(estimatedWeight * bf / 100);
    const leanMass = Math.round(estimatedWeight - fatMass);

    setResult({ bf, category, color, fatMass, leanMass });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />
      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "حاسبة نسبة الدهون" : "Body Fat Calculator"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[var(--muted-foreground)] md:text-lg">
            {isAr ? "احسب نسبة الدهون في جسمك بطريقة البحرية الأمريكية." : "Calculate your body fat percentage using the Navy Method."}
          </p>
        </div>

        <div className="mt-10 rounded-3xl bg-[var(--tint)] p-6 md:p-8">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">{isAr ? "الجنس" : "Gender"}</label>
            <div className="flex gap-2">
              <button onClick={() => setGender("male")} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${gender === "male" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
                {isAr ? "ذكر" : "Male"}
              </button>
              <button onClick={() => setGender("female")} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${gender === "female" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
                {isAr ? "أنثى" : "Female"}
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">{isAr ? "الطول (سم)" : "Height (cm)"}</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175"
                className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{isAr ? "محيط الرقبة (سم)" : "Neck (cm)"}</label>
              <input type="number" value={neck} onChange={(e) => setNeck(e.target.value)} placeholder="38"
                className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{isAr ? "محيط الخصر (سم)" : "Waist (cm)"}</label>
              <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="85"
                className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]" />
            </div>
            {gender === "female" && (
              <div>
                <label className="mb-2 block text-sm font-medium">{isAr ? "محيط الورك (سم)" : "Hip (cm)"}</label>
                <input type="number" value={hip} onChange={(e) => setHip(e.target.value)} placeholder="95"
                  className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]" />
              </div>
            )}
          </div>

          <button onClick={calculate} className="w-full btn-chrome px-6 py-3 text-base">
            {isAr ? "احسب" : "Calculate"}
          </button>
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-[var(--radius-chrome)] bg-black p-8 text-center text-white">
              <p className="text-xs font-normal uppercase tracking-wide text-gray-400">{isAr ? "نسبة الدهون" : "Body Fat"}</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">{result.bf}%</p>
              <p className="mt-3 inline-block rounded-full px-4 py-1 text-sm font-medium" style={{ backgroundColor: `${result.color}20`, color: result.color }}>
                {result.category}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[var(--tint)] p-6 text-center">
                <p className="text-2xl font-semibold text-[var(--warning)]">{result.fatMass} kg</p>
                <p className="mt-1 text-xs font-normal text-[var(--muted-foreground)]">{isAr ? "كتلة دهون" : "Fat mass"}</p>
              </div>
              <div className="rounded-2xl bg-[var(--tint)] p-6 text-center">
                <p className="text-2xl font-semibold text-[var(--success)]">{result.leanMass} kg</p>
                <p className="mt-1 text-xs font-normal text-[var(--muted-foreground)]">{isAr ? "كتلة عضلية" : "Lean mass"}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--edge)] bg-[var(--tint)] p-6 text-center">
              <p className="text-base font-normal text-[var(--text)]">{isAr ? "محتاج خطة لتقليل الدهون وزيادة العضلات؟" : "Need a plan to reduce fat and build muscle?"}</p>
              <button onClick={() => navigate("memberships")} className="mt-4 btn-chrome px-6 py-2.5 text-sm">
                {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
              </button>
            </div>

            {/* Save + Download */}
            <SaveResultButton
              toolSlug="body-fat-calculator"
              title={`Body Fat: ${result.bf}% (${result.category})`}
              resultData={{ ...result, gender }}
            />

            {/* Lead Capture (Email / WhatsApp) — optional */}
            <LeadCaptureCard
              toolSlug="body-fat-calculator"
              resultSummary={
                isAr
                  ? `نسبة الدهون: ${result.bf}% (${result.category}) · كتلة دهون: ${result.fatMass}kg · كتلة عضلية: ${result.leanMass}kg`
                  : `Body Fat: ${result.bf}% (${result.category}) · Fat mass: ${result.fatMass}kg · Lean mass: ${result.leanMass}kg`
              }
              resultJson={{ ...result, gender }}
            />

            {/* Share buttons */}
            <div className="rounded-2xl bg-[var(--tint)] p-4">
              <ShareButtons
                title={
                  isAr
                    ? `نسبة دهوني: ${result.bf}% (${result.category}) | Alkemos`
                    : `My body fat: ${result.bf}% (${result.category}) | Alkemos`
                }
              />
            </div>

            <AdSenseAd format="auto" />
          </div>
        )}

        {/* DELIVERY 0050: other-tools links always visible at the bottom (owner request) */}
        <OtherTools current="body-fat-calculator" />

        <div className="mt-12 space-y-4 text-base font-normal leading-relaxed text-[var(--muted-foreground)]">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{isAr ? "إزاي تحسب نسبة الدهون؟" : "How to calculate body fat?"}</h2>
          <p>{isAr ? "حاسبتنا بتستخدم طريقة البحرية الأمريكية (Navy Method) اللي بتعتمد على محيط الخصر والرقبة (والورك للإناث) والطول. الطريقة دي دقيقة ومش محتاجة معدات خاصة." : "Our calculator uses the US Navy Method, which relies on waist, neck (and hip for females) circumference plus height. It's accurate and requires no special equipment."}</p>
        </div>
      </main>
    </div>
  );
}
