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
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABELS_AR: Record<Activity, string> = {
  sedentary: "خامل (بدون رياضة)",
  light: "نشاط خفيف (1-3 أيام/أسبوع)",
  moderate: "نشاط متوسط (3-5 أيام/أسبوع)",
  active: "نشاط عالي (6-7 أيام/أسبوع)",
  very_active: "نشاط شديد جداً (رياضي محترف)",
};

const ACTIVITY_LABELS_EN: Record<Activity, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Lightly active (1-3 days/week)",
  moderate: "Moderately active (3-5 days/week)",
  active: "Very active (6-7 days/week)",
  very_active: "Extra active (athlete/pro)",
};

export default function CalorieCalculatorPage() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [result, setResult] = useState<{
    bmr: number;
    tdee: number;
    target: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) return;

    // Mifflin-St Jeor Equation
    const bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const tdee = Math.round(bmr * ACTIVITY_FACTORS[activity]);

    let target = tdee;
    if (goal === "lose") target = Math.round(tdee - 500);
    if (goal === "gain") target = Math.round(tdee + 400);

    // Macros: 40% carbs, 30% protein, 30% fat
    const protein = Math.round((target * 0.3) / 4);
    const carbs = Math.round((target * 0.4) / 4);
    const fat = Math.round((target * 0.3) / 9);

    setResult({ bmr: Math.round(bmr), tdee, target, protein, carbs, fat });
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "حاسبة السعرات الحرارية" : "Calorie Calculator"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "احسب احتياجك اليومي من السعرات الحرارية والماكروز بناءً على بياناتك."
              : "Calculate your daily calorie needs and macros based on your stats."}
          </p>
        </div>

        {/* Calculator */}
        <div className="mt-10 rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          {/* Gender */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">
              {isAr ? "الجنس" : "Gender"}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender("male")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                  gender === "male" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73]"
                }`}
              >
                {isAr ? "ذكر" : "Male"}
              </button>
              <button
                onClick={() => setGender("female")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                  gender === "female" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73]"
                }`}
              >
                {isAr ? "أنثى" : "Female"}
              </button>
            </div>
          </div>

          {/* Age + Weight + Height */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {isAr ? "العمر" : "Age"}
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                className="w-full rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                {isAr ? "الوزن (كجم)" : "Weight (kg)"}
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="75"
                className="w-full rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                {isAr ? "الطول (سم)" : "Height (cm)"}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                className="w-full rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
          </div>

          {/* Activity */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">
              {isAr ? "مستوى النشاط" : "Activity Level"}
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as Activity)}
              className="w-full rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
            >
              {(Object.keys(ACTIVITY_FACTORS) as Activity[]).map((a) => (
                <option key={a} value={a}>
                  {isAr ? ACTIVITY_LABELS_AR[a] : ACTIVITY_LABELS_EN[a]}
                </option>
              ))}
            </select>
          </div>

          {/* Goal */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">
              {isAr ? "الهدف" : "Goal"}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setGoal("lose")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                  goal === "lose" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73]"
                }`}
              >
                {isAr ? "خسارة وزن" : "Lose weight"}
              </button>
              <button
                onClick={() => setGoal("maintain")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                  goal === "maintain" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73]"
                }`}
              >
                {isAr ? "ثبات" : "Maintain"}
              </button>
              <button
                onClick={() => setGoal("gain")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                  goal === "gain" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73]"
                }`}
              >
                {isAr ? "زيادة وزن" : "Gain weight"}
              </button>
            </div>
          </div>

          {/* Calculate button */}
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
            {/* Main result */}
            <div className="rounded-3xl bg-[#1d1d1f] p-8 text-center text-white">
              <p className="text-xs font-normal uppercase tracking-wide text-gray-400">
                {isAr ? "السعرات اليومية" : "Daily Calories"}
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">
                {result.target}
              </p>
              <p className="mt-2 text-sm font-normal text-gray-400">
                {isAr ? "سعرة حرارية / يوم" : "calories / day"}
              </p>
            </div>

            {/* BMR + TDEE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#f5f5f7] p-6 text-center">
                <p className="text-2xl font-semibold tracking-tight">{result.bmr}</p>
                <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                  {isAr ? "BMR (معدل الأيض الأساسي)" : "BMR (Basal Metabolic Rate)"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-6 text-center">
                <p className="text-2xl font-semibold tracking-tight">{result.tdee}</p>
                <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                  {isAr ? "TDEE (الاحتياج اليومي)" : "TDEE (Maintenance)"}
                </p>
              </div>
            </div>

            {/* Macros */}
            <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
              <h3 className="text-lg font-semibold tracking-tight">
                {isAr ? "الماكروز اليومية" : "Daily Macros"}
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#0071e3]">{result.protein}g</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {isAr ? "بروتين" : "Protein"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{result.carbs}g</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {isAr ? "كارب" : "Carbs"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#6e6e73]">{result.fat}g</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {isAr ? "دهون" : "Fat"}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-6 text-center">
              <p className="text-base font-normal text-[#1d1d1f]">
                {isAr
                  ? "محتاج خطة تغذية مخصصة بالجرام بناءً على أرقامك؟"
                  : "Need a personalized meal plan based on your numbers?"}
              </p>
              <button
                onClick={() => navigate("memberships")}
                className="mt-4 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
              </button>
            </div>

            {/* Save + Download */}
            <SaveResultButton
              toolSlug="calorie-calculator"
              title={`Calories: ${result.target} kcal/day`}
              resultData={result}
            />

            {/* Lead Capture (Email / WhatsApp) — optional */}
            <LeadCaptureCard
              toolSlug="calorie-calculator"
              resultSummary={
                isAr
                  ? `السعرات: ${result.target}/يوم · بروتين: ${result.protein}g · كارب: ${result.carbs}g · دهون: ${result.fat}g`
                  : `Calories: ${result.target}/day · Protein: ${result.protein}g · Carbs: ${result.carbs}g · Fat: ${result.fat}g`
              }
              resultJson={result}
            />

            {/* Share buttons */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4">
              <ShareButtons
                title={
                  isAr
                    ? `نتائجي من حاسبة السعرات: ${result.target} سعرة/يوم | Musclehubeg`
                    : `My calorie results: ${result.target} cal/day | Musclehubeg`
                }
              />
            </div>

            {/* AdSense */}
            <AdSenseAd format="auto" />
            <OtherTools current="calorie-calculator" />
          </div>
        )}

        {/* SEO content */}
        <div className="mt-12 space-y-4 text-base font-normal leading-relaxed text-[#6e6e73]">
          <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
            {isAr ? "إزاي تحسب السعرات الحرارية؟" : "How to calculate calories?"}
          </h2>
          <p>
            {isAr
              ? "حاسبة السعرات الحرارية بتستخدم معادلة Mifflin-St Jeor — وهي أدق معادلة لحساب معدل الأيض الأساسي (BMR). المعادلة بتعتمد على الوزن والطول والعمر والجنس. بعدين بناخد الـ BMR ونضربه في معامل النشاط عشان نحسب الاحتياج اليومي الكلي من الطاقة (TDEE)."
              : "Our calorie calculator uses the Mifflin-St Jeor equation — the most accurate formula for calculating Basal Metabolic Rate (BMR). It takes into account your weight, height, age, and gender. We then multiply BMR by your activity factor to get your Total Daily Energy Expenditure (TDEE)."}
          </p>
          <p>
            {isAr
              ? "لو هدفك خسارة الوزن، بنطرح 500 سعرة من الـ TDEE (يفقد حوالي 0.5 كجم/أسبوع). لو هدفك زيادة الوزن، بنضيف 400 سعرة. ولو عايز تثبت وزنك، استخدم الـ TDEE كما هو."
              : "For weight loss, we subtract 500 calories from TDEE (about 0.5kg/week loss). For weight gain, we add 400 calories. To maintain weight, use your TDEE as-is."}
          </p>
        </div>
      </main>
    </div>
  );
}
