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
} from "lucide-react";

type ExternalPlanRow = Database["public"]["Tables"]["external_plans"]["Row"];
type ExternalPlan = Omit<ExternalPlanRow, "content"> & { text: string };

const emptyForm = {
  person_name: "",
  person_contact: "",
  plan_type: "workout" as "workout" | "meal",
  title: "",
  text: "",
  notes: "",
  status: "final" as "draft" | "final",
};

export function AdminExternalPlansView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [plans, setPlans] = useState<ExternalPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "workout" | "meal">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "final">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

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
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (plan: ExternalPlan) => {
    setForm({
      person_name: plan.person_name,
      person_contact: plan.person_contact || "",
      plan_type: plan.plan_type,
      title: plan.title,
      text: plan.text || "",
      notes: plan.notes || "",
      status: plan.status,
    });
    setEditingId(plan.id);
    setFormOpen(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/external-plans", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || (isAr ? "فشل الحفظ" : "Save failed"));
        return;
      }
      toast.success(isAr ? "تم الحفظ" : "Saved");
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setSaving(false);
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
              ? "اكتب خطط تدريب وتغذية يدويًا لأشخاص من خارج أعضاء الموقع — اكتب كل التفاصيل بنفسك، انسخها أو حمّلها وابعتها للشخص. مش محتاج يكون عنده حساب، ومفيش أي حد على عدد الخطط."
              : "Hand-write training and nutrition plans for people who are NOT members — write every detail yourself, then copy or download and send it to them. They don't need an account, and there is no cap on plans."}
          </p>
        </div>
        {!formOpen && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {isAr ? "خطة جديدة" : "New plan"}
          </button>
        )}
      </div>

      {/* Form */}
      {formOpen && (
        <div className="rounded-3xl border border-[#d2d2d7] bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? (isAr ? "تعديل الخطة" : "Edit plan") : isAr ? "خطة جديدة لشخص خارج الموقع" : "New plan for a non-member"}
            </h2>
            <button
              onClick={() => {
                setFormOpen(false);
                setForm(emptyForm);
                setEditingId(null);
              }}
              className="rounded-full p-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#6e6e73]">{isAr ? "اسم الشخص *" : "Person name *"}</label>
              <input
                value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                placeholder={isAr ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed"}
                className="mt-1 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6e6e73]">{isAr ? "وسيلة تواصل (اختياري)" : "Contact (optional)"}</label>
              <input
                value={form.person_contact}
                onChange={(e) => setForm({ ...form, person_contact: e.target.value })}
                placeholder={isAr ? "واتساب / تليفون / إيميل" : "WhatsApp / phone / email"}
                className="mt-1 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#6e6e73]">{isAr ? "نوع الخطة *:" : "Plan type *:"}</span>
            <button
              onClick={() => setForm({ ...form, plan_type: "workout" })}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${form.plan_type === "workout" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              {isAr ? "تدريب" : "Workout"}
            </button>
            <button
              onClick={() => setForm({ ...form, plan_type: "meal" })}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${form.plan_type === "meal" ? "bg-[#34c759] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
            >
              <Apple className="h-3.5 w-3.5" />
              {isAr ? "تغذية" : "Meal"}
            </button>
            <span className="mx-2 hidden h-5 w-px bg-[#d2d2d7] sm:block" />
            <button
              onClick={() => setForm({ ...form, status: form.status === "final" ? "draft" : "final" })}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${form.status === "final" ? "bg-[#f5f5f7] text-[#1d1d1f]" : "bg-[#ff9500]/15 text-[#c47700]"}`}
            >
              {form.status === "final" ? (isAr ? "نهائية" : "Final") : isAr ? "مسودة" : "Draft"}
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#6e6e73]">{isAr ? "عنوان الخطة *" : "Plan title *"}</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isAr ? "مثال: برنامج تضخم 4 أيام للأسبوعين الأولين" : "e.g. 4-day bulking program, first two weeks"}
              className="mt-1 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#6e6e73]">
              {isAr ? "تفاصيل الخطة (اكتبها يدويًا) *" : "Plan details (write manually) *"}
            </label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={14}
              placeholder={isAr ? "اكتب كل التفاصيل هنا — التمارين والأوزان والتكرارات أو الوجبات والكميات... اللي يناسبك." : "Write all the details here — exercises, weights, reps, or meals and amounts... whatever fits."}
              className="mt-1 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#6e6e73]">{isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? (isAr ? "حفظ التعديل" : "Save changes") : isAr ? "حفظ الخطة" : "Save plan"}
            </button>
            <button
              onClick={() => {
                setFormOpen(false);
                setForm(emptyForm);
                setEditingId(null);
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
            {isAr ? "مفيش خطط لسه — ابدأ بأول خطة لشخص خارج الموقع." : "No plans yet — start with the first external plan."}
          </p>
          {!formOpen && (
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              {isAr ? "خطة جديدة" : "New plan"}
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
                    <span className="text-[11px] text-[#86868b]">{fmtDate(plan.created_at)}</span>
                  </div>
                  <h3 className="mt-1.5 truncate font-semibold">{plan.title}</h3>
                  <p className="mt-0.5 text-sm text-[#6e6e73]">
                    {plan.person_name}
                    {plan.person_contact && <span className="text-[#86868b]"> — {plan.person_contact}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-[#f5f5f7] p-3 text-xs leading-relaxed text-[#1d1d1f]" dir="auto">
                {plan.text}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
