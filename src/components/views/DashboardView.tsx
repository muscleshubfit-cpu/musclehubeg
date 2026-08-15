"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { listProgress, listPlans, getSubscriptionForClient } from "@/lib/data";
import { getTier } from "@/lib/plans";
import { Reveal, PageFade } from "@/components/motion";

export function DashboardView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const isAr = lang === "ar";
  const [progress, setProgress] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [p, pl, s] = await Promise.all([
          listProgress(profile.id),
          listPlans(profile.id),
          getSubscriptionForClient(profile.id),
        ]);
        setProgress(p);
        setPlans(pl);
        setSub(s);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  const latest = progress[progress.length - 1];
  const first = progress[0];
  const weightChange = latest?.weight && first?.weight ? latest.weight - first.weight : null;
  const daysLeft = sub?.end_date
    ? Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 864e5))
    : null;
  const tierName = sub?.tier ? getTier(sub.tier as any)?.nameKey : null;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t("dash.greeting")}, {profile?.full_name || t("common.welcome")}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {t("dash.statsOverview")}
        </p>
      </div>

      {/* Stat cards — Apple-style minimal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Subscription */}
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
              {t("dash.subscription")}
            </span>
            {tierName && (
              <span className="rounded-full bg-[#0071e3] px-2.5 py-0.5 text-[10px] font-normal text-white">
                {t(tierName)}
              </span>
            )}
          </div>
          <div className="mt-4">
            {sub ? (
              <>
                <p className="text-3xl font-semibold tracking-tight">
                  {daysLeft}
                  <span className="ml-1 text-base font-normal text-[#6e6e73]">{t("dash.daysLeft")}</span>
                </p>
                <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                  {t("dash.expiresOn")} {new Date(sub.end_date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">{t("dash.notSet")}</p>
                <button
                  onClick={() => navigate("pricing")}
                  className="mt-3 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-normal text-white transition-opacity hover:opacity-90"
                >
                  {t("pricing.cta")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Weight */}
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <span className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
            {t("dash.latestWeight")}
          </span>
          {latest?.weight ? (
            <>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {latest.weight}
                <span className="ml-1 text-base font-normal text-[#6e6e73]">{t("common.kg")}</span>
              </p>
              {weightChange !== null && weightChange !== 0 && (
                <p
                  className={`mt-1 text-xs font-normal ${
                    weightChange < 0 ? "text-[#0071e3]" : "text-[#6e6e73]"
                  }`}
                >
                  {weightChange < 0 ? "↓" : "↑"} {Math.abs(weightChange).toFixed(1)} {t("common.kg")}{" "}
                  {t("dash.change")}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm font-normal text-[#6e6e73]">{t("dash.noWeight")}</p>
          )}
        </div>

        {/* Meal plans */}
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <span className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
            {t("dash.mealPlans")}
          </span>
          <p className="mt-4 text-3xl font-semibold tracking-tight">
            {plans.filter((p) => p.type === "meal").length}
          </p>
          <button
            onClick={() => navigate("plans")}
            className="mt-2 text-xs font-normal text-[#0071e3] transition-opacity hover:opacity-70"
          >
            {t("dash.viewPlans")} ›
          </button>
        </div>

        {/* Workout plans */}
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <span className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
            {t("dash.workoutPlans")}
          </span>
          <p className="mt-4 text-3xl font-semibold tracking-tight">
            {plans.filter((p) => p.type === "workout").length}
          </p>
          <button
            onClick={() => navigate("plans")}
            className="mt-2 text-xs font-normal text-[#0071e3] transition-opacity hover:opacity-70"
          >
            {t("dash.viewPlans")} ›
          </button>
        </div>
      </div>

      {/* Quick actions — Apple-style text links */}
      <div>
        <h2 className="mb-6 text-xl font-semibold tracking-tight md:text-2xl">
          {t("dash.quickActions")}
        </h2>
        <div className="divide-y divide-[#d2d2d7] rounded-2xl bg-[#f5f5f7]">
          {[
            { label: t("dash.logProgress"), to: "progress" as const },
            { label: t("dash.fillQuestionnaires"), to: "questionnaires" as const },
            { label: t("dash.viewPlans"), to: "plans" as const },
          ].map((action) => (
            <button
              key={action.to}
              onClick={() => navigate(action.to)}
              className="flex w-full items-center justify-between px-6 py-5 text-start transition-colors hover:bg-[#ececf0]"
            >
              <span className="text-base font-normal md:text-lg">{action.label}</span>
              <span className="text-[#6e6e73]">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
