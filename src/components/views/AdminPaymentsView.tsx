"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { cn } from "@/lib/utils";
import { listSubscriptionRequests, reviewSubscriptionRequest, getReceiptSignedUrl } from "@/lib/data";
import { MEMBERSHIPS } from "@/lib/memberships";
import { getTier, type TierId } from "@/lib/plans";
import { toast } from "sonner";
import type { SubscriptionRequest } from "@/lib/supabase/types";

/**
 * ADMIN PAYMENTS VIEW (0043 — renamed from CoachPaymentsView).
 *
 * TERMINOLOGY LAW (AGENTS.md §10): this surface reviews SITE COACHING
 * (B2C) purchases only — clients who paid THE SITE manually (InstaPay /
 * Vodafone Cash) and uploaded a receipt (subscription_requests). Under
 * the owner's model decree these are ADMIN-ONLY:
 *   - UI:  /coach/payments page removed; this lives at /admin/payments.
 *   - DB:  0043 dropped every coach RLS policy on subscription_requests.
 *   - API: payment_request notifications route to the admin, never to
 *          the assigned coach.
 * The coach's own money flow (B2B) is the wallet + coach_payments ledger
 * and lives in CoachClientView / CoachWalletView — never here.
 */

type FilterTab = "pending" | "approved" | "rejected" | "all";

// PHASE 76 — 7-day refund requests (owner: استرداد خلال 7 أيام بشرط
// عدم استخدام المميزات + مراعاة إلغاء الاشتراكات في سحب أرباح الأفيليت).
type RefundRow = {
  id: string;
  user_id: string;
  tier: string;
  months: number | null;
  amount_usd: number | null;
  payment_source: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  usage_snapshot: { evoChats?: number; planGenerations?: number; swaps?: number; coachPlans?: number; savedResults?: number; total?: number } | null;
  created_at: string;
  user_name: string;
  user_email: string;
};

