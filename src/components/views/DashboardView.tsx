"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { MyCoachCard } from "@/components/MyCoachCard";
import { listProgress, listPlans, listSubscriptionsForClient } from "@/lib/data";
import type { ProgressEntry, Plan, Subscription } from "@/lib/supabase/types";
import { supabase, isSupabaseConfigured } from "@/lib/data/helpers";
import { coachPaymentMethodLabel } from "@/lib/coach-limits";
import { getTier, type TierId } from "@/lib/plans";
import { MEMBERSHIPS } from "@/lib/memberships";

export function DashboardView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const isAr = lang === "ar";
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allSubs, setAllSubs] = useState<Subscription[]>([]);
  // 0034: coach-activated receipts — subscription_id → payment row. The
  // client sees «مفعّلة بواسطة مدربك» on subscriptions his coach activated
  // after collecting payment outside the site.
  type CoachPayRow = {
    subscription_id: string | null;
    amount: number | null;
    currency: string;
    method: string;
    note: string | null;
    created_at: string;
  };
  const [coachPays, setCoachPays] = useState<Record<string, CoachPayRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [p, pl, subs] = await Promise.all([
          listProgress(profile.id),
          listPlans(profile.id),
          listSubscriptionsForClient(profile.id),
        ]);
        setProgress(p);
        setPlans(pl);
        setAllSubs(subs);
        // Coach-payment receipts (RLS: client reads only his own rows).
        if (isSupabaseConfigured && supabase && subs.length > 0) {
          const { data: pays } = await supabase
            .from("coach_payments")
            .select("subscription_id, amount, currency, method, note, created_at")
            .eq("client_id", profile.id);
          const map: Record<string, CoachPayRow> = {};
          for (const row of (pays as CoachPayRow[] | null) ?? []) {
            if (row?.subscription_id) map[row.subscription_id] = row;
          }
          setCoachPays(map);
        }
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
  // Show ALL subscriptions (coaching + memberships separately)
  const membershipSubs = allSubs.filter((s) => ["premium", "pro"].includes(s.tier));
  const coachingSub = allSubs.find((s) => s.tier === "coaching");
  const sub = membershipSubs[0] || coachingSub || null;
  const daysLeft = sub?.end_date
    ? Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 864e5))
    : null;
  const tierName = (tier: string) => {
    const m = MEMBERSHIPS.find((x) => x.id === tier);
    if (m) return isAr ? m.nameAr : m.nameEn;
    const legacy = getTier(tier as TierId);
    if (legacy) return t(legacy.nameKey);
    return tier;
  };

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

      {/* MULTI-COACH 2B: the client's assigned coach (hidden until assigned) */}
      <MyCoachCard />

      {/* Stat cards — Apple-style minimal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Subscription — show ALL active subscriptions */}
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
              {t("dash.subscription")}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {allSubs.length > 0 ? (
              allSubs.map((s) => {
                const days = s.end_date
                  ? Math.max(0, Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 864e5))
                  : null;
                const pay = coachPays[s.id];
                return (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                        s.tier === "premium" ? "bg-[#0071e3]/10 text-[#0071e3]"
                        : s.tier === "pro" ? "bg-[#1d1d1f]/10 text-[#1d1d1f]"
                        : s.tier === "coaching" ? "bg-[#8b5cf6]/10 text-[#8b5cf6]"
                        : "bg-[#6e6e73]/10 text-[#6e6e73]"
                      }`}>
                        {tierName(s.tier)}
                      </span>
                      {days !== null && (
                        <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                          {days} {isAr ? "يوم متبقي" : "days left"}
                        </p>
                      )}
                      {pay && (
                        <p className="mt-0.5 text-[10px] font-medium text-[#34c759]">
                          {isAr ? "مفعّلة بواسطة مدربك" : "Activated by your coach"}
                          {pay.method ? ` · ${coachPaymentMethodLabel(pay.method, isAr ? "ar" : "en")}` : ""}
                          {pay.amount != null ? ` · ${Number(pay.amount).toLocaleString()} ${pay.currency || "USD"}` : ""}
                        </p>
                      )}
                    </div>
                    {s.end_date && (
                      <p className="text-[10px] text-[#6e6e73]">
                        {new Date(s.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <>
                <p className="text-lg font-semibold">{t("dash.notSet")}</p>
                <button
                  onClick={() => navigate("memberships")}
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
                    weightChange < 0 ? "text-[#34c759]" : "text-[#ff9500]"
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
