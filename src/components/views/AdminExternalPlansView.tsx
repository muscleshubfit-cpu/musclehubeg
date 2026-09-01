"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/lib/supabase/types";
import { toast } from "sonner";
import {
  Dumbbell,
  Apple,
  Search,
  Download,
  Trash2,
  Pencil,
  Copy,
  Plus,
  X,
  Infinity as InfinityIcon,
  Loader2,
  Sparkles,
  RotateCcw,
  RefreshCcw,
  Repeat,
} from "lucide-react";

type ExternalPlanRow = Database["public"]["Tables"]["external_plans"]["Row"];

/** AI provenance stored in content.ai — powers «إعادة توليد» with the same brief. */
type AIPlanMeta = {
  source?: string;
  generated_at?: string;
  engine?: string;
  params?: Record<string, unknown> | null;
  regenerations?: number;
  last_action?: string;
  last_source?: string;
  last_at?: string;
};

type ExternalPlan = Omit<ExternalPlanRow, "content"> & {
  text: string;
  plan?: Record<string, any> | null;
  ai?: AIPlanMeta | null;
};

/* ── Owner Phase 78: AI generation brief — same model as client plans ── */

const DIET_TYPES: { value: string; en: string }[] = [
  { value: "متوازن", en: "Balanced" },
  { value: "تنشيف (خسارة دهون)", en: "Cut (fat loss)" },
  { value: "تضخيم (بناء عضلات)", en: "Bulk (muscle gain)" },
  { value: "نباتي", en: "Vegetarian" },
  { value: "كيتو (منخفض الكارب الحاد)", en: "Keto" },
  { value: "منخفض الكارب", en: "Low carb" },
  { value: "متوسطي", en: "Mediterranean" },
  { value: "بحري (تركيز على الأسماك)", en: "Seafood-based" },
];

const WO_GOALS: { value: string; en: string }[] = [
  { value: "خسارة دهون", en: "Fat loss" },
  { value: "بناء عضلات", en: "Muscle gain" },
  { value: "لياقة عامة", en: "General fitness" },
];

const WO_LEVELS: { value: string; en: string }[] = [
  { value: "مبتدئ", en: "Beginner" },
  { value: "متوسط", en: "Intermediate" },
  { value: "متقدم", en: "Advanced" },
];

const WO_LOCATIONS: { value: string; en: string }[] = [
  { value: "جيم", en: "Gym" },
  { value: "منزل", en: "Home" },
];

const emptyAIForm = {
  person_name: "",
  person_contact: "",
  plan_type: "workout" as "workout" | "meal",
  status: "final" as "draft" | "final",
  title: "", // optional — auto-titled when empty
  notes: "",
  details: "",
  // meal brief
  meals_count: 4,
  calories: "",
  diet_type: DIET_TYPES[0].value,
  weight: "",
  height: "",
  age: "",
  gender: "male",
  // workout brief
  days_per_week: 4,
  goal: WO_GOALS[0].value,
  level: WO_LEVELS[1].value,
  location: WO_LOCATIONS[0].value,
};

const emptyEditForm = {
  id: "",
  person_name: "",
  person_contact: "",
  plan_type: "workout" as "workout" | "meal",
  title: "",
  text: "",
  notes: "",
  status: "final" as "draft" | "final",
};

const inputCls =
  "mt-1 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm outline-none focus:border-[#0071e3]";
const labelCls = "text-xs font-semibold text-[#6e6e73]";

