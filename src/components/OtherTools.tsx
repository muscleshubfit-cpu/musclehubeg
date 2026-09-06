"use client";

import { useI18n } from "@/lib/i18n";
import { EngravedIcon } from "@/components/ThemeImg";

// Phase 132 (owner feedback: «باقي الموقع إعادة التنسيق ليتبع هوية الصفحة
// الرئيسية»): engraved icon pairs replace the emoji tiles (zero-emoji law)
// and the tile colors go neutral (Marble & Chrome identity).
const ALL_TOOLS = [
  { slug: "calorie-calculator", nameAr: "حاسبة السعرات", nameEn: "Calorie Calculator", icon: "calories" },
  { slug: "bmi-calculator", nameAr: "حاسبة BMI", nameEn: "BMI Calculator", icon: "bmi" },
  { slug: "macro-calculator", nameAr: "حاسبة الماكروز", nameEn: "Macro Calculator", icon: "macros" },
  { slug: "body-fat-calculator", nameAr: "حاسبة الدهون", nameEn: "Body Fat %", icon: "bodyfat" },
  // meal-planner + water-tracker are top-level routes (/meal-planner, /tools/water-tracker),
  // so we mark them with an absolute path prefix.
  { slug: "/meal-planner", nameAr: "مخطط الوجبات", nameEn: "Meal Planner", icon: "mealplanner" },
  { slug: "water-tracker", nameAr: "متتبع الماء", nameEn: "Water Tracker", icon: "hydration" },
  // DELIVERY 0050: content libraries are site pages too — owner asked for
  // «صفحات اخرى من الموقع» at the bottom of every tool page.
  { slug: "/exercises", nameAr: "مكتبة التمارين", nameEn: "Exercise Library", icon: "dumbbell" },
  { slug: "/foods", nameAr: "مكتبة الأكلات", nameEn: "Food Library", icon: "protein" },
];


/**
 * OtherTools — shows navigation buttons to all other tools.
 * Place at the bottom of each tool's result page.
 *
 * Props:
 *   current: the slug of the current tool (to exclude it from the list)
 *
 * Note: `current` may be either a relative slug like "calorie-calculator"
 * OR an absolute path like "/meal-planner" — we match both forms so the
 * current tool is correctly excluded.
 */
export function OtherTools({ current }: { current: string }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  // Normalize "current" — handle both relative slugs and absolute paths
  const normalizedCurrent = current.startsWith("/") ? current.replace(/^\//, "") : current;
  const others = ALL_TOOLS.filter((t) => t.slug !== normalizedCurrent);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold tracking-tight">
        {isAr ? "أدوات أخرى" : "Other Tools"}
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {others.map((tool) => (
          <a
            key={tool.slug}
            href={tool.slug.startsWith("/") ? tool.slug : `/tools/${tool.slug}`}
            className="marble-card flex items-center gap-3 p-4 transition-opacity hover:opacity-90"
          >
            <EngravedIcon
              name={tool.icon}
              alt=""
              size={40}
              className="h-10 w-10 shrink-0"
            />
            <span className="text-sm font-medium">
              {isAr ? tool.nameAr : tool.nameEn}
            </span>
          </a>
        ))}
        <a
          href="/tools"
          className="flex items-center gap-3 rounded-2xl bg-black p-4 text-white transition-opacity hover:opacity-90"
          style={{ boxShadow: "0 0 0 2px #C9CED3, var(--shadow)" }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lg rtl:rotate-180">
            ←
          </span>
          <span className="text-sm font-medium text-white">
            {isAr ? "كل الأدوات" : "All Tools"}
          </span>
        </a>
      </div>
    </div>
  );
}
