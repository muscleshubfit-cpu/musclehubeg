"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Calculator,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from "lucide-react";

type SavedResult = {
  id: string;
  tool_slug: string;
  title: string | null;
  result_data: Record<string, unknown>;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
};

const TOOL_LABELS: Record<string, { ar: string; en: string }> = {
  "calorie-calculator": { ar: "حاسبة السعرات", en: "Calorie Calculator" },
  "bmi-calculator": { ar: "حاسبة BMI", en: "BMI Calculator" },
  "macro-calculator": { ar: "حاسبة الماكروز", en: "Macro Calculator" },
  "body-fat-calculator": { ar: "حاسبة الدهون", en: "Body Fat Calculator" },
  "water-tracker": { ar: "متتبع الماء", en: "Water Tracker" },
};

/** Compact summary of the result_data — different per tool. */
function summarizeResult(tool: string, data: Record<string, unknown> | null): string {
  if (!data) return "—";
  switch (tool) {
    case "calorie-calculator":
      return `${String(data.target || "—")} kcal · P:${String(data.protein || "?")}g · C:${String(data.carbs || "?")}g · F:${String(data.fat || "?")}g`;
    case "bmi-calculator":
      return `BMI: ${String(data.bmi || "—")} (${String(data.category || "?")}) · Ideal: ${String(data.idealWeightMin || "?")}-${String(data.idealWeightMax || "?")}kg`;
    case "macro-calculator":
      return `${String(data.calories || data.target || "—")} kcal · P:${String(data.protein || "?")}g · C:${String(data.carbs || "?")}g · F:${String(data.fat || "?")}g`;
    case "body-fat-calculator":
      return `${String(data.bodyFat || data.bf || "—")}% · ${String(data.category || "?")} · Lean: ${String(data.leanMass || "?")}kg`;
    case "water-tracker":
      return `${Number(data.consumed_ml) || 0}/${Number(data.goal_ml) || 0} ml · ${String(data.date || "?")}`;
    default:
      return JSON.stringify(data).slice(0, 100);
  }
}

export function AdminSavedResultsView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [results, setResults] = useState<SavedResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const url =
        filter !== "all"
          ? `/api/admin/saved-results?tool=${encodeURIComponent(filter)}&limit=200`
          : `/api/admin/saved-results?limit=200`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (isAr ? "فشل التحميل" : "Failed to load"));
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "فشل التحميل" : "Failed to load"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const filtered = search.trim()
    ? results.filter((r) => {
        const s = search.trim().toLowerCase();
        return (
          (r.user_name || "").toLowerCase().includes(s) ||
          (r.user_email || "").toLowerCase().includes(s) ||
          (r.title || "").toLowerCase().includes(s) ||
          summarizeResult(r.tool_slug, r.result_data).toLowerCase().includes(s)
        );
      })
    : results;

  const exportAllCsv = () => {
    const header = [
      "id",
      "created_at",
      "user_name",
      "user_email",
      "tool",
      "title",
      "summary",
    ].join(",");
    const rows = filtered.map((r) =>
      [
        r.id,
        new Date(r.created_at).toISOString(),
        `"${(r.user_name || "").replace(/"/g, '""')}"`,
        `"${(r.user_email || "").replace(/"/g, '""')}"`,
        r.tool_slug,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        `"${summarizeResult(r.tool_slug, r.result_data).replace(/"/g, '""')}"`,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saved-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "النتائج المحفوظة" : "Saved Results"}
          </h1>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? `كل نتائج الأدوات اللي حفظها المستخدمين (${total} إجمالي)`
              : `All tool results saved by users (${total} total)`}
          </p>
        </div>
        <button
          onClick={exportAllCsv}
          className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          {isAr ? "تحميل CSV" : "Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث بالاسم أو الإيميل..." : "Search name or email..."}
            className="w-full rounded-full border border-[#d2d2d7] bg-white ps-10 pe-4 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
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
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-[#f5f5f7] p-12 text-center">
          <Calculator className="mx-auto h-10 w-10 text-[#d2d2d7]" />
          <p className="mt-3 text-sm font-normal text-[#6e6e73]">
            {isAr ? "مفيش نتائج محفوظة بعد" : "No saved results yet"}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#d2d2d7]">
          {/* Table header (desktop) */}
          <div className="hidden grid-cols-12 gap-2 bg-[#f5f5f7] px-4 py-3 text-xs font-medium text-[#6e6e73] md:grid">
            <div className="col-span-3">{isAr ? "المستخدم" : "User"}</div>
            <div className="col-span-2">{isAr ? "الأداة" : "Tool"}</div>
            <div className="col-span-4">{isAr ? "ملخص النتيجة" : "Result summary"}</div>
            <div className="col-span-2">{isAr ? "التاريخ" : "Date"}</div>
            <div className="col-span-1 text-end">{isAr ? "تفاصيل" : "Details"}</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#d2d2d7]">
            {filtered.map((r) => {
              const isExpanded = expandedId === r.id;
              const toolLabel = TOOL_LABELS[r.tool_slug];
              return (
                <div key={r.id} className="bg-white px-4 py-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
                    {/* User */}
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.user_name}
                        </p>
                        <p className="truncate text-xs text-[#6e6e73]" dir="ltr">
                          {r.user_email}
                        </p>
                      </div>
                    </div>

                    {/* Tool */}
                    <div className="col-span-2">
                      <span className="inline-block rounded-full bg-[#f5f5f7] px-2.5 py-1 text-xs font-medium">
                        {isAr ? toolLabel?.ar : toolLabel?.en}
                      </span>
                    </div>

                    {/* Summary */}
                    <div className="col-span-4 text-sm font-normal text-[#1d1d1f]" dir="ltr">
                      <p className="truncate">
                        {r.title || summarizeResult(r.tool_slug, r.result_data)}
                      </p>
                      <p className="truncate text-xs text-[#6e6e73]">
                        {summarizeResult(r.tool_slug, r.result_data)}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-xs text-[#6e6e73]" dir="ltr">
                      {new Date(r.created_at).toLocaleString()}
                    </div>

                    {/* Expand */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON */}
                  {isExpanded && (
                    <div className="mt-3 rounded-xl bg-[#1d1d1f] p-4">
                      <pre
                        dir="ltr"
                        className="overflow-x-auto text-xs font-mono text-[#f5f5f7]"
                      >
                        {JSON.stringify(r.result_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="mt-4 text-xs font-normal text-[#6e6e73]">
          {isAr
            ? `${filtered.length} من ${total} نتيجة`
            : `${filtered.length} of ${total} results`}
        </p>
      )}
    </div>
  );
}