export function AdminExternalPlansView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [plans, setPlans] = useState<ExternalPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "workout" | "meal">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "final">("all");
  const [search, setSearch] = useState("");
  const [aiForm, setAIForm] = useState(emptyAIForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [formMode, setFormMode] = useState<null | "ai" | "edit">(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/external-plans?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || (isAr ? "فشل التحميل" : "Failed to load"));
        setPlans([]);
      } else {
        const data = await res.json();
        setPlans(data.plans || []);
        setTotal(data.total || 0);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg || (isAr ? "فشل التحميل" : "Failed to load"));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [typeFilter, statusFilter]);

  const openCreate = () => {
    setAIForm(emptyAIForm);
    setFormMode("ai");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (plan: ExternalPlan) => {
    setEditForm({
      id: plan.id,
      person_name: plan.person_name,
      person_contact: plan.person_contact || "",
      plan_type: plan.plan_type,
      title: plan.title,
      text: plan.text || "",
      notes: plan.notes || "",
      status: plan.status,
    });
    setFormMode("edit");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── AI generation submit (owner Phase 78) ── */
  const generate = async () => {
    if (generating) return;
    if (aiForm.person_name.trim().length < 2) {
      toast.error(isAr ? "اكتب اسم الشخص الأول" : "Write the person's name first");
      return;
    }
    setGenerating(true);
    try {
      const mealCfg =
        aiForm.plan_type === "meal"
          ? {
              meals_count: aiForm.meals_count,
              calories: aiForm.calories ? Number(aiForm.calories) : 0,
              diet_type: aiForm.diet_type,
              person_data: {
                ...(aiForm.weight ? { weight: Number(aiForm.weight) } : {}),
                ...(aiForm.height ? { height: Number(aiForm.height) } : {}),
                ...(aiForm.age ? { age: Number(aiForm.age) } : {}),
                gender: aiForm.gender,
              },
            }
          : undefined;
      const woCfg =
        aiForm.plan_type === "workout"
          ? {
              days_per_week: aiForm.days_per_week,
              goal: aiForm.goal,
              level: aiForm.level,
              location: aiForm.location,
            }
          : undefined;

      const res = await fetch("/api/admin/external-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: true,
          person_name: aiForm.person_name,
          person_contact: aiForm.person_contact,
          plan_type: aiForm.plan_type,
          title: aiForm.title,
          status: aiForm.status,
          notes: aiForm.notes,
          details: aiForm.details,
          meal: mealCfg,
          workout: woCfg,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || (isAr ? "فشل التوليد" : "Generation failed"));
        return;
      }
      toast.success(
        isAr
          ? `تم التوليد بالذكاء الاصطناعي${data.ai_source ? ` — ${data.ai_source}` : ""}`
          : `Generated by AI${data.ai_source ? ` — ${data.ai_source}` : ""}`,
      );
      setAIForm(emptyAIForm);
      setFormMode(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg || (isAr ? "فشل التوليد" : "Generation failed"));
    } finally {
      setGenerating(false);
    }
  };

  const submitEdit = async () => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      const { id, ...rest } = editForm;
      const res = await fetch("/api/admin/external-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...rest }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || (isAr ? "فشل الحفظ" : "Save failed"));
        return;
      }
      toast.success(isAr ? "تم الحفظ" : "Saved");
      setFormMode(null);
      setEditForm(emptyEditForm);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (plan: ExternalPlan) => {
    if (!confirm(isAr ? `حذف خطة «${plan.title}» بتاعة ${plan.person_name}؟` : `Delete "${plan.title}" for ${plan.person_name}?`)) return;
    try {
      const res = await fetch(`/api/admin/external-plans?id=${plan.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (isAr ? "فشل الحذف" : "Delete failed"));
        return;
      }
      toast.success(isAr ? "تم الحذف" : "Deleted");
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg || (isAr ? "فشل الحذف" : "Delete failed"));
    }
  };

  /* ── Regeneration actions (owner Phase 78: «اعادة توليد») ── */
  const runAction = async (
    payload: Record<string, unknown>,
    key: string,
    confirmMsg?: string,
  ) => {
    if (busyKey) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/external-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || data.error || (isAr ? "فشلت العملية" : "Action failed"));
        return;
      }
      toast.success(
        data.ai?.last_source
          ? `${isAr ? "تم إعادة التوليد" : "Regenerated"} — ${data.ai.last_source}`
          : isAr
            ? "تم إعادة التوليد"
            : "Regenerated",
      );
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg || (isAr ? "فشلت العملية" : "Action failed"));
    } finally {
      setBusyKey(null);
    }
  };

  const regenPlan = (plan: ExternalPlan) =>
    runAction(
      { action: "regenerate_plan", id: plan.id },
      `${plan.id}:plan`,
      isAr
        ? "هتتولد نسخة جديدة بنفس المواصفات وتستبدل الحالية — موافق؟"
        : "A fresh version with the same brief will REPLACE the current one — continue?",
    );
  const regenMeal = (plan: ExternalPlan, mi: number) =>
    runAction({ action: "regenerate_meal", id: plan.id, meal_index: mi }, `${plan.id}:meal:${mi}`);
  const regenItem = (plan: ExternalPlan, mi: number, ii: number) =>
    runAction(
      { action: "regenerate_item", id: plan.id, meal_index: mi, item_index: ii },
      `${plan.id}:item:${mi}:${ii}`,
    );
  const regenDay = (plan: ExternalPlan, di: number) =>
    runAction({ action: "regenerate_day", id: plan.id, day_index: di }, `${plan.id}:day:${di}`);
  const regenExercise = (plan: ExternalPlan, di: number, ei: number) =>
    runAction(
      { action: "regenerate_exercise", id: plan.id, day_index: di, exercise_index: ei },
      `${plan.id}:exercise:${di}:${ei}`,
    );

  const composeText = (plan: ExternalPlan) => {
    const lines = [
      plan.title,
      `${isAr ? "النوع" : "Type"}: ${plan.plan_type === "workout" ? (isAr ? "خطة تدريب" : "Workout plan") : isAr ? "خطة تغذية" : "Meal plan"}`,
      `${isAr ? "الشخص" : "Person"}: ${plan.person_name}${plan.person_contact ? ` — ${plan.person_contact}` : ""}`,
    ];
    if (plan.notes) lines.push(`${isAr ? "ملاحظات" : "Notes"}: ${plan.notes}`);
    lines.push("", "———", "", plan.text || "");
    return lines.join("\n");
  };

  const copyPlan = async (plan: ExternalPlan) => {
    try {
      await navigator.clipboard.writeText(composeText(plan));
      toast.success(isAr ? "تم النسخ — ابعتها للشخص" : "Copied — send it to the person");
    } catch {
      toast.error(isAr ? "فشل النسخ" : "Copy failed");
    }
  };

  const downloadPlan = (plan: ExternalPlan) => {
    const blob = new Blob([composeText(plan)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `plan-${plan.person_name.replace(/\s+/g, "-")}-${plan.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(isAr ? "تم التحميل" : "Downloaded");
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {isAr ? "خطط لغير الأعضاء" : "External Plans"}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#34c759]/10 px-3 py-1 text-xs font-bold text-[#1d9e4a]">
              <InfinityIcon className="h-3.5 w-3.5" />
              {isAr ? "بلا حدود" : "Unlimited"}
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6e6e73] md:text-base">
            {isAr
              ? "ولّد خطط تدريب وتغذية بالذكاء الاصطناعي لأشخاص من خارج أعضاء الموقع — نفس محرك توليد الخطط للعملاء: حدد عدد الوجبات والسعرات ونوع النظام الغذائي وأضف تفاصيلك، أو حدد أيام التدريب والهدف والمستوى لخطط التمرين. الخطة تتولد كاملة، تنسخها أو تحمّلها وتبعتها للشخص — مش محتاج يكون عنده حساب، ومفيش أي حد."
              : "Generate AI-powered training and nutrition plans for people who are NOT members — the same engine used for client plans: set meal count, calories, diet type and extra details, or set training days, goal and level for workout plans. Copy or download and send — no account needed, no cap."}
          </p>
        </div>
        {!formMode && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            {isAr ? "توليد خطة بالذكاء الاصطناعي" : "AI-generate a plan"}
          </button>
        )}
      </div>

      {/* ── AI Generation Form ── */}
      {formMode === "ai" && (
        <div className="rounded-3xl border border-[#d2d2d7] bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-[#0071e3]" />
              {isAr ? "توليد خطة بالذكاء الاصطناعي لشخص خارج الموقع" : "AI-generate a plan for a non-member"}
            </h2>
            <button
              onClick={() => {
                setFormMode(null);
                setAIForm(emptyAIForm);
              }}
              className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Person + contact */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>{isAr ? "اسم الشخص *" : "Person name *"}</label>
              <input
                value={aiForm.person_name}
                onChange={(e) => setAIForm({ ...aiForm, person_name: e.target.value })}
                placeholder={isAr ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed"}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{isAr ? "وسيلة تواصل (اختياري)" : "Contact (optional)"}</label>
              <input
                value={aiForm.person_contact}
                onChange={(e) => setAIForm({ ...aiForm, person_contact: e.target.value })}
                placeholder={isAr ? "واتساب / تليفون / إيميل" : "WhatsApp / phone / email"}
                className={inputCls}
              />
            </div>
          </div>

          {/* Plan type + status */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#6e6e73]">{isAr ? "نوع الخطة *:" : "Plan type *:"}</span>
            <button
              onClick={() => setAIForm({ ...aiForm, plan_type: "workout" })}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${aiForm.plan_type === "workout" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              {isAr ? "تدريب" : "Workout"}
            </button>
            <button
              onClick={() => setAIForm({ ...aiForm, plan_type: "meal" })}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${aiForm.plan_type === "meal" ? "bg-[#34c759] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
            >
              <Apple className="h-3.5 w-3.5" />
              {isAr ? "تغذية" : "Meal"}
            </button>
            <span className="mx-2 hidden h-5 w-px bg-[#d2d2d7] sm:block" />
            <button
              onClick={() => setAIForm({ ...aiForm, status: aiForm.status === "final" ? "draft" : "final" })}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${aiForm.status === "final" ? "bg-[#f5f5f7] text-[#1d1d1f]" : "bg-[#ff9500]/15 text-[#c47700]"}`}
            >
              {aiForm.status === "final" ? (isAr ? "نهائية" : "Final") : isAr ? "مسودة" : "Draft"}
            </button>
          </div>

          {/* ── Meal brief ── */}
          {aiForm.plan_type === "meal" && (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>{isAr ? "عدد الوجبات يومياً" : "Meals per day"}</label>
                  <select
                    value={aiForm.meals_count}
                    onChange={(e) => setAIForm({ ...aiForm, meals_count: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {[3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {isAr ? `${n} وجبات` : `${n} meals`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    {isAr ? "السعرات المستهدفة (اختياري)" : "Target calories (optional)"}
                  </label>
                  <input
                    type="number"
                    min={800}
                    max={6000}
                    value={aiForm.calories}
                    onChange={(e) => setAIForm({ ...aiForm, calories: e.target.value })}
                    placeholder={isAr ? "سيبها فاضية ليحسبها النظام" : "Leave empty to auto-compute"}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "نوع النظام الغذائي" : "Diet type"}</label>
                  <select
                    value={aiForm.diet_type}
                    onChange={(e) => setAIForm({ ...aiForm, diet_type: e.target.value })}
                    className={inputCls}
                  >
                    {DIET_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {isAr ? d.value : d.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold text-[#6e6e73]">
                {isAr
                  ? "بيانات الشخص (اختياري — لدقة حساب السعرات والماكروز زي نموذج العملاء):"
                  : "Person data (optional — accurate calorie/macro math, same as client plans):"}
              </p>
              <div className="mt-2 grid gap-4 sm:grid-cols-4">
                <div>
                  <label className={labelCls}>{isAr ? "الوزن (كجم)" : "Weight (kg)"}</label>
                  <input
                    type="number"
                    value={aiForm.weight}
                    onChange={(e) => setAIForm({ ...aiForm, weight: e.target.value })}
                    placeholder="80"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "الطول (سم)" : "Height (cm)"}</label>
                  <input
                    type="number"
                    value={aiForm.height}
                    onChange={(e) => setAIForm({ ...aiForm, height: e.target.value })}
                    placeholder="175"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "العمر" : "Age"}</label>
                  <input
                    type="number"
                    value={aiForm.age}
                    onChange={(e) => setAIForm({ ...aiForm, age: e.target.value })}
                    placeholder="25"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "الجنس" : "Gender"}</label>
                  <select
                    value={aiForm.gender}
                    onChange={(e) => setAIForm({ ...aiForm, gender: e.target.value })}
                    className={inputCls}
                  >
                    <option value="male">{isAr ? "ذكر" : "Male"}</option>
                    <option value="female">{isAr ? "أنثى" : "Female"}</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Workout brief ── */}
          {aiForm.plan_type === "workout" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <div>
                <label className={labelCls}>{isAr ? "أيام التدريب أسبوعياً" : "Training days / week"}</label>
                <select
                  value={aiForm.days_per_week}
                  onChange={(e) => setAIForm({ ...aiForm, days_per_week: Number(e.target.value) })}
                  className={inputCls}
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {isAr ? `${n} أيام` : `${n} days`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{isAr ? "الهدف" : "Goal"}</label>
                <select
                  value={aiForm.goal}
                  onChange={(e) => setAIForm({ ...aiForm, goal: e.target.value })}
                  className={inputCls}
                >
                  {WO_GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {isAr ? g.value : g.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{isAr ? "المستوى" : "Level"}</label>
                <select
                  value={aiForm.level}
                  onChange={(e) => setAIForm({ ...aiForm, level: e.target.value })}
                  className={inputCls}
                >
                  {WO_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {isAr ? l.value : l.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{isAr ? "مكان التدريب" : "Location"}</label>
                <select
                  value={aiForm.location}
                  onChange={(e) => setAIForm({ ...aiForm, location: e.target.value })}
                  className={inputCls}
                >
                  {WO_LOCATIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {isAr ? l.value : l.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="mt-4">
            <label className={labelCls}>
              {aiForm.plan_type === "meal"
                ? isAr
                  ? "تفاصيل إضافية (اختياري) — حساسية، أطعمة مفضلة أو غير مرغوبة، أي ملاحظات"
                  : "Extra details (optional) — allergies, preferred/avoided foods, notes"
                : isAr
                  ? "تفاصيل إضافية (اختياري) — إصابات، معدات متاحة، أي ملاحظات"
                  : "Extra details (optional) — injuries, available equipment, notes"}
            </label>
            <textarea
              value={aiForm.details}
              onChange={(e) => setAIForm({ ...aiForm, details: e.target.value })}
              rows={4}
              placeholder={
                aiForm.plan_type === "meal"
                  ? isAr
                    ? "مثال: حساسية من المكسرات، بيحب الدجاج والسمك، مش بيأكل البيض..."
                    : "e.g. nut allergy, likes chicken and fish, no eggs..."
                  : isAr
                    ? "مثال: مشكلة بسيطة في الركبة اليمين، متاح بار ودمبل..."
                    : "e.g. mild right knee issue, barbell and dumbbells available..."
              }
              className={`${inputCls} leading-relaxed`}
            />
          </div>

          {/* Title + notes */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>
                {isAr ? "عنوان الخطة (اختياري — يتولد تلقائياً)" : "Plan title (optional — auto-generated)"}
              </label>
              <input
                value={aiForm.title}
                onChange={(e) => setAIForm({ ...aiForm, title: e.target.value })}
                placeholder={isAr ? "مثال: برنامج تضخم 4 أيام" : "e.g. 4-day bulking program"}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
              <input
                value={aiForm.notes}
                onChange={(e) => setAIForm({ ...aiForm, notes: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={generate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating
                ? isAr
                  ? "جاري التوليد بالذكاء الاصطناعي…"
                  : "Generating with AI…"
                : isAr
                  ? "توليد الخطة"
                  : "Generate plan"}
            </button>
            <button
              onClick={() => {
                setFormMode(null);
                setAIForm(emptyAIForm);
              }}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <span className="text-xs text-[#86868b]">
              {isAr
                ? "التوليد بنفس محرك خطط العملاء — ممكن ياخد حتى دقيقة."
                : "Same engine as client plans — may take up to a minute."}
            </span>
          </div>
        </div>
      )}

      {/* ── Manual edit form (refine generated text) ── */}
      {formMode === "edit" && (
        <div className="rounded-3xl border border-[#d2d2d7] bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {isAr ? "تعديل الخطة" : "Edit plan"}
              <span className="ms-2 text-xs font-normal text-[#6e6e73]">
                {isAr ? "تعديل حر على النص المولّد" : "free edit of the generated text"}
              </span>
            </h2>
            <button
              onClick={() => {
                setFormMode(null);
                setEditForm(emptyEditForm);
              }}
              className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>{isAr ? "اسم الشخص" : "Person name"}</label>
              <input
                value={editForm.person_name}
                onChange={(e) => setEditForm({ ...editForm, person_name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{isAr ? "وسيلة تواصل" : "Contact"}</label>
              <input
                value={editForm.person_contact}
                onChange={(e) => setEditForm({ ...editForm, person_contact: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls}>{isAr ? "عنوان الخطة" : "Plan title"}</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="mt-4">
            <label className={labelCls}>{isAr ? "تفاصيل الخطة" : "Plan details"}</label>
            <textarea
              value={editForm.text}
              onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
              rows={14}
              className={`${inputCls} leading-relaxed`}
              dir="auto"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditForm({ ...editForm, status: editForm.status === "final" ? "draft" : "final" })}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${editForm.status === "final" ? "bg-[#f5f5f7] text-[#1d1d1f]" : "bg-[#ff9500]/15 text-[#c47700]"}`}
            >
              {editForm.status === "final" ? (isAr ? "نهائية" : "Final") : isAr ? "مسودة" : "Draft"}
            </button>
            <input
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder={isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
              className="min-w-[200px] flex-1 rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={submitEdit}
              disabled={savingEdit}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              {isAr ? "حفظ التعديل" : "Save changes"}
            </button>
            <button
              onClick={() => {
                setFormMode(null);
                setEditForm(emptyEditForm);
              }}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-[#f5f5f7] p-1">
          {([
            ["all", isAr ? "الكل" : "All"],
            ["workout", isAr ? "تدريب" : "Workout"],
            ["meal", isAr ? "تغذية" : "Meal"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${typeFilter === value ? "bg-white shadow-sm" : "text-[#6e6e73]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-full bg-[#f5f5f7] p-1">
          {([
            ["all", isAr ? "كل الحالات" : "Any status"],
            ["final", isAr ? "نهائية" : "Final"],
            ["draft", isAr ? "مسودة" : "Draft"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${statusFilter === value ? "bg-white shadow-sm" : "text-[#6e6e73]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder={isAr ? "بحث بالاسم أو العنوان..." : "Search name or title..."}
            className="w-full rounded-full border border-[#d2d2d7] py-2 pe-3 ps-9 text-sm outline-none focus:border-[#0071e3]"
          />
        </div>
        <span className="text-xs font-semibold text-[#6e6e73]">
          {total.toLocaleString(isAr ? "ar-EG" : "en-US")} {isAr ? "خطة" : "plans"}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#6e6e73]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isAr ? "جاري التحميل…" : "Loading…"}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#d2d2d7] py-16 text-center">
          <p className="text-sm text-[#6e6e73]">
            {isAr ? "مفيش خطط لسه — ابدأ بأول خطة بالذكاء الاصطناعي لشخص خارج الموقع." : "No plans yet — start with the first AI-generated external plan."}
          </p>
          {!formMode && (
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Sparkles className="h-4 w-4" />
              {isAr ? "توليد خطة بالذكاء الاصطناعي" : "AI-generate a plan"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-[#d2d2d7] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${plan.plan_type === "workout" ? "bg-[#0071e3]/10 text-[#0071e3]" : "bg-[#34c759]/10 text-[#1d9e4a]"}`}
                    >
                      {plan.plan_type === "workout" ? <Dumbbell className="h-3 w-3" /> : <Apple className="h-3 w-3" />}
                      {plan.plan_type === "workout" ? (isAr ? "تدريب" : "Workout") : isAr ? "تغذية" : "Meal"}
                    </span>
                    {plan.status === "draft" && (
                      <span className="rounded-full bg-[#ff9500]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#c47700]">
                        {isAr ? "مسودة" : "Draft"}
                      </span>
                    )}
                    {plan.ai && (
                      <span className="rounded-full bg-[#af52de]/10 px-2 py-0.5 text-[10px] font-bold text-[#af52de]">
                        AI{typeof plan.ai.regenerations === "number" && plan.ai.regenerations > 0 ? ` ↺${plan.ai.regenerations}` : ""}
                      </span>
                    )}
                    <span className="text-[11px] text-[#86868b]">{fmtDate(plan.created_at)}</span>
                  </div>
                  <h3 className="mt-1.5 truncate font-semibold">{plan.title}</h3>
                  <p className="mt-0.5 text-sm text-[#6e6e73]">
                    {plan.person_name}
                    {plan.person_contact && <span className="text-[#86868b]"> — {plan.person_contact}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {plan.ai?.params && (
                    <button
                      onClick={() => regenPlan(plan)}
                      title={isAr ? "إعادة توليد الخطة كاملة بنفس المواصفات" : "Regenerate whole plan with the same brief"}
                      disabled={busyKey !== null}
                      className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#0071e3]/10 hover:text-[#0071e3] disabled:opacity-40"
                    >
                      {busyKey === `${plan.id}:plan` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => copyPlan(plan)}
                    title={isAr ? "نسخ كنص" : "Copy as text"}
                    className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#0071e3]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadPlan(plan)}
                    title={isAr ? "تحميل ملف نصي" : "Download .txt"}
                    className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#0071e3]"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(plan)}
                    title={isAr ? "تعديل" : "Edit"}
                    className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#0071e3]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(plan)}
                    title={isAr ? "حذف" : "Delete"}
                    className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-red-50 hover:text-[#ff3b30]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {plan.notes && <p className="mt-2 text-xs text-[#86868b]">{isAr ? "ملاحظات: " : "Notes: "}{plan.notes}</p>}
              {plan.plan_type === "meal" && plan.plan && Array.isArray(plan.plan.meals) ? (
                /* ── Structured meal plan — per-meal / per-item regen ── */
                <div className="mt-3 max-h-[460px] space-y-2.5 overflow-y-auto rounded-2xl bg-[#f5f5f7] p-3">
                  {typeof plan.plan.daily_calories === "number" && plan.plan.daily_calories > 0 && (
                    <p className="text-xs font-semibold text-[#1d1d1f]" dir="auto">
                      {isAr ? "السعرات اليومية" : "Daily calories"}: {plan.plan.daily_calories}
                      {plan.plan.macros && (
                        <span className="font-normal text-[#6e6e73]">
                          {"  •  "}{isAr ? "بروتين" : "P"} {plan.plan.macros.protein_g}{isAr ? "جم" : "g"} / {isAr ? "كارب" : "C"} {plan.plan.macros.carbs_g}{isAr ? "جم" : "g"} / {isAr ? "دهون" : "F"} {plan.plan.macros.fat_g}{isAr ? "جم" : "g"}
                        </span>
                      )}
                    </p>
                  )}
                  {plan.plan.meals.map((meal: Record<string, any>, mi: number) => (
                    <div key={mi} className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-[#1d1d1f]" dir="auto">
                          {String(meal.name ?? "")}
                          {meal.time ? <span className="font-normal text-[#6e6e73]"> ({String(meal.time)})</span> : null}
                          {typeof meal.total_calories === "number" && meal.total_calories > 0 && (
                            <span className="ms-2 text-[11px] font-normal text-[#86868b]">≈ {meal.total_calories} {isAr ? "سعرة" : "kcal"}</span>
                          )}
                        </p>
                        <button
                          onClick={() => regenMeal(plan, mi)}
                          title={isAr ? "إعادة توليد الوجبة كاملة" : "Regenerate whole meal"}
                          disabled={busyKey !== null}
                          className="shrink-0 rounded-full p-1.5 text-[#6e6e73] transition-colors hover:bg-[#0071e3]/10 hover:text-[#0071e3] disabled:opacity-40"
                        >
                          {busyKey === `${plan.id}:meal:${mi}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        {((meal.items || []) as Record<string, any>[]).map((item, ii) => (
                          <div key={ii} className="flex items-center justify-between gap-2 rounded-lg px-1 py-0.5 hover:bg-[#f5f5f7]">
                            <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#1d1d1f]" dir="auto">
                              <span className="font-medium">{String(item.food ?? "")}</span>
                              <span className="text-[#6e6e73]"> — {String(item.amount ?? "")}</span>
                              {item.alternatives ? <span className="block text-[10px] text-[#86868b]" dir="auto">{isAr ? "بديل: " : "Alt: "}{String(item.alternatives)}</span> : null}
                            </p>
                            <span className="flex shrink-0 items-center gap-1">
                              <span className="text-[11px] font-semibold text-[#6e6e73]">{Number(item.calories) || 0}</span>
                              <button
                                onClick={() => regenItem(plan, mi, ii)}
                                title={isAr ? "إعادة توليد الصنف فقط" : "Regenerate this item only"}
                                disabled={busyKey !== null}
                                className="rounded-full p-1 text-[#86868b] transition-colors hover:bg-[#ff9500]/10 hover:text-[#c47700] disabled:opacity-40"
                              >
                                {busyKey === `${plan.id}:item:${mi}:${ii}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Repeat className="h-3 w-3" />}
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                      {Array.isArray(meal.meal_alternatives) && meal.meal_alternatives.length > 0 && (
                        <p className="mt-1 text-[10px] text-[#86868b]" dir="auto">
                          {isAr ? "بدائل كاملة: " : "Full alternatives: "}
                          {meal.meal_alternatives.map((a: Record<string, unknown>) => String(a?.name ?? "")).filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                  ))}
                  {Array.isArray(plan.plan.supplements) && plan.plan.supplements.length > 0 && (
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-[#1d1d1f]" dir="auto">{isAr ? "مكملات مقترحة" : "Suggested supplements"}</p>
                      {(plan.plan.supplements as Record<string, unknown>[]).map((s, i) => (
                        <p key={i} className="mt-0.5 text-[11px] leading-relaxed text-[#6e6e73]" dir="auto">
                          • {String(s?.name ?? "")} — {String(s?.dose ?? "")} — {String(s?.timing ?? "")}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : plan.plan_type === "workout" && plan.plan && Array.isArray(plan.plan.days) ? (
                /* ── Structured workout plan — per-day / per-exercise regen ── */
                <div className="mt-3 max-h-[460px] space-y-2.5 overflow-y-auto rounded-2xl bg-[#f5f5f7] p-3">
                  {plan.plan.overview ? (
                    <p className="text-xs leading-relaxed text-[#1d1d1f]" dir="auto">{String(plan.plan.overview)}</p>
                  ) : null}
                  {(plan.plan.days as Record<string, any>[]).map((day, di) => (
                    <div key={di} className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-[#1d1d1f]" dir="auto">
                          {String(day.day ?? "")}
                          {day.focus ? <span className="font-normal text-[#6e6e73]"> — {String(day.focus)}</span> : null}
                        </p>
                        {!day.isRest && (
                          <button
                            onClick={() => regenDay(plan, di)}
                            title={isAr ? "إعادة توليد اليوم كامل بنفس التركيز" : "Regenerate whole day (same focus)"}
                            disabled={busyKey !== null}
                            className="shrink-0 rounded-full p-1.5 text-[#6e6e73] transition-colors hover:bg-[#0071e3]/10 hover:text-[#0071e3] disabled:opacity-40"
                          >
                            {busyKey === `${plan.id}:day:${di}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      {!day.isRest && (
                        <div className="mt-1.5 space-y-0.5">
                          {((day.exercises || []) as Record<string, any>[]).map((ex, ei) => (
                            <div key={ei} className="flex items-center justify-between gap-2 rounded-lg px-1 py-0.5 hover:bg-[#f5f5f7]">
                              <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#1d1d1f]" dir="auto">
                                <span className="font-medium">{String(ex.name ?? "")}</span>
                                <span className="text-[#6e6e73]"> — {Number(ex.sets) || 0} × {String(ex.reps ?? "")}</span>
                                {ex.rest ? <span className="text-[#86868b]"> ({String(ex.rest)})</span> : null}
                                {ex.notes ? <span className="block text-[10px] text-[#86868b]" dir="auto">{String(ex.notes)}</span> : null}
                              </p>
                              <button
                                onClick={() => regenExercise(plan, di, ei)}
                                title={isAr ? "استبدال التمرين ببديل آمن" : "Swap this exercise"}
                                disabled={busyKey !== null}
                                className="shrink-0 rounded-full p-1 text-[#86868b] transition-colors hover:bg-[#ff9500]/10 hover:text-[#c47700] disabled:opacity-40"
                              >
                                {busyKey === `${plan.id}:exercise:${di}:${ei}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Repeat className="h-3 w-3" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-[#f5f5f7] p-3 text-xs leading-relaxed text-[#1d1d1f]" dir="auto">
                  {plan.text}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
