"use client";

import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";

// Each tool has a curated Unsplash thumbnail that visually represents it.
// Emojis are kept as fallback (shown if the image fails to load).
const tools = [
  {
    slug: "calorie-calculator",
    nameAr: "حاسبة السعرات الحرارية",
    nameEn: "Calorie Calculator",
    descAr: "احسب احتياجك اليومي من السعرات والماكروز",
    descEn: "Calculate daily calories and macros",
    emoji: "🔥",
    color: "#ff9500",
    image: "https://images.unsplash.com/photo-1590446202655-9c0c8c9f6b8e?w=400&q=80&auto=format&fit=crop",
  },
  {
    slug: "bmi-calculator",
    nameAr: "حاسبة مؤشر كتلة الجسم",
    nameEn: "BMI Calculator",
    descAr: "اعرف هل وزنك مثالي أم زائد",
    descEn: "Check if your weight is healthy",
    emoji: "⚖️",
    color: "#0071e3",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&auto=format&fit=crop",
  },
  {
    slug: "macro-calculator",
    nameAr: "حاسبة الماكروز",
    nameEn: "Macro Calculator",
    descAr: "وزّع سعراتك على بروتين وكارب ودهون",
    descEn: "Split calories into protein, carbs, fat",
    emoji: "🥩",
    color: "#34c759",
    image: "https://images.unsplash.com/photo-1529692236671-f1f6b9b3e03f?w=400&q=80&auto=format&fit=crop",
  },
  {
    slug: "body-fat-calculator",
    nameAr: "حاسبة نسبة الدهون",
    nameEn: "Body Fat Calculator",
    descAr: "احسب نسبة الدهون في جسمك",
    descEn: "Calculate your body fat percentage",
    emoji: "📊",
    color: "#ff3b30",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80&auto=format&fit=crop",
  },
  {
    slug: "water-tracker",
    nameAr: "متتبع شرب الماء",
    nameEn: "Water Tracker",
    descAr: "حدد هدفك وسجل كوبساتك يومياً",
    descEn: "Set your goal and log your cups daily",
    emoji: "💧",
    color: "#00b8d9",
    image: "https://images.unsplash.com/photo-1606243979903-3e8d8c8b3e4a?w=400&q=80&auto=format&fit=crop",
  },
  {
    slug: "/meal-planner",
    nameAr: "مخطط الوجبات",
    nameEn: "Meal Planner",
    descAr: "ابني وجباتك من ٨٨٣٠+ أكلة وشوف الماكروز",
    descEn: "Build meals from 8,830+ foods and track macros",
    emoji: "🍽️",
    color: "#8b5cf6",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80&auto=format&fit=crop",
  },
];

export default function ToolsPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "الأدوات المجانية" : "Free Tools"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "حاسبات لياقة وتغذية مجانية لمساعدتك في رحلتك."
              : "Free fitness and nutrition calculators for your journey."}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <a
              key={tool.slug}
              href={tool.slug.startsWith("/") ? tool.slug : `/tools/${tool.slug}`}
              className="group flex items-center gap-4 rounded-3xl bg-[#f5f5f7] p-6 transition-opacity hover:opacity-90"
            >
              <span
                className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl"
                style={{ backgroundColor: `${tool.color}15` }}
              >
                <img
                  src={tool.image}
                  alt={isAr ? tool.nameAr : tool.nameEn}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Hide image on error, fall back to emoji text
                    (e.target as HTMLImageElement).style.display = "none";
                    const fallback = (e.target as HTMLImageElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = "inline";
                  }}
                />
                <span style={{ display: "none" }}>{tool.emoji}</span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold tracking-tight">
                  {isAr ? tool.nameAr : tool.nameEn}
                </h3>
                <p className="mt-1 text-sm font-normal text-[#6e6e73]">
                  {isAr ? tool.descAr : tool.descEn}
                </p>
              </div>
              <span className="text-2xl text-[#6e6e73]">›</span>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
