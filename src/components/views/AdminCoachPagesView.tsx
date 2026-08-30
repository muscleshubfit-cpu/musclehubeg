"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Check,
  ExternalLink,
  Eye,
  Loader2,
  X,
  FileWarning,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * ADMIN — COACH PAGES REVIEW (0046).
 * Owner request: «ضيف فى داشبورد الادمن قائمة جديدة لعرض صفحات المدربين
 * لمراجعتها والموافقة او الرفض عليها مع ارسال السبب»
 *
 * The review QUEUE: every coach-written public landing page with its
 * review state. Pending first (the work queue), then rejected, then
 * approved — newest edits first inside each group.
 *
 * Actions:
 *   - Approve  → page goes live for the public instantly.
 *   - Reject   → REASON REQUIRED (shown to the coach inside his landing
 *                editor); the page stays hidden until he edits again.
 *
 * Mobile-first: rows render as stacked CARDS below md (the accounts-page
 * lesson — a wide table clips the actions column on phones).
 */

type PageRow = {
  coach_id: string;
  coach_name: string;
  coach_email: string;
  coach_role: string;
  slug: string;
  headline: string;
  is_published: boolean;
  review_status: "pending" | "approved" | "rejected";
  review_note: string;
  reviewed_at: string | null;
  updated_at: string | null;
  photo_url: string;
};

type Counts = { total: number; pending: number; rejected: number; approved: number };
type Filter = "pending" | "rejected" | "approved" | "all";

