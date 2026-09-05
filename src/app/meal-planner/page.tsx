"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { SiteHeader } from "@/components/SiteHeader";
import { AdSenseAd } from "@/components/AdSenseAd";
import { OtherTools } from "@/components/OtherTools";
import { ShareButtons } from "@/components/ShareButtons";
import { LeadCaptureCard } from "@/components/LeadCaptureCard";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  Bookmark,
  Check,
  Download,
  X,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { getLimits, type MembershipTier } from "@/lib/memberships";
import { getSubscriptionForClient } from "@/lib/data";

// ===== Types =====

type Per100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealItem = {
  id: string;
  name: string;
  source: "local" | "openfoodfacts";
  grams: number;
  per100g: Per100g;
};

type Meal = {
  id: string;
  name: string;
  items: MealItem[];
};

type SearchResult = {
  name: string;
  source: "local" | "openfoodfacts";
  per100g: Per100g;
};

// ===== Helpers =====

const newId = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const computeMacros = (item: MealItem) => {
  const factor = (item.grams || 0) / 100;
  return {
    calories: Math.round(item.per100g.calories * factor),
    protein: Math.round(item.per100g.protein * factor),
    carbs: Math.round(item.per100g.carbs * factor),
    fat: Math.round(item.per100g.fat * factor),
  };
};

const MEAL_NAME_PRESETS_AR = ["فطار", "غداء", "عشاء", "سناك", "قبل التمرين", "بعد التمرين"];
const MEAL_NAME_PRESETS_EN = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout", "Post-workout"];

// ===== Main Component =====

