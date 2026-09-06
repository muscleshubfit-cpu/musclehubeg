"use client";

import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { PageBanner } from "@/components/PageBanner";
import { EngravedIcon } from "@/components/ThemeImg";

// Phase 127 «Marble & Chrome» identity: engraved icon pairs (mission §6
// zero-emoji law) replace the old Apple-style emoji-fallback tiles.
const tools = [
  {
    slug: "calorie-calculator",
    nameAr: "حاسبة السعرات الحرارية",
    nameEn: "Calorie Calculator",
    descAr: "احسب احتياجك اليومي من السعرات والماكروز",
    descEn: "Calculate daily calories and macros",
    icon: "calories",
  },
  {
    slug: "bmi-calculator",
    nameAr: "حاسبة مؤشر كتلة الجسم",
    nameEn: "BMI Calculator",
    descAr: "اعرف هل وزنك مثالي أم زائد",
    descEn: "Check if your weight is healthy",
    icon: "bmi",
  },
  {
    slug: "macro-calculator",
    nameAr: "حاسبة الماكروز",
    nameEn: "Macro Calculator",
    descAr: "وزّع سعراتك على بروتين وكارب ودهون",
    descEn: "Split calories into protein, carbs, fat",
    icon: "macros",
  },
  {
    slug: "body-fat-calculator",
    nameAr: "حاسبة نسبة الدهون",
    nameEn: "Body Fat Calculator",
    descAr: "احسب نسبة الدهون في جسمك",
    descEn: "Calculate your body fat percentage",
    icon: "bodyfat",
  },
  {
    slug: "water-tracker",
    nameAr: "متتبع شرب الماء",
    nameEn: "Water Tracker",
    descAr: "حدد هدفك وسجل كوبساتك يومياً",
    descEn: "Set your goal and log your cups daily",
    icon: "hydration",
  },
  {
    slug: "/meal-planner",
    nameAr: "مخطط الوجبات",
    nameEn: "Meal Planner",
    descAr: "ابني وجباتك من ٨٨٣٠+ أكلة وشوف الماكروز",
    descEn: "Build meals from 8,830+ foods and track macros",
    icon: "mealplanner",
  },
  // DELIVERY 0050: content libraries cross-linked from the tools hub
  {
    slug: "/exercises",
    nameAr: "مكتبة التمارين",
    nameEn: "Exercise Library",
    descAr: "868+ تمرين بالصور والشرح والمستويات",
    descEn: "868+ exercises with images and guides",
    icon: "dumbbell",
  },
  {
    slug: "/foods",
    nameAr: "مكتبة الأكلات",
    nameEn: "Food Library",
    descAr: "8,830+ أكلة بالسعرات والماكروز",
    descEn: "8,830+ foods with calories and macros",
    icon: "protein",
  },
];

export default function ToolsPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        {/* Owner artwork page banner (Phase 127: the 12 header images are
            PAGE banners, not homepage section banners) */}
        <PageBanner section="tools" className="mb-10" />

        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "الأدوات المجانية" : "Free Tools"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[var(--muted-foreground)] md:text-lg">
            {isAr
              ? "حاسبات لياقة وتغذية مجانية لمساعدتك في رحلتك."
              : "Free fitness and nutrition calculators for your journey."}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} isAr={isAr} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ToolCard({ tool, isAr }: { tool: (typeof tools)[number]; isAr: boolean }) {
  return (
    <a
      href={tool.slug.startsWith("/") ? tool.slug : `/tools/${tool.slug}`}
      className="marble-card group flex items-center gap-4 p-6 transition-transform duration-300 hover:-translate-y-0.5"
    >
      {/* Engraved icon pair (Phase 127 identity — replaces emoji tiles) */}
      <EngravedIcon
        name={tool.icon}
        alt={isAr ? tool.nameAr : tool.nameEn}
        size={56}
        className="h-14 w-14 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          {isAr ? tool.nameAr : tool.nameEn}
        </h3>
        <p className="mt-1 text-sm font-normal text-[var(--muted-foreground)]">
          {isAr ? tool.descAr : tool.descEn}
        </p>
      </div>
      {/* Chrome arrow (mission §6) */}
      <span className="chrome-text shrink-0 text-2xl font-semibold" aria-hidden="true">
        ›
      </span>
    </a>
  );
}
