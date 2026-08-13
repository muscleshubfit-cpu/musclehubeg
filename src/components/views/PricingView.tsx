"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { cn } from "@/lib/utils";
import {
  TIERS,
  TIER_IDS,
  DURATIONS,
  allFeatureKeys,
  getTier,
  formatEgp,
  savingsFor,
  type Duration,
  type TierId,
} from "@/lib/plans";

export function PricingView() {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const [duration, setDuration] = useState<Duration>(12);
  const isAr = lang === "ar";

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button
          className="text-lg font-semibold tracking-tight"
          onClick={() => navigate("landing")}
        >
          MuscleHub
        </button>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <button
            onClick={() => navigate("auth", { mode: "login" })}
            className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
          >
            {t("landing.hero.login")}
          </button>
        </div>
      </header>

      <section className="px-4 py-20 text-center md:py-28">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {t("pricing.heading")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-normal text-[#6e6e73] md:text-xl">
            {t("pricing.intro")}
          </p>

          {/* Duration toggle — Apple-style segmented control */}
          <div className="mt-10 inline-flex rounded-full bg-[#f5f5f7] p-1">
            <button
              onClick={() => setDuration(1)}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-normal transition-all",
                duration === 1
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#6e6e73] hover:text-[#1d1d1f]",
              )}
            >
              {isAr ? "شهر واحد" : "1 month"}
            </button>
            <button
              onClick={() => setDuration(12)}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-normal transition-all",
                duration === 12
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#6e6e73] hover:text-[#1d1d1f]",
              )}
            >
              {isAr ? "12 شهر" : "12 months"}
              <span className="ml-2 rounded-full bg-[#0071e3] px-2 py-0.5 text-[10px] font-normal text-white">
                -17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="px-4 pb-20 md:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            {TIERS.map((tier) => (
              <PlanCard
                key={tier.id}
                tierId={tier.id}
                duration={duration}
                onChoose={(tierId, months) => navigate("checkout", { tier: tierId, months })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:text-4xl">
            {t("cmp.title")}
          </h2>
          <ComparisonTable duration={duration} />
        </div>
      </section>

      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}