export default function MealPlannerPage() {
  const { lang } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  // Resolve tier + limits
  const [tier, setTier] = useState<MembershipTier>("free");
  const limits = getLimits(tier);
  const maxMeals = limits.mealPlannerMaxMeals;
  const maxSaved = limits.mealPlannerMaxSaved;

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== "client") {
      setTier("coaching");
      return;
    }
    getSubscriptionForClient(profile.id).then((sub: { tier?: string | null } | null) => {
      if (sub?.tier && ["free", "premium", "pro", "coaching"].includes(sub.tier)) {
        setTier(sub.tier as MembershipTier);
      }
    });
  }, [profile]);

  // M43 fix: persist meal planner draft to localStorage so it survives refreshes.
  const DRAFT_KEY = "mhe:meal-planner-draft";

  // Meals state — start with 1 empty meal OR restore from localStorage
  const [meals, setMeals] = useState<Meal[]>(() => {
    if (typeof window === "undefined") {
      return [{ id: newId(), name: isAr ? "الفطار" : "Breakfast", items: [] }];
    }
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.meals && Array.isArray(parsed.meals) && parsed.meals.length > 0) {
          return parsed.meals;
        }
      }
    } catch {}
    return [{ id: newId(), name: isAr ? "الفطار" : "Breakfast", items: [] }];
  });
  const [planTitle, setPlanTitle] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.planTitle) return parsed.planTitle;
      }
    } catch {}
    return "";
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Debounced save to localStorage
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ meals, planTitle }));
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [meals, planTitle]);

  // Add a new meal (respect maxMeals limit)
  const addMeal = () => {
    if (maxMeals !== null && meals.length >= maxMeals) {
      toast.error(
        isAr
          ? `حدك الأقصى ${maxMeals} وجبات`
          : `Max ${maxMeals} meals for your tier`,
      );
      return;
    }
    const idx = meals.length;
    const preset = (isAr ? MEAL_NAME_PRESETS_AR : MEAL_NAME_PRESETS_EN)[idx] ||
      (isAr ? `وجبة ${idx + 1}` : `Meal ${idx + 1}`);
    setMeals([...meals, { id: newId(), name: preset, items: [] }]);
  };

  const removeMeal = (mealId: string) => {
    setMeals(meals.filter((m) => m.id !== mealId));
  };

  const renameMeal = (mealId: string, name: string) => {
    setMeals(meals.map((m) => (m.id === mealId ? { ...m, name } : m)));
  };

  const addItemToMeal = (mealId: string, item: MealItem) => {
    setMeals(
      meals.map((m) =>
        m.id === mealId ? { ...m, items: [...m.items, item] } : m,
      ),
    );
  };

  const removeItemFromMeal = (mealId: string, itemId: string) => {
    setMeals(
      meals.map((m) =>
        m.id === mealId
          ? { ...m, items: m.items.filter((i) => i.id !== itemId) }
          : m,
      ),
    );
  };

  const updateItemGrams = (mealId: string, itemId: string, grams: number) => {
    setMeals(
      meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map((i) =>
                i.id === itemId ? { ...i, grams } : i,
              ),
            }
          : m,
      ),
    );
  };

  // ===== Totals =====
  const mealTotals = meals.map((m) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    for (const item of m.items) {
      const mac = computeMacros(item);
      calories += mac.calories;
      protein += mac.protein;
      carbs += mac.carbs;
      fat += mac.fat;
    }
    return { calories, protein, carbs, fat };
  });

  const grandTotal = mealTotals.reduce(
    (acc, t) => ({
      calories: acc.calories + t.calories,
      protein: acc.protein + t.protein,
      carbs: acc.carbs + t.carbs,
      fat: acc.fat + t.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // ===== Save =====
  const handleSave = async () => {
    if (!profile) {
      toast.error(isAr ? "سجّل الدخول للحفظ" : "Log in to save");
      navigate("auth", { mode: "login" });
      return;
    }
    // Must have at least 1 meal with 1 item
    const hasItems = meals.some((m) => m.items.length > 0);
    if (!hasItems) {
      toast.error(isAr ? "أضف أكلة واحدة على الأقل" : "Add at least one food");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tools/save-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: planTitle || (isAr ? "خطة وجبات" : "Meal Plan"),
          plan_data: {
            meals: meals
              .filter((m) => m.items.length > 0)
              .map((m) => ({
                name: m.name,
                items: m.items.map((i) => ({
                  name: i.name,
                  source: i.source,
                  grams: i.grams,
                  per100g: i.per100g,
                })),
              })),
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
        } else if (data.error === "Too many meals") {
          toast.error(
            isAr
              ? `حدك ${data.limit} وجبات كحد أقصى`
              : `Max ${data.limit} meals for your tier`,
          );
        } else {
          toast.error(data.error || (isAr ? "فشل الحفظ" : "Failed to save"));
        }
        return;
      }
      setSaved(true);
      toast.success(isAr ? "تم حفظ الجدول ✅" : "Plan saved ✅");
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : (isAr ? "فشل الحفظ" : "Failed to save"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadJson = () => {
    // PHASE 69 — GATE: JSON export is a PREMIUM+ feature (mealPlannerExport)
    // and the refund policy counts exports as paid usage. The ungated button
    // contradicted both. Free users get the upgrade prompt instead.
    if (!limits.mealPlannerExport) {
      toast.error(
        isAr
          ? "التصدير متاح لباقات Premium و Pro — طوّق باقتك للمتابعة."
          : "Export is available on Premium and Pro — upgrade to continue.",
      );
      navigate("memberships");
      return;
    }
    const exportData = {
      tool: "meal-planner",
      title: planTitle || (isAr ? "خطة وجبات" : "Meal Plan"),
      date: new Date().toISOString(),
      totals: grandTotal,
      meals: meals.filter((m) => m.items.length > 0),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meal-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isAr ? "تم التحميل" : "Downloaded");
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "مخطط الوجبات" : "Meal Planner"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "ابني وجباتك من قاعدة بيانات ٨٨٣٠+ أكلة وشوف الماكروز لكل وجبة والإجمالي."
              : "Build your meals from 8,830+ foods and see per-meal + total macros."}
          </p>
          {/* Tier badge */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-1.5 text-xs font-medium">
            <Utensils className="h-3.5 w-3.5 text-[#0071e3]" />
            {isAr ? "عضويتك" : "Your plan"}: <span className="font-semibold">{tier}</span>
            {" · "}
            {maxMeals === null
              ? isAr ? "وجبات غير محدودة" : "unlimited meals"
              : isAr ? `${maxMeals} وجبات كحد أقصى` : `max ${maxMeals} meals`}
            {" · "}
            {maxSaved === null
              ? isAr ? "حفظ غير محدود" : "unlimited saves"
              : isAr ? `${maxSaved} حفظ` : `${maxSaved} saves`}
          </div>
        </div>

        {/* Plan title + actions */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <input
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            placeholder={isAr ? "اسم الجدول (اختياري)" : "Plan name (optional)"}
            className="flex-1 min-w-[200px] rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
          />
          <button
            onClick={addMeal}
            disabled={maxMeals !== null && meals.length >= maxMeals}
            className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isAr ? "وجبة جديدة" : "Add meal"}
          </button>
        </div>

        {/* Meals list */}
        <div className="mt-6 space-y-4">
          {meals.map((meal, idx) => (
            <MealCard
              key={meal.id}
              meal={meal}
              index={idx}
              totals={mealTotals[idx]}
              isAr={isAr}
              onRename={(name) => renameMeal(meal.id, name)}
              onRemove={() => removeMeal(meal.id)}
              canRemove={meals.length > 1}
              onAddItem={(item) => addItemToMeal(meal.id, item)}
              onRemoveItem={(itemId) => removeItemFromMeal(meal.id, itemId)}
              onUpdateGrams={(itemId, g) => updateItemGrams(meal.id, itemId, g)}
            />
          ))}
        </div>

        {/* Grand total */}
        <div className="mt-8 rounded-3xl bg-[#1d1d1f] p-6 md:p-8 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">
              {isAr ? "الإجمالي الكلي" : "Grand Total"}
            </h3>
            <span className="text-xs font-normal text-gray-400">
              {meals.length} {isAr ? "وجبة" : "meals"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={isAr ? "سعرات" : "Calories"} value={grandTotal.calories} unit="kcal" color="#ff9500" big />
            <Stat label={isAr ? "بروتين" : "Protein"} value={grandTotal.protein} unit="g" color="#34c759" big />
            <Stat label={isAr ? "كارب" : "Carbs"} value={grandTotal.carbs} unit="g" color="#0071e3" big />
            <Stat label={isAr ? "دهون" : "Fat"} value={grandTotal.fat} unit="g" color="#8b5cf6" big />
          </div>
        </div>

        {/* Save + Download */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {saved
              ? isAr ? "تم الحفظ" : "Saved"
              : isAr ? "حفظ الجدول" : "Save plan"}
          </button>
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Download className="h-4 w-4" />
            {isAr ? "تحميل JSON" : "JSON"}
          </button>
        </div>

        {/* Lead Capture — Phase 72: email the plan totals (owner request) */}
        <div className="mt-6">
          <LeadCaptureCard
            toolSlug="meal-planner"
            resultSummary={
              isAr
                ? `خطتي: ${meals.length} وجبات · ${grandTotal.calories} سعرة · بروتين ${grandTotal.protein}g · كارب ${grandTotal.carbs}g · دهون ${grandTotal.fat}g`
                : `My plan: ${meals.length} meals · ${grandTotal.calories} kcal · protein ${grandTotal.protein}g · carbs ${grandTotal.carbs}g · fat ${grandTotal.fat}g`
            }
            resultJson={{
              meals: meals.length,
              calories: grandTotal.calories,
              protein: grandTotal.protein,
              carbs: grandTotal.carbs,
              fat: grandTotal.fat,
            }}
          />
        </div>

        {/* Share */}
        <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-4">
          <ShareButtons
            title={
              isAr
                ? `مخطط وجباتي | ${grandTotal.calories} سعرة | Alkemos`
                : `My meal plan | ${grandTotal.calories} kcal | Alkemos`
            }
          />
        </div>

        {/* AdSense */}
        <AdSenseAd format="auto" />
        <OtherTools current="meal-planner" />

        {/* SEO content */}
        <div className="mt-12 space-y-4 text-base font-normal leading-relaxed text-[#6e6e73]">
          <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
            {isAr ? "إزاي تبني خطة وجبات؟" : "How to build a meal plan?"}
          </h2>
          <p>
            {isAr
              ? "مخطط الوجبات بيخليك تختار الأكلات من قاعدة بيانات ضخمة (٨٨٣٠+ أكلة محلية ومنتجات عالمية). بتكتب الجرام باليد والماكروز بتتحسب تلقائياً حسب المعادلة: السعرات = (سعرات ١٠٠جم ÷ ١٠٠) × الجرام. ده بيديك تحكم كامل بدل ما تعتمد على خطط جاهزة."
              : "The Meal Planner lets you pick foods from a large database (8,830+ local foods and global products). You enter the grams by hand and the macros are calculated automatically using: calories = (calories per 100g ÷ 100) × grams. This gives you full control instead of relying on pre-made plans."}
          </p>
          <p>
            {isAr
              ? "كل وجبة ليها إجمالي مستقل، والإجمالي الكلي بيجمع كل الوجبات. تقدر تحفظ الخطط حسب عضويتك: العضو المجاني يحفظ جدول واحد، البريميوم ١٠، والبرو ٥٠."
              : "Each meal has its own total, and the grand total sums all meals together. You can save plans based on your membership: Free saves 1 plan, Premium 10, Pro 50."}
          </p>
        </div>
      </main>
    </div>
  );
}

// ===== MealCard =====

function MealCard({
  meal,
  index,
  totals,
  isAr,
  onRename,
  onRemove,
  canRemove,
  onAddItem,
  onRemoveItem,
  onUpdateGrams,
}: {
  meal: Meal;
  index: number;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  isAr: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAddItem: (item: MealItem) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateGrams: (itemId: string, grams: number) => void;
}) {
  return (
    <div className="rounded-3xl bg-[#f5f5f7] p-5 md:p-6">
      {/* Meal header */}
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
          {index + 1}
        </div>
        <input
          value={meal.name}
          onChange={(e) => onRename(e.target.value)}
          className="flex-1 min-w-0 rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-medium outline-none focus:border-[#0071e3]"
          placeholder={isAr ? "اسم الوجبة" : "Meal name"}
        />
        {canRemove && (
          <button
            onClick={onRemove}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/5"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="mt-4 space-y-2">
        {meal.items.length === 0 ? (
          <p className="text-center py-6 text-sm text-[#6e6e73]">
            {isAr ? "مفيش أكلات بعد — ابحث وأضف" : "No foods yet — search and add"}
          </p>
        ) : (
          meal.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isAr={isAr}
              onRemove={() => onRemoveItem(item.id)}
              onUpdateGrams={(g) => onUpdateGrams(item.id, g)}
            />
          ))
        )}
      </div>

      {/* Add food search */}
      <FoodSearchInput isAr={isAr} onPick={(item) => onAddItem(item)} />

      {/* Meal totals */}
      {meal.items.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-white p-3">
          <MiniStat label={isAr ? "سعرات" : "Cal"} value={totals.calories} unit="kcal" color="#ff9500" />
          <MiniStat label={isAr ? "بروتين" : "Pro"} value={totals.protein} unit="g" color="#34c759" />
          <MiniStat label={isAr ? "كارب" : "Carb"} value={totals.carbs} unit="g" color="#0071e3" />
          <MiniStat label={isAr ? "دهون" : "Fat"} value={totals.fat} unit="g" color="#8b5cf6" />
        </div>
      )}
    </div>
  );
}

// ===== ItemRow =====

function ItemRow({
  item,
  isAr,
  onRemove,
  onUpdateGrams,
}: {
  item: MealItem;
  isAr: boolean;
  onRemove: () => void;
  onUpdateGrams: (grams: number) => void;
}) {
  const mac = computeMacros(item);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3">
      {/* Name */}
      <div className="flex-1 min-w-[140px]">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-xs text-[#6e6e73]">
          {item.source === "local"
            ? isAr ? "محلي" : "Local"
            : isAr ? "منتج" : "Product"}
          {" · "}
          {item.per100g.calories} kcal / 100g
        </p>
      </div>
      {/* Grams input */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={item.grams || ""}
          onChange={(e) => onUpdateGrams(Math.max(0, parseFloat(e.target.value) || 0))}
          placeholder="100"
          className="w-20 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-1.5 text-sm font-medium text-center outline-none focus:border-[#0071e3]"
          dir="ltr"
        />
        <span className="text-xs text-[#6e6e73]">g</span>
      </div>
      {/* Computed macros */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="rounded-full bg-[#ff9500]/10 px-2 py-0.5 font-medium text-[#ff9500]">
          {mac.calories} kcal
        </span>
        <span className="rounded-full bg-[#34c759]/10 px-2 py-0.5 font-medium text-[#34c759]">
          P{mac.protein}
        </span>
        <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 font-medium text-[#0071e3]">
          C{mac.carbs}
        </span>
        <span className="rounded-full bg-[#8b5cf6]/10 px-2 py-0.5 font-medium text-[#8b5cf6]">
          F{mac.fat}
        </span>
      </div>
      {/* Remove */}
      <button
        onClick={onRemove}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ===== FoodSearchInput =====

function FoodSearchInput({
  isAr,
  onPick,
}: {
  isAr: boolean;
  onPick: (item: MealItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/food-search?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setOpen(true);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (r: SearchResult) => {
    onPick({
      id: newId(),
      name: r.name,
      source: r.source,
      grams: 100,
      per100g: r.per100g,
    });
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative mt-3">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={isAr ? "بحث عن أكلة..." : "Search food..."}
          className="w-full rounded-full border border-[#d2d2d7] bg-white ps-10 pe-4 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
        />
        {loading && (
          <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#6e6e73]" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#d2d2d7] bg-white shadow-xl">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => pick(r)}
              className="flex w-full items-center justify-between gap-2 border-b border-[#f5f5f7] px-4 py-2.5 text-start transition-colors last:border-b-0 hover:bg-[#f5f5f7]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-[#6e6e73]">
                  {r.source === "local"
                    ? isAr ? "محلي" : "Local"
                    : isAr ? "منتج" : "Product"}
                  {" · "}
                  {r.per100g.calories} kcal · P{r.per100g.protein} C{r.per100g.carbs} F{r.per100g.fat}
                </p>
              </div>
              <Plus className="h-4 w-4 shrink-0 text-[#0071e3]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Stat components =====

function Stat({
  label,
  value,
  unit,
  color,
  big,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  big?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`${big ? "text-2xl md:text-3xl" : "text-xl"} font-semibold tracking-tight`}
        style={{ color }}
      >
        {value}
        <span className="ms-1 text-xs font-normal text-gray-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs font-normal text-gray-400">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold" style={{ color }}>
        {value}
        <span className="ms-0.5 text-[10px] font-normal text-[#6e6e73]">{unit}</span>
      </p>
      <p className="text-[10px] font-normal text-[#6e6e73]">{label}</p>
    </div>
  );
}
