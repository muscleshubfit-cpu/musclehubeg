"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { cn } from "@/lib/utils";
import { listSubscriptionRequests, reviewSubscriptionRequest, getReceiptSignedUrl } from "@/lib/data";
import { MEMBERSHIPS } from "@/lib/memberships";
import { getTier, type TierId } from "@/lib/plans";
import { toast } from "sonner";

type FilterTab = "pending" | "approved" | "rejected" | "all";

export function CoachPaymentsView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { navigate } = useNav();
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await listSubscriptionRequests(filter);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

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
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setReviewing(null);
    }
  };

  const openReceipt = async (path: string) => {
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
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("nav.admin")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("admin.subtitle")}</p>
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
