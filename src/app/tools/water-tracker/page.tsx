"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { useMembershipTier } from "@/hooks/use-membership-tier";
import { SiteHeader } from "@/components/SiteHeader";
import { AdSenseAd } from "@/components/AdSenseAd";
import { OtherTools } from "@/components/OtherTools";
import { ShareButtons } from "@/components/ShareButtons";
import { LeadCaptureCard } from "@/components/LeadCaptureCard";
import { Bookmark, Download, Loader2, Check, Droplets, Plus, Minus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// ===== Types =====

type DayLog = {
  // ISO date "YYYY-MM-DD" → ml consumed that day
  [date: string]: number;
};

type GoalSettings = {
  goalMl: number;
  cupMl: number;
};

// ===== Helpers =====

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const STORAGE_KEY_LOG = "mh_water_log_v1";
const STORAGE_KEY_SETTINGS = "mh_water_settings_v1";

function loadLog(): DayLog {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LOG) || "{}");
  } catch {
    return {};
  }
}

function saveLog(log: DayLog) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(log));
}

function loadSettings(): GoalSettings {
  if (typeof window === "undefined") return { goalMl: 2500, cupMl: 250 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { goalMl: 2500, cupMl: 250 };
}

function saveSettings(s: GoalSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
}

/**
 * Calculate recommended water intake based on body weight.
 * Formula: 35 ml × body weight (kg) — common recommendation.
 * Cap to a sensible range [2000, 4500].
 */
function recommendedByWeight(weightKg: number): number {
  if (!weightKg || weightKg <= 0) return 2500;
  const ml = Math.round(weightKg * 35);
  return Math.max(2000, Math.min(4500, ml));
}

// ===== Main Component =====

export default function WaterTrackerPage() {
  const { lang } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const { tier } = useMembershipTier(profile);
  const isAr = lang === "ar";

  const [log, setLog] = useState<DayLog>({});
  const [settings, setSettings] = useState<GoalSettings>({
    goalMl: 2500,
    cupMl: 250,
  });
  const [weight, setWeight] = useState<string>("");
  const [savingToDb, setSavingToDb] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  // ===== Load from localStorage on mount =====
  useEffect(() => {
    setLog(loadLog());
    setSettings(loadSettings());
  }, []);

  // ===== Persist on change =====
  useEffect(() => {
    if (Object.keys(log).length > 0) saveLog(log);
  }, [log]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const today = todayKey();
  const consumedToday = log[today] || 0;
  const progressPct = Math.min(100, Math.round((consumedToday / settings.goalMl) * 100));
  const remaining = Math.max(0, settings.goalMl - consumedToday);

  // Last 7 days history (oldest first)
  const last7 = useMemo(() => {
    const days: Array<{ date: string; ml: number; label: string }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        date: key,
        ml: log[key] || 0,
        label: d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "short" }),
      });
    }
    return days;
  }, [log, isAr]);

  // ===== Actions =====
  const addCup = () => {
    setLog((prev) => ({
      ...prev,
      [today]: (prev[today] || 0) + settings.cupMl,
    }));
  };

  const removeCup = () => {
    setLog((prev) => ({
      ...prev,
      [today]: Math.max(0, (prev[today] || 0) - settings.cupMl),
    }));
  };

  const addCustom = (ml: number) => {
    if (ml <= 0) return;
    setLog((prev) => ({
      ...prev,
      [today]: (prev[today] || 0) + ml,
    }));
  };

  const resetToday = () => {
    setLog((prev) => ({ ...prev, [today]: 0 }));
    toast.success(isAr ? "تم التصفير" : "Reset to 0");
  };

  const applyWeightGoal = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      toast.error(isAr ? "اكتب وزنك صح" : "Enter valid weight");
      return;
    }
    const rec = recommendedByWeight(w);
    setSettings((s) => ({ ...s, goalMl: rec }));
    toast.success(
      isAr ? `هدفك الموصى به: ${rec} مل/يوم` : `Recommended goal: ${rec} ml/day`,
    );
  };

  // ===== Save to DB (Premium+ feature) =====
  const handleSaveToDb = async () => {
    if (!profile) {
      toast.error(isAr ? "سجّل الدخول للحفظ" : "Log in to save");
      navigate("auth", { mode: "login" });
      return;
    }
    // Water tracker DB save is a Premium+ feature — resolve tier via
    // the useMembershipTier hook (queries subscriptions table).
    const allowed = ["premium", "pro", "coaching"].includes(tier);
    if (!allowed) {
      toast.error(
        isAr
          ? "حفظ سجل الماء متاح للأعضاء Premium فأعلى"
          : "Water log save is Premium+ only",
      );
      navigate("memberships");
      return;
    }

    setSavingToDb(true);
    try {
      const res = await fetch("/api/tools/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_slug: "water-tracker",
          title: `Water: ${consumedToday}/${settings.goalMl} ml · ${today}`,
          result_data: {
            date: today,
            consumed_ml: consumedToday,
            goal_ml: settings.goalMl,
            cup_ml: settings.cupMl,
            last_7_days: last7,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Limit reached") {
          toast.error(
            isAr
              ? `وصلت حد الحفظ (${data.limit}). ترقّي عضويتك للمزيد.`
              : `Save limit reached (${data.limit}). Upgrade for more.`,
          );
        } else {
          toast.error(data.error || (isAr ? "فشل الحفظ" : "Failed to save"));
        }
        return;
      }
      setSavedToDb(true);
      toast.success(isAr ? "تم حفظ السجل ✅" : "Saved ✅");
      setTimeout(() => setSavedToDb(false), 3000);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : (isAr ? "فشل الحفظ" : "Failed to save"),
      );
    } finally {
      setSavingToDb(false);
    }
  };

  const handleDownloadJson = () => {
    const exportData = {
      tool: "water-tracker",
      date: new Date().toISOString(),
      settings,
      today: { date: today, consumed_ml: consumedToday, goal_ml: settings.goalMl },
      last_7_days: last7,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `water-log-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isAr ? "تم التحميل" : "Downloaded");
  };

  // SVG ring math
  const R = 90;
  const C = 2 * Math.PI * R;
  const dashOffset = C - (progressPct / 100) * C;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "متتبع شرب الماء" : "Water Tracker"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[var(--muted-foreground)] md:text-lg">
            {isAr
              ? "حدد هدفك اليومي وسجّل كوبساتك. السجل بيتخزن محلياً على جهازك."
              : "Set your daily goal and log your cups. Your log is stored locally on your device."}
          </p>
        </div>

        {/* Progress ring */}
        <div className="mt-10 flex flex-col items-center">
          <div className="relative h-[220px] w-[220px]">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke="#e5e5ea"
                strokeWidth="14"
              />
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke="#0071e3"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Droplets className="h-7 w-7 text-[var(--muted-2)]" />
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {consumedToday}
                <span className="text-sm font-normal text-[var(--muted-foreground)]"> / {settings.goalMl}</span>
              </p>
              <p className="text-xs font-normal text-[var(--muted-foreground)]">ml</p>
              <p className="mt-2 text-xs font-medium text-[var(--muted-2)]">
                {progressPct}%
              </p>
            </div>
          </div>

          {consumedToday >= settings.goalMl ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--success)]/10 px-4 py-2 text-sm font-medium text-[var(--success)]">
              <Check className="h-4 w-4" />
              {isAr ? "وصلت هدفك اليوم! 🎉" : "Goal reached today! 🎉"}
            </div>
          ) : (
            <p className="mt-4 text-sm font-normal text-[var(--muted-foreground)]">
              {isAr
                ? `فاضل ${remaining} مل`
                : `${remaining} ml to go`}
            </p>
          )}
        </div>

        {/* Quick add buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={removeCup}
            className="grid h-12 w-12 place-items-center rounded-full border border-[var(--edge)] bg-[var(--bg)] text-[var(--text)] transition-colors hover:bg-[var(--tint)]"
            title={isAr ? `نقص كوب (${settings.cupMl}مل)` : `Remove cup (${settings.cupMl}ml)`}
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={addCup}
            className="btn-chrome inline-flex items-center gap-2 px-6 py-3 text-base font-medium"
          >
            <Plus className="h-5 w-5" />
            {isAr ? `كوب (${settings.cupMl}مل)` : `+ Cup (${settings.cupMl}ml)`}
          </button>
          <button
            onClick={resetToday}
            className="grid h-12 w-12 place-items-center rounded-full border border-[var(--edge)] bg-[var(--card)] text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/5"
            title={isAr ? "تصفير اليوم" : "Reset today"}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        {/* Custom amount */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-normal text-[var(--muted-foreground)]">
            {isAr ? "إضافة سريعة:" : "Quick add:"}
          </span>
          {[100, 200, 350, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => addCustom(ml)}
              className="rounded-full bg-[var(--tint)] px-3 py-1 text-xs font-medium text-[var(--muted-2)] transition-colors hover:opacity-80"
            >
              +{ml}ml
            </button>
          ))}
        </div>

        {/* Settings */}
        <div className="mt-10 rounded-3xl bg-[var(--tint)] p-6 md:p-8">
          <h3 className="text-lg font-semibold tracking-tight">
            {isAr ? "الإعدادات" : "Settings"}
          </h3>

          {/* Goal */}
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium">
              {isAr ? "الهدف اليومي (مل)" : "Daily goal (ml)"}
            </label>
            <input
              type="number"
              value={settings.goalMl}
              onChange={(e) =>
                setSettings((s) => ({ ...s, goalMl: parseInt(e.target.value) || 0 }))
              }
              className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]"
              dir="ltr"
            />
          </div>

          {/* Cup size */}
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium">
              {isAr ? "حجم الكوب (مل)" : "Cup size (ml)"}
            </label>
            <input
              type="number"
              value={settings.cupMl}
              onChange={(e) =>
                setSettings((s) => ({ ...s, cupMl: parseInt(e.target.value) || 0 }))
              }
              className="w-full rounded-full border border-[var(--edge)] bg-[var(--card)] px-4 py-2.5 text-base font-normal outline-none focus:border-[var(--chrome-edge)]"
              dir="ltr"
            />
          </div>

          {/* Recommend from weight */}
          <div className="marble-card mt-4 p-4">
            <p className="text-sm font-medium">
              {isAr ? "احسب الهدف من وزنك" : "Calculate goal from weight"}
            </p>
            <p className="mt-1 text-xs font-normal text-[var(--muted-foreground)]">
              {isAr
                ? "المعادلة: 35 مل × وزنك (كجم)."
                : "Formula: 35 ml × your weight (kg)."}
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={isAr ? "وزنك (كجم)" : "Weight (kg)"}
                className="flex-1 rounded-full border border-[var(--edge)] bg-[var(--tint)] px-4 py-2.5 text-sm font-normal outline-none focus:border-[var(--chrome-edge)]"
                dir="ltr"
              />
              <button
                onClick={applyWeightGoal}
                className="btn-chrome rounded-full px-5 py-2.5 text-sm"
              >
                {isAr ? "احسب" : "Calculate"}
              </button>
            </div>
          </div>
        </div>

        {/* Last 7 days history */}
        <div className="mt-6 rounded-[var(--radius-chrome)] bg-black p-6 text-white md:p-8">
          <h3 className="text-lg font-semibold tracking-tight">
            {isAr ? "آخر 7 أيام" : "Last 7 Days"}
          </h3>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {last7.map((d, i) => {
              const pct = Math.min(100, Math.round((d.ml / settings.goalMl) * 100));
              const isToday = i === last7.length - 1;
              return (
                <div key={d.date} className="text-center">
                  <div className="relative mx-auto h-20 w-full max-w-[40px] overflow-hidden rounded-xl bg-white/10">
                    <div
                      className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                      style={{
                        height: `${pct}%`,
                        background: pct >= 100 ? "#34c759" : "#0071e3",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-gray-400">
                    {d.label}
                  </p>
                  <p className="text-[10px] font-normal text-gray-500">
                    {d.ml}
                  </p>
                  {isToday && (
                    <p className="text-[9px] font-medium text-[#9BA0A6]">
                      {isAr ? "اليوم" : "today"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save + Download */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={handleSaveToDb}
            disabled={savingToDb || savedToDb}
            className="btn-chrome inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {savingToDb ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedToDb ? (
              <Check className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {savedToDb
              ? isAr ? "تم الحفظ" : "Saved"
              : isAr ? "حفظ السجل" : "Save log"}
          </button>
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--edge)] bg-[var(--card)] px-5 py-2.5 text-sm font-normal text-[var(--text)] transition-colors hover:bg-[var(--tint)]"
          >
            <Download className="h-4 w-4" />
            {isAr ? "تحميل JSON" : "JSON"}
          </button>
        </div>

        {/* Lead Capture — Phase 72: email the logged results (owner request) */}
        <div className="mt-6">
          <LeadCaptureCard
            toolSlug="water-tracker"
            resultSummary={
              isAr
                ? `هدف الماء: ${settings.goalMl} مل · المسجل اليوم: ${consumedToday} مل (${progressPct}%)`
                : `Water goal: ${settings.goalMl} ml · Logged today: ${consumedToday} ml (${progressPct}%)`
            }
            resultJson={{ goal_ml: settings.goalMl, consumed_today_ml: consumedToday, progress_pct: progressPct }}
          />
        </div>

        {/* Share */}
        <div className="mt-6 rounded-2xl bg-[var(--tint)] p-4">
          <ShareButtons
            title={
              isAr
                ? `سجلت ${consumedToday} مل ماء اليوم (${progressPct}% من هدفي) | Alkemos`
                : `Logged ${consumedToday} ml water today (${progressPct}% of my goal) | Alkemos`
            }
          />
        </div>

        {/* AdSense */}
        <AdSenseAd format="auto" />
        <OtherTools current="water-tracker" />

        {/* SEO content */}
        <div className="mt-12 space-y-4 text-base font-normal leading-relaxed text-[var(--muted-foreground)]">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
            {isAr ? "ليه لازم تشرب ماء كفاية؟" : "Why drink enough water?"}
          </h2>
          <p>
            {isAr
              ? "الماء بيأثر على كل وظيفة في جسمك: تنظيم الحرارة، نقل العناصر الغذائية، تزييت المفاصل، وحماية الأنسجة. الجفاف الخفيف (1-2%) بيقلل التركيز والطاقة والأداء الرياضي."
              : "Water affects every function in your body: temperature regulation, nutrient transport, joint lubrication, and tissue protection. Even mild dehydration (1-2%) reduces focus, energy, and athletic performance."}
          </p>
          <p>
            {isAr
              ? "القاعدة العامة: 35 مل لكل كجم من وزنك. الرياضيون محتاجين أكتر بسبب العرق. لو بتشرب قهوة أو شاي كحلو، زود استهلاك الماء. خزن السجل يومياً عشان تتابع نمطك خلال الأسبوع."
              : "General rule: 35 ml per kg of body weight. Athletes need more due to sweat. If you drink coffee or sweet tea, increase water intake. Log daily to track your weekly pattern."}
          </p>
        </div>
      </main>
    </div>
  );
}
