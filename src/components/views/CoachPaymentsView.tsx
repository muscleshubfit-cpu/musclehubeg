"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { listSubscriptionRequests, reviewSubscriptionRequest, getReceiptSignedUrl } from "@/lib/data";
import { getTier, type TierId } from "@/lib/plans";
import { toast } from "sonner";

export function CoachPaymentsView() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
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
    setReviewing(id);
    try {
      await reviewSubscriptionRequest(id, action);
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

  const tabs: typeof filter[] = ["pending", "approved", "rejected", "all"];

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
          {rows.map((r) => (
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
                  <div className="text-xl font-semibold">${r.price_egp}</div>
                  <p className="text-xs font-normal text-[#6e6e73]">
                    {t(getTier(r.plan_tier as TierId)?.nameKey ?? r.plan_tier)} · {r.duration_months} {t("admin.duration")}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
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
          ))}
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

