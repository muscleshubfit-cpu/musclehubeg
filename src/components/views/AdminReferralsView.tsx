"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  adminGetAllReferrals,
  adminGetAllPayouts,
  adminApprovePayout,
  adminRejectPayout,
  adminGetReferralOverview,
  type Referral,
  type ReferralPayout,
} from "@/lib/referral";
import { toast } from "sonner";

export function AdminReferralsView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"referrals" | "payouts">("payouts");

  const load = async () => {
    setLoading(true);
    const [refs, pays, ov] = await Promise.all([
      adminGetAllReferrals(),
      adminGetAllPayouts(),
      adminGetReferralOverview(),
    ]);
    setReferrals(refs);
    setPayouts(pays);
    setOverview(ov);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approvePayout = async (id: string) => {
    try {
      await adminApprovePayout(id);
      toast.success(isAr ? "تم صرف العمولة" : "Payout approved");
      await load();
    } catch (e: any) {
      toast.error(e.message || (isAr ? "حدث خطأ" : "Error"));
    }
  };

  const rejectPayout = async (id: string) => {
    if (!confirm(isAr ? "رفض طلب الصرف؟" : "Reject payout?")) return;
    try {
      await adminRejectPayout(id);
      toast.success(isAr ? "تم رفض الطلب" : "Payout rejected");
      await load();
    } catch (e: any) {
      toast.error(e.message || (isAr ? "حدث خطأ" : "Error"));
    }
  };

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {isAr ? "جارٍ التحميل..." : "Loading..."}
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "إدارة الإحالات والعمولات" : "Referral & Commission Admin"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr ? "مراجعة الاحالات وطلبات الصرف" : "Review referrals and payout requests"}
        </p>
      </div>

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-[#f5f5f7] p-6">
            <p className="text-3xl font-semibold tracking-tight">{overview.totalReferrals}</p>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "إجمالي الاحالات" : "Total Referrals"}</p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f7] p-6">
            <p className="text-3xl font-semibold tracking-tight text-[#0071e3]">{overview.completedReferrals}</p>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "مكتملة" : "Completed"}</p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f7] p-6">
            <p className="text-3xl font-semibold tracking-tight">${overview.totalCommission.toFixed(2)}</p>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "إجمالي العمولات" : "Total Commission"}</p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f7] p-6">
            <p className="text-3xl font-semibold tracking-tight">${overview.pendingPayoutAmount.toFixed(2)}</p>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "مستحقات للصرف" : "Pending Payouts"}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex rounded-full bg-[#f5f5f7] p-1">
        <button
          onClick={() => setTab("payouts")}
          className={`rounded-full px-5 py-2 text-sm font-normal transition-all ${
            tab === "payouts" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"
          }`}
        >
          {isAr ? "طلبات الصرف" : "Payouts"} ({payouts.filter((p) => p.status === "pending").length})
        </button>
        <button
          onClick={() => setTab("referrals")}
          className={`rounded-full px-5 py-2 text-sm font-normal transition-all ${
            tab === "referrals" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"
          }`}
        >
          {isAr ? "الاحالات" : "Referrals"} ({referrals.length})
        </button>
      </div>

      {/* Payouts tab */}
      {tab === "payouts" && (
        <div className="space-y-3">
          {payouts.length === 0 ? (
            <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
              {isAr ? "مفيش طلبات صرف" : "No payout requests"}
            </div>
          ) : (
            payouts.map((p) => (
              <div key={p.id} className="rounded-2xl bg-[#f5f5f7] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium">{p.user_name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-normal ${
                          p.status === "paid"
                            ? "bg-[#0071e3]/10 text-[#0071e3]"
                            : p.status === "pending"
                              ? "bg-[#ff9500]/10 text-[#ff9500]"
                              : p.status === "approved"
                                ? "bg-[#0071e3]/10 text-[#0071e3]"
                                : "bg-[#ff3b30]/10 text-[#ff3b30]"
                        }`}
                      >
                        {p.status === "paid"
                          ? isAr ? "تم الصرف" : "Paid"
                          : p.status === "pending"
                            ? isAr ? "في الانتظار" : "Pending"
                            : p.status === "approved"
                              ? isAr ? "موافق" : "Approved"
                              : isAr ? "مرفوض" : "Rejected"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-normal text-[#6e6e73]">{p.user_email}</p>
                    <p className="mt-2 text-lg font-semibold">${p.amount.toFixed(2)}</p>
                    <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                      {p.method === "cash_wallet" ? (isAr ? "محفظة كاش" : "Cash Wallet") : p.method === "subscription_discount" ? (isAr ? "خصم اشتراك" : "Sub. Discount") : (isAr ? "تحويل بنكي" : "Bank Transfer")}
                    </p>
                    {(p.wallet_number || p.bank_details) && (
                      <p className="mt-1 text-xs font-mono text-[#6e6e73]">
                        {p.wallet_number || p.bank_details}
                      </p>
                    )}
                    {p.admin_note && (
                      <p className="mt-1 text-xs font-normal text-[#6e6e73]">{p.admin_note}</p>
                    )}
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejectPayout(p.id)}
                        className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal text-[#ff3b30] transition-opacity hover:opacity-90"
                      >
                        {isAr ? "رفض" : "Reject"}
                      </button>
                      <button
                        onClick={() => approvePayout(p.id)}
                        className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
                      >
                        {isAr ? "صرف" : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Referrals tab */}
      {tab === "referrals" && (
        <div className="space-y-3">
          {referrals.length === 0 ? (
            <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
              {isAr ? "مفيش احالات" : "No referrals"}
            </div>
          ) : (
            referrals.map((r) => (
              <div key={r.id} className="rounded-2xl bg-[#f5f5f7] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-medium">{r.referred_name || r.referred_email || "—"}</h3>
                    <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                      {new Date(r.created_at).toLocaleDateString()} · {isAr ? "كود" : "Code"}: {r.referral_code}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.commission_amount > 0 && (
                      <span className="text-sm font-medium text-[#0071e3]">
                        ${r.commission_amount.toFixed(2)}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-normal ${
                        r.status === "completed"
                          ? "bg-[#0071e3]/10 text-[#0071e3]"
                          : r.status === "pending"
                            ? "bg-[#ff9500]/10 text-[#ff9500]"
                            : "bg-[#ff3b30]/10 text-[#ff3b30]"
                      }`}
                    >
                      {r.status === "completed" ? (isAr ? "مكتملة" : "Completed") : r.status === "pending" ? (isAr ? "في الانتظار" : "Pending") : (isAr ? "مرفوضة" : "Rejected")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