export function AdminCoachPagesView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [pages, setPages] = useState<PageRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, rejected: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coach-pages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      setPages(data.pages ?? []);
      setCounts(data.counts ?? { total: 0, pending: 0, rejected: 0, approved: 0 });
      setMigrationMissing(data.migration_missing ?? null);
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ في تحميل الصفحات" : "Failed to load pages"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? pages : pages.filter((p) => p.review_status === filter)),
    [pages, filter],
  );

  const review = async (row: PageRow, action: "approve" | "reject", note = "") => {
    setBusyId(row.coach_id);
    try {
      const res = await fetch("/api/admin/coach-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: row.coach_id, action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      setPages((prev) =>
        prev.map((p) =>
          p.coach_id === row.coach_id
            ? {
                ...p,
                review_status: action === "approve" ? "approved" : "rejected",
                review_note: action === "approve" ? "" : note,
              }
            : p,
        ),
      );
      setCounts((c) => {
        const next = { ...c };
        if (row.review_status === "pending") next.pending = Math.max(0, next.pending - 1);
        if (row.review_status === "rejected") next.rejected = Math.max(0, next.rejected - 1);
        if (row.review_status === "approved") next.approved = Math.max(0, next.approved - 1);
        if (action === "approve") next.approved += 1;
        else next.rejected += 1;
        return next;
      });
      toast.success(
        action === "approve"
          ? isAr ? "تمت الموافقة — الصفحة ظاهرة للعامة الآن" : "Approved — page is now public"
          : isAr ? "تم الرفض — السبب هيوصله المدرب في محرر صفحته" : "Rejected — the coach sees your reason in his editor",
      );
      setRejectId(null);
      setRejectNote("");
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ" : "Error"));
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (status: PageRow["review_status"], isPublished: boolean) => {
    if (status === "pending")
      return {
        cls: "bg-[#ff9500]/10 text-[#ff9500]",
        label: isAr ? "في الانتظار" : "Pending",
      };
    if (status === "rejected")
      return { cls: "bg-[#ff3b30]/10 text-[#ff3b30]", label: isAr ? "مرفوضة" : "Rejected" };
    if (!isPublished)
      return {
        cls: "bg-[#86868b]/10 text-[#86868b]",
        label: isAr ? "معتمدة • غير منشورة" : "Approved • unpublished",
      };
    return { cls: "bg-[#34c759]/10 text-[#34c759]", label: isAr ? "معتمدة ومنشورة" : "Approved & live" };
  };

  const filterTabs: Array<{ key: Filter; label: string }> = [
    { key: "pending", label: isAr ? `في الانتظار (${counts.pending})` : `Pending (${counts.pending})` },
    { key: "rejected", label: isAr ? `المرفوضة (${counts.rejected})` : `Rejected (${counts.rejected})` },
    { key: "approved", label: isAr ? `المعتمدة (${counts.approved})` : `Approved (${counts.approved})` },
    { key: "all", label: isAr ? `الكل (${counts.total})` : `All (${counts.total})` },
  ];

  const fmtDate = (ts: string | null) =>
    ts ? new Date(ts).toLocaleDateString(isAr ? "ar-EG" : "en-US") : "—";

  /** Approve / reject-with-reason actions — shared by table row & card. */
  const renderActions = (row: PageRow) => {
    const busy = busyId === row.coach_id;
    if (rejectId === row.coach_id) {
      return (
        <div className="w-full space-y-2">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              isAr
                ? "اكتب سبب الرفض — المدرب هيشوفه في محرر صفحته (مطلوب)"
                : "Write the rejection reason — the coach sees it in his editor (required)"
            }
            className="w-full rounded-xl border border-[#ff3b30]/30 bg-white p-3 text-sm outline-none focus:border-[#ff3b30]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => review(row, "reject", rejectNote.trim())}
              disabled={busy || rejectNote.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              {isAr ? "تأكيد الرفض" : "Confirm reject"}
            </button>
            <button
              onClick={() => {
                setRejectId(null);
                setRejectNote("");
              }}
              disabled={busy}
              className="rounded-full px-3 py-2 text-xs text-[#6e6e73] hover:text-[#1d1d1f]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Approve — meaningful when pending or rejected */}
        {row.review_status !== "approved" && (
          <button
            onClick={() => review(row, "approve")}
            disabled={busy}
            title={isAr ? "الموافقة ونشر الصفحة" : "Approve and publish"}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#34c759]/10 px-3 py-1.5 text-xs font-medium text-[#34c759] transition-colors hover:bg-[#34c759]/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {isAr ? "موافقة" : "Approve"}
          </button>
        )}
        {/* Reject — hidden for already-rejected (use approve to flip back) */}
        {row.review_status !== "rejected" && (
          <button
            onClick={() => {
              setRejectId(row.coach_id);
              setRejectNote("");
            }}
            disabled={busy}
            title={isAr ? "الرفض مع إرسال السبب" : "Reject with reason"}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30]/10 px-3 py-1.5 text-xs font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/20 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {isAr ? "رفض" : "Reject"}
          </button>
        )}
        {/* Public preview */}
        <a
          href={`/coaches/${row.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title={isAr ? "معاينة الصفحة العامة" : "Preview public page"}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed]"
        >
          <Eye className="h-3.5 w-3.5" />
          {isAr ? "معاينة" : "Preview"}
        </a>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "صفحات المدربين" : "Coach pages"}
        </h1>
        <p className="mt-2 max-w-3xl text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "راجع المحتوى اللي بيكتبه المدربون على صفحاتهم العامة. أي تعديل جديد من المدرب بيرجع الصفحة لـ«في الانتظار» لحد ما توافق — والرفض بيوصله مع السبب في محرر صفحته."
            : "Review the content coaches write on their public pages. Any coach edit sends the page back to PENDING until you approve — rejections reach the coach with your reason in his editor."}
        </p>
      </div>

      {migrationMissing && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#ff9500]/30 bg-[#ff9500]/5 p-4 text-sm text-[#ff9500]">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {isAr
              ? `هجرة ${migrationMissing} غير مطبقة على قاعدة البيانات — شغّل ملف RUN_ON_SUPABASE_${migrationMissing} في Supabase SQL Editor أولًا.`
              : `Migration ${migrationMissing} is not applied — run RUN_ON_SUPABASE_${migrationMissing}.sql in the Supabase SQL Editor first.`}
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-medium transition-colors",
              filter === tab.key
                ? "bg-[#1d1d1f] text-white"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#0071e3]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-[#f5f5f7] p-12 text-center">
          <LayoutTemplate className="mx-auto h-10 w-10 text-[#d2d2d7]" />
          <p className="mt-3 text-sm text-[#6e6e73]">
            {filter === "pending"
              ? isAr ? "مفيش صفحات في الانتظار — كله متراجع" : "Nothing pending — all reviewed"
              : isAr ? "مفيش صفحات هنا" : "No pages here"}
          </p>
        </div>
      ) : (
        <>
          {/* ═══ MOBILE (below md): stacked cards ═══ */}
          <div className="space-y-3 md:hidden">
            {filtered.map((row) => {
              const badge = statusBadge(row.review_status, row.is_published);
              return (
                <div key={row.coach_id} className="rounded-2xl border border-[#d2d2d7] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.coach_name}</span>
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 break-all text-xs text-[#6e6e73]" dir="ltr">
                    {row.coach_email || row.coach_id}
                  </p>
                  {row.headline && (
                    <p className="mt-2 line-clamp-2 text-sm text-[#1d1d1f]">«{row.headline}»</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#86868b]">
                    <span dir="ltr">/coaches/{row.slug}</span>
                    <span>{isAr ? "آخر تعديل:" : "Edited:"} {fmtDate(row.updated_at)}</span>
                  </div>
                  {row.review_status === "rejected" && row.review_note && (
                    <p className="mt-2 rounded-xl bg-[#ff3b30]/5 p-2.5 text-xs text-[#ff3b30]">
                      {isAr ? "سبب الرفض:" : "Reason:"} {row.review_note}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#d2d2d7]/60 pt-3">
                    {renderActions(row)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ DESKTOP (md+): table ═══ */}
          <div className="hidden overflow-hidden rounded-3xl border border-[#d2d2d7] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f5f5f7] text-xs text-[#6e6e73]">
                  <th className="p-4 text-start font-medium">{isAr ? "المدرب" : "Coach"}</th>
                  <th className="p-4 text-start font-medium">{isAr ? "الصفحة" : "Page"}</th>
                  <th className="p-4 text-start font-medium">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-4 text-start font-medium">{isAr ? "آخر تعديل" : "Edited"}</th>
                  <th className="p-4 text-end font-medium">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const badge = statusBadge(row.review_status, row.is_published);
                  return (
                    <tr key={row.coach_id} className="border-t border-[#d2d2d7]/60 align-top">
                      <td className="p-4">
                        <span className="font-medium">{row.coach_name}</span>
                        <p className="mt-0.5 text-xs text-[#6e6e73]" dir="ltr">
                          {row.coach_email || row.coach_id}
                        </p>
                      </td>
                      <td className="max-w-xs p-4">
                        {row.headline && <p className="line-clamp-2">«{row.headline}»</p>}
                        <a
                          href={`/coaches/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#0071e3] hover:underline"
                          dir="ltr"
                        >
                          /coaches/{row.slug}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {row.review_status === "rejected" && row.review_note && (
                          <p className="mt-1.5 text-xs text-[#ff3b30]">
                            {isAr ? "سبب الرفض:" : "Reason:"} {row.review_note}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-medium", badge.cls)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-[#6e6e73]">{fmtDate(row.updated_at)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end">{renderActions(row)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-[#6e6e73]">
        {isAr
          ? "ملاحظة: الموافقة بتنشر المحتوى للعامة فورًا، والرفض بيخفي الصفحة لحد ما المدرب يعدّل — وكل تعديل جديد بيرجع الصفحة للانتظار تلقائيًا."
          : "Note: approving publishes the content instantly; rejecting hides the page until the coach edits — every new edit re-enters the queue automatically."}
      </p>
    </div>
  );
}