function PlanCard({
  tierId,
  duration,
  onChoose,
}: {
  tierId: TierId;
  duration: Duration;
  onChoose: (tierId: TierId, months: Duration) => void;
}) {
  const { t } = useI18n();
  const tier = getTier(tierId)!;
  const features = allFeatureKeys(tierId);
  const inherited = tier.inheritsFrom ? getTier(tier.inheritsFrom) : undefined;
  const ownFeatures = tier.featureKeys;
  const price = tier.prices[duration];
  const savings = savingsFor(tierId);
  const highlight = tier.popular || tier.best;
  const isAr = useI18n().lang === "ar";

  return (
    <div
      className={cn(
        "rounded-3xl p-8 md:p-10",
        highlight ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]",
      )}
    >
      <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
        {t(tier.nameKey)}
      </h3>
      <p className={cn("mt-1 text-sm font-normal", highlight ? "text-gray-400" : "text-[#6e6e73]")}>
        {t(tier.subKey)}
      </p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-5xl font-semibold tracking-tight md:text-6xl">${price}</span>
        <span className={cn("text-base font-normal", highlight ? "text-gray-400" : "text-[#6e6e73]")}>
          {duration === 1 ? (isAr ? "/شهر" : "/mo") : (isAr ? "/سنة" : "/yr")}
        </span>
      </div>
      <p className={cn("mt-1 text-sm font-normal", highlight ? "text-gray-400" : "text-[#6e6e73]")}>
        ≈ {duration === 1 ? price * 50 : price * 50} {isAr ? "ج.م" : "EGP"}
        {duration === 1 ? (isAr ? "/شهر" : "/mo") : (isAr ? "/سنة" : "/yr")}
      </p>

      {duration === 12 && savings && (
        <p className={cn("mt-2 text-xs font-normal", highlight ? "text-[#0071e3]" : "text-[#0071e3]")}>
          {isAr ? `وفّر $${savings.amount} (${savings.percent}%) — شهرين مجاناً!` : `Save $${savings.amount} (${savings.percent}%) — 2 months free!`}
        </p>
      )}

      {/* Swap limit */}
      <div className={cn("mt-6 rounded-2xl p-4 text-center", highlight ? "bg-white/10" : "bg-white")}>
        <div className={cn("text-xs font-normal", highlight ? "text-gray-400" : "text-[#6e6e73]")}>
          {isAr ? "تبديلات يومية" : "Daily swaps"}
        </div>
        <div className="mt-1 text-lg font-semibold">
          {tier.swapLimit === null
            ? (isAr ? "∞ غير محدود" : "∞ Unlimited")
            : `${tier.swapLimit} ${isAr ? "وجبة" : "meals"} + ${tier.swapLimit} ${isAr ? "تمرين" : "workouts"}`}
        </div>
      </div>

      <button
        onClick={() => onChoose(tier.id, duration)}
        className={cn(
          "mt-6 w-full rounded-full px-6 py-3 text-base font-normal transition-opacity hover:opacity-90",
          highlight ? "bg-white text-black" : "bg-[#0071e3] text-white",
        )}
      >
        {t(tier.ctaKey)}
      </button>

      <ul className="mt-8 space-y-3 text-base font-normal">
        {inherited && (
          <li className={cn("text-xs font-medium", highlight ? "text-[#0071e3]" : "text-[#0071e3]")}>
            {t("pricing.everythingIn")} {t(inherited.nameKey)} {t("pricing.plus")}:
          </li>
        )}
        {(inherited ? ownFeatures : features).map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className={cn("mt-2 h-1 w-1 flex-shrink-0 rounded-full", highlight ? "bg-white opacity-60" : "bg-[#0071e3]")} />
            <span>{t(f)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTable({ duration }: { duration: Duration }) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";

  const rows: { label: string; render: (tier: TierId) => React.ReactNode }[] = [
    { label: t("cmp.nutrition"), render: () => <Check /> },
    { label: t("cmp.workout"), render: () => <Check /> },
    { label: t("cmp.progress"), render: () => <Check /> },
    {
      label: isAr ? "تبديلات يومية" : "Daily swaps",
      render: (tier) => {
        const limit = getTier(tier)?.swapLimit;
        return (
          <span className="text-sm font-normal">
            {limit === null ? (isAr ? "∞ غير محدود" : "∞ Unlimited") : `${limit}/${limit}`}
          </span>
        );
      },
    },
    { label: isAr ? "مساعد ذكي (EVO)" : "EVO AI Coach", render: () => <Check /> },
    { label: isAr ? "دعم الكوتش" : "Coach support", render: () => <Check /> },
    { label: isAr ? "أولوية VIP" : "VIP priority", render: (tier) => bool(tier === "elite") },
    { label: isAr ? "تبديلات غير محدودة" : "Unlimited swaps", render: (tier) => bool(tier === "elite") },
  ];

  function Check() {
    return <span className="text-[#0071e3]">✓</span>;
  }

  function bool(v: boolean) {
    return v ? <Check /> : <span className="text-[#6e6e73]">—</span>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#d2d2d7]">
            <th className="p-4 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
              {t("cmp.feature")}
            </th>
            {TIER_IDS.map((id) => (
              <th key={id} className="p-4 text-center text-base font-semibold">
                {t(getTier(id)!.nameKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#d2d2d7]/60">
              <td className="p-4 font-normal">{row.label}</td>
              {TIER_IDS.map((id) => (
                <td key={id} className="p-4 text-center">
                  {row.render(id)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-[#f5f5f7]">
            <td className="p-4 font-medium">
              {duration === 1 ? (isAr ? "سعر الشهر" : "Monthly") : (isAr ? "سعر السنة" : "Annual")}
            </td>
            {TIER_IDS.map((id) => {
              const tier = getTier(id)!;
              const price = duration === 1 ? tier.prices[1] : tier.prices[12];
              return (
                <td key={id} className="p-4 text-center">
                  <span className="text-lg font-semibold">${price}</span>
                  <span className="text-xs font-normal text-[#6e6e73]">
                    {duration === 1 ? (isAr ? "/شهر" : "/mo") : (isAr ? "/سنة" : "/yr")}
                  </span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