export function AdminPaymentsView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { navigate } = useNav();
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [rows, setRows] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  // PHASE 76 — refund requests list
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [refundBusy, setRefundBusy] = useState<string | null>(null);

  const loadRefunds = async () => {
    setRefundsLoading(true);
    try {
      const res = await fetch("/api/admin/refunds");
      if (res.ok) {
        const body = await res.json();
        setRefunds(body.rows ?? []);
      }
    } finally {
      setRefundsLoading(false);
    }
  };

  const decideRefund = async (id: string, action: "approve" | "reject") => {
    let note: string | undefined;
    if (action === "reject") {
      note = prompt(isAr ? "سبب الرفض (اختياري):" : "Rejection reason (optional):") || undefined;
    } else if (
      !confirm(
        isAr
          ? "تأكيد قبول الاسترداد؟ سيتم إيقاف الاشتراك فورًا + عكس عمولات الأفيليت المرتبطة بالدفع."
          : "Approve refund? The subscription ends now + linked affiliate commissions are reversed.",
      )
    ) {
      return;
    }
    setRefundBusy(id);
    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Request failed");
      toast.success(
        action === "approve"
          ? isAr
            ? `تم قبول الاسترداد${body?.reversed ? ` — تم عكس ${body.reversed} عمولة أفيليت` : " — مفيش عمولات مرتبطة"}`
            : `Refund approved${body?.reversed ? ` — ${body.reversed} commission(s) reversed` : ""}`
          : isAr
            ? "تم رفض الطلب"
            : "Request rejected",
      );
      await loadRefunds();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setRefundBusy(null);
    }
  };

  const load = async () => {
    setLoading(true);
    const data = await listSubscriptionRequests(filter);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    loadRefunds();
  }, []);

  const review = async (id: string, action: "approve" | "reject") => {
    // M55 fix: ask for rejection reason so the client gets actionable feedback
    let adminNote: string | undefined;
    if (action === "reject") {
      adminNote = prompt(isAr ? "سبب الرفض (اختياري):" : "Rejection reason (optional):") || undefined;
    }
    setReviewing(id);
    try {
      await reviewSubscriptionRequest(id, action, adminNote);
      toast.success(action === "approve" ? t("admin.approvedToast") : t("admin.rejectedToast"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setReviewing(null);
    }
  };

  // Accepts null: the JSX guard hides the button when receipt_path is null,
  // but the click handler must accept the row's nullable field type.
  const openReceipt = async (path: string | null) => {
    if (!path) return;
    try {
      const url = await getReceiptSignedUrl(path);
      if (url) window.open(url, "_blank", "noopener");
    } catch {
      toast.error(t("common.error"));
    }
  };

  // Resolve membership tier name from new MEMBERSHIPS table OR legacy plans
  const tierName = (planTier: string) => {
    const m = MEMBERSHIPS.find((x) => x.id === planTier);
    if (m) return isAr ? m.nameAr : m.nameEn;
    const legacy = getTier(planTier as TierId);
    if (legacy) return t(legacy.nameKey);
    return planTier || "—";
  };

  // Resolve tier color (for badge styling)
  const tierColor = (planTier: string) => {
    if (planTier === "premium") return { bg: "bg-[#0071e3]/10", text: "text-[#0071e3]" };
    if (planTier === "pro") return { bg: "bg-[#1d1d1f]/10", text: "text-[#1d1d1f]" };
    if (planTier === "coaching") return { bg: "bg-[#8b5cf6]/10", text: "text-[#8b5cf6]" };
    if (planTier === "starter") return { bg: "bg-[#34c759]/10", text: "text-[#34c759]" };
    if (planTier === "elite") return { bg: "bg-[#ff9500]/10", text: "text-[#ff9500]" };
    return { bg: "bg-[#6e6e73]/10", text: "text-[#6e6e73]" };
  };

  const tabs: FilterTab[] = ["pending", "approved", "rejected", "all"];

  // Count pending for emphasis
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "عضويات الموقع — طلبات الدفع" : "Site memberships — payment requests"}
        </h1>
        <p className="mt-2 max-w-3xl text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "طلبات عملاء دفعوا للموقع يدويًا (انستاباي / فودافون كاش) ورفعوا إيصال — مراجعتها للأدمن فقط. مدفوعات المدربين مع عملائهم (نظام المدربين B2B) بتنصرف من محفظة المدرب ومش ظاهرة هنا."
            : "Clients who paid THE SITE manually (InstaPay / Vodafone Cash) and uploaded a receipt — admin reviews them. Coach↔client money (the B2B coach system) flows through the coach wallet and never appears here."}
        </p>
      </div>

      {/* Tabs — Apple-style segmented control */}
      <div className="inline-flex rounded-full bg-[#f5f5f7] p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-normal transition-all",
              filter === tab ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]",
            )}
          >
            {t(`admin.${tab}`)}
            {tab === "pending" && filter !== "pending" && pendingCount > 0 && (
              <span className="ms-1.5 rounded-full bg-[#ff9500] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">{t("common.loading")}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
          {t("admin.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const tierCls = tierColor(r.plan_tier);
            return (
              <div key={r.id} className="rounded-2xl bg-[#f5f5f7] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-base font-medium">{r.full_name}</h3>
                      <StatusPill status={r.status} t={t} />
                    </div>
                    <p dir="ltr" className="mt-1 text-sm font-normal text-[#6e6e73]">{r.whatsapp}</p>
                    <p className="mt-1 text-xs font-normal text-[#6e6e73]">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-end">
                    <div className="text-xl font-semibold">${r.price_usd}</div>
                    <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                      {r.duration_months} {t("admin.duration")}
                    </p>
                  </div>
                </div>

                {/* Membership tier badge + payment method */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", tierCls.bg, tierCls.text)}>
                    {tierName(r.plan_tier)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-normal">
                    {r.payment_method === "instapay" ? t("checkout.instapay") : t("checkout.vodafone")}
                  </span>
                  {r.receipt_path && (
                    <button
                      onClick={() => openReceipt(r.receipt_path)}
                      className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
                    >
                      {t("admin.viewReceipt")} ›
                    </button>
                  )}
                  {/* Direct link to manage this client */}
                  <button
                    onClick={() => navigate("coach-client", { clientId: r.user_id })}
                    className="text-sm font-normal text-[#6e6e73] transition-opacity hover:opacity-70"
                  >
                    {isAr ? "إدارة العميل ›" : "Manage client ›"}
                  </button>
                  {r.status === "pending" && (
                    <div className="ms-auto flex gap-2">
                      <button
                        disabled={reviewing === r.id}
                        onClick={() => review(r.id, "reject")}
                        className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal text-[#ff3b30] transition-opacity hover:opacity-90"
                      >
                        {t("admin.reject")}
                      </button>
                      <button
                        disabled={reviewing === r.id}
                        onClick={() => review(r.id, "approve")}
                        className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
                      >
                        {reviewing === r.id ? "..." : t("admin.approve")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PHASE 76 — 7-DAY REFUND REQUESTS ─────────────────────────
          Owner: استرداد خلال 7 أيام بشرط عدم استخدام المميزات + سحب
          أرباح الأفيليت لازم يراعي إلغاء الاشتراكات. Eligibility is
          enforced server-side BEFORE the request reaches this list —
          every pending row already passed the no-features-used check. */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {isAr ? "طلبات الاسترداد (خلال 7 أيام)" : "Refund requests (7-day window)"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-normal text-[#6e6e73] md:text-base">
          {isAr
            ? "طلبات استرداد العضويات خلال 7 أيام من التفعيل — النظام يرفض تلقائيًا أي طلب من عضو استخدم مميزة مدفوعة. الموافقة بتوقف الاشتراك فورًا + بتلغي عمولات الأفيليت المرتبطة بالدفع (فترة أمان السحب 7 أيام بتحميك من الصرف قبلها). التحويل الفعلي للفلوس يدوي (انستاباي / فودافون كاش / PayPal)."
            : "Membership refund requests within 7 days of activation — the system auto-rejects any member who used a paid feature. Approving ends the subscription immediately and reverses the linked affiliate commissions (the 7-day payout hold protects you until then). The actual money transfer stays manual."}
        </p>
      </div>

      {refundsLoading ? (
        <div className="py-16 text-center text-base font-normal text-[#6e6e73]">{t("common.loading")}</div>
      ) : refunds.length === 0 ? (
        <div className="rounded-2xl bg-[#f5f5f7] p-10 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "مفيش طلبات استرداد" : "No refund requests"}
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((rf) => {
            const u = rf.usage_snapshot;
            return (
              <div key={rf.id} className="rounded-2xl border border-[#f2f2f7] bg-[#f5f5f7]/60 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-base font-medium">{rf.user_name}</h3>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-normal",
                          rf.status === "pending" && "bg-[#ff9500]/10 text-[#ff9500]",
                          rf.status === "approved" && "bg-[#34c759]/10 text-[#34c759]",
                          rf.status === "rejected" && "bg-[#ff3b30]/10 text-[#ff3b30]",
                        )}
                      >
                        {rf.status === "pending"
                          ? isAr ? "قيد المراجعة" : "Pending"
                          : rf.status === "approved"
                            ? isAr ? "مقبول" : "Approved"
                            : isAr ? "مرفوض" : "Rejected"}
                      </span>
                    </div>
                    <p dir="ltr" className="mt-1 text-sm font-normal text-[#6e6e73]">{rf.user_email}</p>
                    <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                      {new Date(rf.created_at).toLocaleString()}
                      {rf.payment_source ? (isAr ? ` — الدفع: ${rf.payment_source === "paypal" ? "PayPal" : "إيصال يدوي"}` : ` — payment: ${rf.payment_source}`) : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    <div className="text-xl font-semibold">${rf.amount_usd ?? "?"}</div>
                    <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                      {tierName(rf.tier)}{rf.months ? ` — ${rf.months} ${t("admin.duration")}` : ""}
                    </p>
                  </div>
                </div>

                {/* Auto-verified usage snapshot — the condition evidence */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-[#34c759]">
                    {isAr ? "التحقق التلقائي: لم يستخدم مميزات مدفوعة عند الطلب ✓" : "Auto-check: no paid features used at request time ✓"}
                  </span>
                  {u && (
                    <>
                      <span className="rounded-full bg-white px-3 py-1">{isAr ? "محادثات إيفو" : "EVO chats"}: {u.evoChats ?? 0}</span>
                      <span className="rounded-full bg-white px-3 py-1">{isAr ? "خطط مولدة" : "Plans"}: {(u.planGenerations ?? 0) + (u.coachPlans ?? 0)}</span>
                      <span className="rounded-full bg-white px-3 py-1">{isAr ? "تبديلات" : "Swaps"}: {u.swaps ?? 0}</span>
                      <span className="rounded-full bg-white px-3 py-1">{isAr ? "نتائج محفوظة" : "Saved results"}: {u.savedResults ?? 0}</span>
                    </>
                  )}
                </div>
                {rf.admin_note && (
                  <p className="mt-3 text-xs font-normal text-[#6e6e73]">{isAr ? "ملاحظة الأدمن: " : "Admin note: "}{rf.admin_note}</p>
                )}

                {rf.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={refundBusy === rf.id}
                      onClick={() => decideRefund(rf.id, "reject")}
                      className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal text-[#ff3b30] transition-opacity hover:opacity-90"
                    >
                      {t("admin.reject")}
                    </button>
                    <button
                      disabled={refundBusy === rf.id}
                      onClick={() => decideRefund(rf.id, "approve")}
                      className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
                    >
                      {refundBusy === rf.id ? "..." : isAr ? "قبول + إيقاف الاشتراك + عكس العمولات" : "Approve + end sub + reverse commissions"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: string) => string }) {
  const cls = cn(
    status === "pending" && "bg-[#ff9500]/10 text-[#ff9500]",
    status === "approved" && "bg-[#0071e3]/10 text-[#0071e3]",
    status === "rejected" && "bg-[#ff3b30]/10 text-[#ff3b30]",
  );
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-normal ${cls}`}>
      {t(`admin.${status}`)}
    </span>
  );
}
