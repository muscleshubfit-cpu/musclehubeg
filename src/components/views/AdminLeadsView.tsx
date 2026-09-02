"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ToolLead } from "@/lib/supabase/types";
import { toast } from "sonner";
import { Mail, MessageCircle, Search, CheckCircle2, Circle, Download, Trash2 } from "lucide-react";

const TOOL_LABELS: Record<string, { ar: string; en: string; emoji: string }> = {
  "calorie-calculator": { ar: "حاسبة السعرات", en: "Calorie Calculator", emoji: "🔥" },
  "bmi-calculator": { ar: "حاسبة BMI", en: "BMI Calculator", emoji: "⚖️" },
  "macro-calculator": { ar: "حاسبة الماكروز", en: "Macro Calculator", emoji: "🥩" },
  "body-fat-calculator": { ar: "حاسبة الدهون", en: "Body Fat Calculator", emoji: "📊" },
  "water-tracker": { ar: "متتبع الماء", en: "Water Tracker", emoji: "💧" },
  "meal-planner": { ar: "مخطط الوجبات", en: "Meal Planner", emoji: "🥗" },
  "newsletter": { ar: "النشرة البريدية", en: "Newsletter", emoji: "📬" },
  "signup": { ar: "تسجيل حساب", en: "Account signup", emoji: "👤" },
};

