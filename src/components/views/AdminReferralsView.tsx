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
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** Phase 67 — recent coach-activation commission row (admin overview). */
type CoachActivationRow = {
  id: string;
  amount: number;
  created_at: string;
  payer_name: string;
};

export function AdminReferralsView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [coachActivations, setCoachActivations] = useState<CoachActivationRow[]>([]);
  const [coachTotals, setCoachTotals] = useState({ count: 0, total: 0, referredCoaches: 0 });
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
    // PHASE 67 — coach-activation commissions (owner decree 2026-09-01:
    // referred coaches are part of the affiliate system). Admin SELECT
    // policies created by 0057; payer names resolved from profiles.
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: commRows } = await supabase
          .from("affiliate_commissions")
          .select("id, amount, created_at, transaction_id")
          .eq("commission_type", "coach_client_activation")
          .order("created_at", { ascending: false })
          .limit(50);
        const list = (commRows ?? []) as {
          id: string;
          amount: number;
          created_at: string;
          transaction_id: string;
        }[];
        const txnIds = list.map((c) => c.transaction_id);
        const payerById = new Map<string, string>();
        if (txnIds.length > 0) {
          const { data: txns } = await supabase
            .from("affiliate_transactions")
            .select("id, user_id")
            .in("id", txnIds);
          const userIds = ((txns ?? []) as { id: string; user_id: string }[])
            .map((t) => t.user_id)
            .filter(Boolean);
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds);
            const pById = new Map(
              ((profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(
                (p) => [p.id, p.full_name || p.email || "—"],
              ),
            );
            for (const t of ((txns ?? []) as { id: string; user_id: string }[])) {
              payerById.set(t.id, pById.get(t.user_id) ?? "—");
            }
          }
        }
        setCoachActivations(
          list.map((c) => ({
            id: c.id,
            amount: Number(c.amount),
            created_at: c.created_at,
            payer_name: payerById.get(c.transaction_id) ?? "—",
          })),
        );
        // Referred coaches WITH activations = distinct payers of
        // coach_client_activation transactions (the KPI that pays)
        const { data: txnRows } = await supabase
          .from("affiliate_transactions")
          .select("user_id")
          .eq("transaction_type", "coach_client_activation");
        const distinctPayers = new Set(
          ((txnRows ?? []) as { user_id: string }[]).map((t) => t.user_id),
        );
        setCoachTotals({
          count: list.length,
          total: list.reduce((s, c) => s + Number(c.amount), 0),
          referredCoaches: distinctPayers.size,
        });
      } catch (e) {
        console.error("[AdminReferralsView] coach-activation load failed:", e);
      }
    }
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

      {/* PHASE 67 — coach-invite affiliate program (owner decree 2026-09-01) */}
      <div className="rounded-3xl bg-[#f5f5f7] p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "🤝 دعوات انضمام المدربين" : "🤝 Coach Join Invitations"}
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xl font-semibold tracking-tight">{coachTotals.referredCoaches}</p>
              <p className="text-xs font-normal text-[#6e6e73]">{isAr ? "مدربين مدعوين" : "Referred coaches"}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xl font-semibold tracking-tight">{coachTotals.count}</p>
              <p className="text-xs font-normal text-[#6e6e73]">{isAr ? "عمولات تفعيل" : "Activation commissions"}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xl font-semibold tracking-tight text-[#0071e3]">
                ${coachTotals.total.toFixed(2)}
              </p>
              <p className="text-xs font-normal text-[#6e6e73]">{isAr ? "إجمالي العمولات" : "Total paid out"}</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs font-normal text-[#6e6e73]">
          {isAr
            ? "المدرب اللي سجل برابط أفيليت وبيفعّل عملائه بيولد 20% عمولة للي دعاه من كل تفعيل (6$ → 1.20$ / 16$ → 3.20$)."
            : "A coach who signed up via an affiliate link earns his inviter 20% of every client activation fee ($6 → $1.20 / $16 → $3.20)."}
        </p>
        {coachActivations.length > 0 && (
          <div className="mt-6 space-y-2">
            {coachActivations.slice(0, 10).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4"
              >
                <div>
                  <p className="text-sm font-medium">{row.payer_name}</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
                  +${row.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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
