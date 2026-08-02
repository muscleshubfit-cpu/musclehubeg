"use client";

import { useState } from "react";
import { Check, Crown, ArrowRight, Dumbbell, Star } from "lucide-react";
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
  RESPONSE_TIME_KEY,
  type Duration,
  type TierId,
} from "@/lib/plans";

export function PricingView() {
  const { t } = useI18n();
  const { navigate } = useNav();
  const [duration, setDuration] = useState<Duration>(6);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button className="flex items-center gap-2" onClick={() => navigate("landing")}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-gold shadow-glow">
            <Dumbbell className="h-5 w-5 text-gold-foreground" />
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
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            <Crown className="h-3.5 w-3.5" />
            {t("pricing.eyebrow")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
            {t("pricing.heading")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground md:text-base">
            {t("pricing.intro")}
          </p>

          <div className="mx-auto mt-8 inline-flex rounded-full border border-border glass p-1">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                  duration === d
                    ? "bg-gradient-gold text-gold-foreground shadow-gold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d} {t("pricing.months")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <PlanCard key={tier.id} tierId={tier.id} duration={duration} onChoose={(tierId, months) => navigate("checkout", { tier: tierId, months })} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-bold">{t("cmp.title")}</h2>
        <ComparisonTable />
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
  const perMonth = Math.round(price / duration);

  const highlight = tier.popular || tier.best;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border p-6 shadow-card",
        tier.best
          ? "border-gold/50 glass-gold animate-gold-pulse"
          : tier.popular
            ? "border-gold/35 glass"
            : "border-border bg-card",
      )}
    >
      {highlight && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
            tier.best
              ? "bg-gradient-gold text-gold-foreground shadow-gold"
              : "bg-gold/15 text-gold",
          )}
        >
          {tier.best ? t("pricing.bestExperience") : t("pricing.mostPopular")}
        </span>
      )}

      <div className="flex items-center gap-2">
        {tier.best ? (
          <Crown className="h-5 w-5 text-gold" />
        ) : tier.popular ? (
          <Star className="h-5 w-5 text-gold" />
        ) : null}
        <h3 className="font-display text-xl font-bold">{t(tier.nameKey)}</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t(tier.subKey)}</p>

      <div className="mt-5">
        <div className="flex items-end gap-1">
          <span className="font-display text-3xl font-extrabold text-gradient">{formatEgp(price)}</span>
          <span className="mb-1 text-sm text-muted-foreground">{t("pricing.egp")}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          ≈ {formatEgp(perMonth)} {t("pricing.egp")}{t("pricing.perMonth")} · {duration} {t("pricing.months")}
        </p>
      </div>

      <Button
        className={cn(
          "mt-5 gap-2",
          highlight ? "bg-gradient-gold text-gold-foreground shadow-gold hover:opacity-90" : "",
        )}
        variant={highlight ? "default" : "secondary"}
        onClick={() => onChoose(tier.id, duration)}
      >
        {t(tier.ctaKey)}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Button>

      <div className="mt-6 space-y-2.5 text-sm">
        {inherited && (
          <p className="text-xs font-semibold text-gold">
            {t("pricing.everythingIn")} {t(inherited.nameKey)} {t("pricing.plus")}:
          </p>
        )}
        {(inherited ? ownFeatures : features).map((f) => (
          <div key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>{t(f)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable() {
  const { t } = useI18n();

  const rows: { label: string; render: (tier: TierId) => React.ReactNode }[] = [
    { label: t("cmp.nutrition"), render: () => <Check className="mx-auto h-4 w-4 text-gold" /> },
    { label: t("cmp.workout"), render: () => <Check className="mx-auto h-4 w-4 text-gold" /> },
    { label: t("cmp.progress"), render: () => <Check className="mx-auto h-4 w-4 text-gold" /> },
    {
      label: t("cmp.responseTime"),
      render: (tier) => <span className="text-xs font-medium">{t(RESPONSE_TIME_KEY[tier])}</span>,
    },
    {
      label: t("cmp.fasterAdjust"),
      render: (tier) => bool(tier !== "essential"),
    },
    {
      label: t("cmp.premiumCoaching"),
      render: (tier) => bool(tier === "professional" || tier === "elite"),
    },
    {
      label: t("cmp.vipPriority"),
      render: (tier) => bool(tier === "elite"),
    },
  ];

  function bool(v: boolean) {
    return v ? (
      <Check className="mx-auto h-4 w-4 text-gold" />
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
        </tbody>
      </table>
    </div>
  );
}
