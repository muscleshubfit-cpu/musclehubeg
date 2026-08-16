"use client";

import { useI18n } from "@/lib/i18n";

const ALL_TOOLS = [
  { slug: "calorie-calculator", nameAr: "حاسبة السعرات", nameEn: "Calorie Calculator", emoji: "🔥", color: "#ff9500" },
  { slug: "bmi-calculator", nameAr: "حاسبة BMI", nameEn: "BMI Calculator", emoji: "⚖️", color: "#0071e3" },
  { slug: "macro-calculator", nameAr: "حاسبة الماكروز", nameEn: "Macro Calculator", emoji: "🥩", color: "#34c759" },
  { slug: "body-fat-calculator", nameAr: "حاسبة الدهون", nameEn: "Body Fat %", emoji: "📊", color: "#ff3b30" },
];


/**
 * OtherTools — shows navigation buttons to all other tools.
 * Place at the bottom of each tool's result page.
 *
 * Props:
 *   current: the slug of the current tool (to exclude it from the list)
 */
export function OtherTools({ current }: { current: string }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const others = ALL_TOOLS.filter((t) => t.slug !== current);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold tracking-tight">
        {isAr ? "أدوات أخرى" : "Other Tools"}
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {others.map((tool) => (
          <a
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] p-4 transition-opacity hover:opacity-90"
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
              style={{ backgroundColor: `${tool.color}15` }}
            >
              {tool.emoji}
            </span>
            <span className="text-sm font-medium">
              {isAr ? tool.nameAr : tool.nameEn}
            </span>
          </a>
        ))}
        <a
          href="/tools"
          className="flex items-center gap-3 rounded-2xl bg-[#1d1d1f] p-4 transition-opacity hover:opacity-90"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg text-white bg-white/10">
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
