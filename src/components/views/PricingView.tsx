"use client";

import { useState } from "react";
import { Check, Crown, ArrowRight, Dumbbell, Star, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
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
  const { t } = useI18n();
  const { navigate } = useNav();
  const [duration, setDuration] = useState<Duration>(12);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button className="flex items-center gap-2" onClick={() => navigate("landing")}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">{t("brand.name")}</span>
        </button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate("auth", { mode: "login" })}>
            {t("landing.hero.login")}
          </Button>
        </div>
      </header>

      <section className="bg-hero-glow">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <Crown className="h-3.5 w-3.5" />
            {t("pricing.eyebrow")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
            {t("pricing.heading")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground md:text-base">
            {t("pricing.intro")}
          </p>

          {/* Duration toggle: 1 month / 12 months */}
          <div className="mx-auto mt-8 inline-flex rounded-full border border-border glass p-1">
            <button
              onClick={() => setDuration(1)}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-semibold transition-all",
                duration === 1
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              شهر واحد
            </button>
            <button
              onClick={() => setDuration(12)}
              className={cn(
                "relative rounded-full px-6 py-2 text-sm font-semibold transition-all",
                duration === 12
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              12 شهر
              <span className="absolute -top-2 -end-2 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                شهرين مجاناً
              </span>
            </button>
          </div>

          {duration === 12 && (
            <p className="mt-4 text-xs text-success">
              💡 وفّر حتى 17% مع خطة 12 شهر — تحصل على شهرين مجاناً!
            </p>
          )}
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 lg:grid-cols-2">
          {TIERS.map((tier) => (
            <PlanCard key={tier.id} tierId={tier.id} duration={duration} onChoose={(tierId, months) => navigate("checkout", { tier: tierId, months })} />
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-bold">{t("cmp.title")}</h2>
        <ComparisonTable duration={duration} />
      </section>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
      </footer>
    </div>
  );
}

function PlanCard({ tierId, duration, onChoose }: { tierId: TierId; duration: Duration; onChoose: (tierId: TierId, months: Duration) => void }) {
  const { t } = useI18n();
  const tier = getTier(tierId)!;
  const features = allFeatureKeys(tierId);
  const inherited = tier.inheritsFrom ? getTier(tier.inheritsFrom) : undefined;
  const ownFeatures = tier.featureKeys;
  const price = tier.prices[duration];
  const savings = savingsFor(tierId);

  const highlight = tier.popular || tier.best;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border p-6 shadow-card",
        tier.best
          ? "border-primary/50 glass-gold animate-gold-pulse"
          : tier.popular
            ? "border-primary/35 glass"
            : "border-border bg-card",
      )}
    >
      {highlight && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
            tier.best
              ? "bg-gradient-primary text-primary-foreground shadow-glow"
              : "bg-primary/15 text-primary",
          )}
        >
          {tier.best ? t("pricing.bestExperience") : t("pricing.mostPopular")}
        </span>
      )}

      <div className="flex items-center gap-2">
        {tier.best ? (
          <Crown className="h-5 w-5 text-primary" />
        ) : tier.popular ? (
          <Star className="h-5 w-5 text-primary" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary" />
        )}
        <h3 className="font-display text-xl font-bold">{t(tier.nameKey)}</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t(tier.subKey)}</p>

      <div className="mt-5">
        <div className="flex items-end gap-1">
          <span className="font-display text-4xl font-extrabold text-gradient">${price}</span>
          <span className="mb-1.5 text-sm text-muted-foreground">{duration === 1 ? "/شهر" : "/سنة"}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          ≈ {duration === 1 ? price * 50 : price * 50} ج.م{duration === 1 ? "/شهر" : "/سنة"}
        </p>
        {duration === 12 && savings && (
          <p className="mt-1 text-xs text-success">
            وفّر ${savings.amount} ({savings.percent}%) — شهرين مجاناً!
          </p>
        )}
        {duration === 1 && (
          <p className="mt-1 text-xs text-muted-foreground">او ${tier.prices[12]}/سنة (وفّر {Math.round((1 - tier.prices[12] / (tier.prices[1] * 12)) * 100)}%)</p>
        )}
      </div>

      {/* Swap limit highlight */}
      <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-center">
        <div className="text-xs text-muted-foreground">تبديلات يومية</div>
        <div className="font-display text-lg font-bold text-primary">
          {tier.swapLimit === null ? "∞ غير محدود" : `${tier.swapLimit} وجبة + ${tier.swapLimit} تمرين`}
        </div>
      </div>

      <Button
        className={cn(
          "mt-5 gap-2",
          highlight ? "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" : "",
        )}
        variant={highlight ? "default" : "secondary"}
        onClick={() => onChoose(tier.id, duration)}
      >
        {t(tier.ctaKey)}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Button>

      <div className="mt-6 space-y-2.5 text-sm">
        {inherited && (
          <p className="text-xs font-semibold text-primary">
            {t("pricing.everythingIn")} {t(inherited.nameKey)} {t("pricing.plus")}:
          </p>
        )}
        {(inherited ? ownFeatures : features).map((f) => (
          <div key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{t(f)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ duration }: { duration: Duration }) {
  const { t } = useI18n();

  const rows: { label: string; render: (tier: TierId) => React.ReactNode }[] = [
    { label: t("cmp.nutrition"), render: () => <Check className="mx-auto h-4 w-4 text-primary" /> },
    { label: t("cmp.workout"), render: () => <Check className="mx-auto h-4 w-4 text-primary" /> },
    { label: t("cmp.progress"), render: () => <Check className="mx-auto h-4 w-4 text-primary" /> },
    { label: "تبديلات يومية", render: (tier) => {
      const limit = getTier(tier)?.swapLimit;
      return <span className="text-xs font-medium">{limit === null ? "∞ غير محدود" : `${limit}/${limit}`}</span>;
    }},
    { label: "مساعد ذكي (EVO)", render: () => <Check className="mx-auto h-4 w-4 text-primary" /> },
    { label: "دعم الكوتش", render: () => <Check className="mx-auto h-4 w-4 text-primary" /> },
    { label: "أولوية VIP", render: (tier) => bool(tier === "elite") },
    { label: "تبديلات غير محدودة", render: (tier) => bool(tier === "elite") },
  ];

  function bool(v: boolean) {
    return v ? (
      <Check className="mx-auto h-4 w-4 text-primary" />
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-4 text-start font-medium text-muted-foreground">{t("cmp.feature")}</th>
            {TIER_IDS.map((id) => (
              <th key={id} className="p-4 text-center font-semibold">
                {t(getTier(id)!.nameKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60">
              <td className="p-4 font-medium">{row.label}</td>
              {TIER_IDS.map((id) => (
                <td key={id} className="p-4 text-center">
                  {row.render(id)}
                </td>
              ))}
            </tr>
          ))}
          {/* Price row */}
          <tr className="border-b border-border/60 bg-secondary/20">
            <td className="p-4 font-medium">{duration === 1 ? "سعر الشهر" : "سعر السنة"}</td>
            {TIER_IDS.map((id) => {
              const tier = getTier(id)!;
              const price = duration === 1 ? tier.prices[1] : tier.prices[12];
              return (
                <td key={id} className="p-4 text-center">
                  <span className="font-display text-lg font-bold text-gradient">
                    ${price}
                  </span>
                  <span className="text-xs text-muted-foreground">{duration === 1 ? "/شهر" : "/سنة"}</span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