export function AdminLeadsView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [leads, setLeads] = useState<ToolLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const url = filter !== "all"
        ? `/api/admin/leads?tool=${encodeURIComponent(filter)}`
        : "/api/admin/leads";
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (isAr ? "فشل التحميل" : "Failed to load"));
        setLeads([]);
      } else {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "فشل التحميل" : "Failed to load"));
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const toggleContacted = async (lead: ToolLead) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, contacted: !lead.contacted }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (isAr ? "فشل التحديث" : "Update failed"));
        return;
      }
      toast.success(isAr ? "تم التحديث" : "Updated");
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, contacted: !l.contacted } : l)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "فشل التحديث" : "Update failed"));
    }
  };

  const toggleConverted = async (lead: ToolLead) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, converted: !lead.converted }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (isAr ? "فشل التحديث" : "Update failed"));
        return;
      }
      toast.success(isAr ? "تم التحديث" : "Updated");
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, converted: !l.converted } : l)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "فشل التحديث" : "Update failed"));
    }
  };

  // M24 fix: delete a lead (GDPR / right-to-erasure)
  const deleteLead = async (lead: ToolLead) => {
    if (!confirm(isAr ? `حذف هذا الـ lead؟ (${lead.email})` : `Delete this lead? (${lead.email})`)) return;
    try {
      const res = await fetch(`/api/admin/leads?id=${lead.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (isAr ? "فشل الحذف" : "Delete failed"));
        return;
      }
      toast.success(isAr ? "تم الحذف" : "Deleted");
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "فشل الحذف" : "Delete failed"));
    }
  };

  const filtered = search.trim()
    ? leads.filter((l) => {
        const s = search.trim().toLowerCase();
        return (
          (l.email || "").toLowerCase().includes(s) ||
          (l.whatsapp || "").toLowerCase().includes(s) ||
          (l.result_summary || "").toLowerCase().includes(s)
        );
      })
    : leads;

  // Stats
  const total = leads.length;
  const contacted = leads.filter((l) => l.contacted).length;
  const converted = leads.filter((l) => l.converted).length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  const exportCsv = () => {
    const rows = [
      ["created_at", "tool", "email", "whatsapp", "result_summary", "lang", "contacted", "converted"],
      ...filtered.map((l) => [
        l.created_at,
        l.tool_slug,
        l.email || "",
        l.whatsapp || "",
        (l.result_summary || "").replace(/[\r\n,]/g, " "),
        l.lang || "",
        l.contacted ? "yes" : "no",
        l.converted ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tool-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {isAr ? " Leads من الأدوات" : "Tool Leads"}
          </h1>
          <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "زيارات الأدوات اللي سجّلت إيميل أو واتساب."
              : "Tool visitors who left an email or WhatsApp."}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isAr ? "تصدير CSV" : "Export CSV"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{total}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">
            {isAr ? "إجمالي الـ Leads" : "Total Leads"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#0071e3]">{contacted}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">
            {isAr ? "اتم التواصل" : "Contacted"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#34c759]">{converted}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">
            {isAr ? "تحوّلوا لعملاء" : "Converted"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{conversionRate}%</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">
            {isAr ? "معدل التحويل" : "Conversion Rate"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث بالإيميل/الواتساب/النتيجة..." : "Search email/whatsapp/result..."}
            className="w-full rounded-full border border-[#d2d2d7] bg-white ps-10 pe-4 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
        >
          <option value="all">{isAr ? "كل الأدوات" : "All tools"}</option>
          {Object.entries(TOOL_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {isAr ? label.ar : label.en}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "مفيش leads لسه" : "No leads yet"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#d2d2d7]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f5f5f7]">
                <tr className="text-start">
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "الأداة" : "Tool"}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "التواصل" : "Contact"}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "النتيجة" : "Result"}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "التاريخ" : "Date"}
                  </th>
                  <th className="p-3 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "تواصل" : "Contacted"}
                  </th>
                  <th className="p-3 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "تحويل" : "Converted"}
                  </th>
                  <th className="p-3 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "حذف" : "Delete"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const tool = TOOL_LABELS[lead.tool_slug];
                  return (
                    <tr key={lead.id} className="border-t border-[#d2d2d7]/60">
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{tool?.emoji}</span>
                          <span className="font-medium">
                            {isAr ? tool?.ar : tool?.en}
                          </span>
                          {/* Phase 73: member / coach badge for signup rows */}
                          {lead.tool_slug === "signup" && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                lead.type === "coach"
                                  ? "bg-[#0071e3]/10 text-[#0071e3]"
                                  : lead.type === "admin"
                                    ? "bg-[#1d1d1f]/10 text-[#1d1d1f]"
                                    : "bg-[#34c759]/10 text-[#1d8a3c]"
                              }`}
                            >
                              {lead.type === "coach"
                                ? isAr ? "مدرب" : "Coach"
                                : lead.type === "admin"
                                  ? isAr ? "إدارة" : "Admin"
                                  : isAr ? "عضو" : "Member"}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1.5 text-[#0071e3] hover:underline"
                            dir="ltr"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {lead.email}
                          </a>
                        ) : lead.whatsapp ? (
                          <a
                            href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#34c759] hover:underline"
                            dir="ltr"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {lead.whatsapp}
                          </a>
                        ) : (
                          <span className="text-[#6e6e73]">—</span>
                        )}
                      </td>
                      <td className="max-w-xs truncate p-3 text-[#6e6e73]" dir="auto">
                        {lead.result_summary || "—"}
                      </td>
                      <td className="whitespace-nowrap p-3 text-[#6e6e73]" dir="ltr">
                        {new Date(lead.created_at).toLocaleString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleContacted(lead)}
                          className="inline-flex h-7 w-7 items-center justify-center"
                          title={isAr ? "تبديل حالة التواصل" : "Toggle contacted"}
                        >
                          {lead.contacted ? (
                            <CheckCircle2 className="h-5 w-5 text-[#34c759]" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#d2d2d7]" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleConverted(lead)}
                          className="inline-flex h-7 w-7 items-center justify-center"
                          title={isAr ? "تبديل حالة التحويل" : "Toggle converted"}
                        >
                          {lead.converted ? (
                            <CheckCircle2 className="h-5 w-5 text-[#0071e3]" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#d2d2d7]" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteLead(lead)}
                          className="inline-flex h-7 w-7 items-center justify-center text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-full transition-colors"
                          title={isAr ? "حذف" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
