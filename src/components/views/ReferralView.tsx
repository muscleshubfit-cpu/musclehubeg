"use client";
import { Reveal, PageFade } from "@/components/motion";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  getReferralStats,
  getOrCreateReferralCode,
  createPayoutRequest,
  COMMISSION_RATE,
  MINIMUM_PAYOUT,
  type ReferralStats,
  type PayoutMethod,
} from "@/lib/referral";
import { toast } from "sonner";

export function ReferralView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const isAr = lang === "ar";
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("cash_wallet");
  const [walletNumber, setWalletNumber] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const s = await getReferralStats(profile.id);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  const referralLink = stats?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${stats.referralCode}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(isAr ? "تم نسخ الرابط!" : "Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = isAr
      ? `جرب MuscleHub معايا! منصة كوتشينج أونلاين للتغذية واللياقة. سجل برابطي واحصل على خصم: ${referralLink}`
      : `Try MuscleHub with me! Online coaching for nutrition and fitness. Sign up with my link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, "_blank");
  };

  const shareX = () => {
    const text = isAr
      ? `جرب MuscleHub! كوتشينج أونلاين مع الكوتش أحمد زكي + ذكاء اصطناعي. ${referralLink}`
      : `Try MuscleHub! Online coaching with Coach Ahmed Zake + AI. ${referralLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const submitPayout = async () => {
    if (!profile) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < MINIMUM_PAYOUT) {
      toast.error(isAr ? `الحد الأدنى للصرف هو $${MINIMUM_PAYOUT}` : `Minimum payout is $${MINIMUM_PAYOUT}`);
      return;
    }
    if (amount > (stats?.availableBalance || 0)) {
      toast.error(isAr ? "المبلغ أكبر من رصيدك المتاح" : "Amount exceeds available balance");
      return;
    }
    if (payoutMethod === "cash_wallet" && !walletNumber.trim()) {
      toast.error(isAr ? "أدخل رقم المحفظة" : "Enter wallet number");
      return;
    }
    if (payoutMethod === "bank_transfer" && !bankDetails.trim()) {
      toast.error(isAr ? "أدخل بيانات البنك" : "Enter bank details");
      return;
    }

    setSubmitting(true);
    try {
      await createPayoutRequest(
        profile.id,
        amount,
        payoutMethod,
        payoutMethod === "cash_wallet" ? walletNumber : undefined,
        payoutMethod === "bank_transfer" ? bankDetails : undefined,
      );
      toast.success(isAr ? "تم إرسال طلب الصرف!" : "Payout request submitted!");
      setShowPayoutModal(false);
      setPayoutAmount("");
      setWalletNumber("");
      setBankDetails("");
      await load();
    } catch (e: any) {
      toast.error(e.message || (isAr ? "حدث خطأ" : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "نظام الإحالة والعمولات" : "Referral & Commission System"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? `اكسب ${COMMISSION_RATE * 100}% عمولة من كل صديق يشترك. العمولة تُضاف لرصيدك عند تأكيد الدفع.`
            : `Earn ${COMMISSION_RATE * 100}% commission for each friend who subscribes. Commission is added when payment is confirmed.`}
        </p>
      </div>

      {/* Balance — Large */}
      <div className="rounded-3xl bg-[#1d1d1f] p-8 text-white md:p-10">
        <p className="text-xs font-normal uppercase tracking-wide text-gray-400">
          {isAr ? "رصيدك المتاح" : "Available Balance"}
        </p>
        <p className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">
          ${stats?.availableBalance.toFixed(2) || "0.00"}
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={(stats?.availableBalance || 0) < MINIMUM_PAYOUT}
            className="rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isAr ? "طلب صرف" : "Request Payout"}
          </button>
          <div className="flex items-center gap-4 text-sm font-normal text-gray-400">
            <span>
              {isAr ? "إجمالي الأرباح:" : "Total earned:"} <strong className="text-white">${stats?.totalEarnings.toFixed(2) || "0.00"}</strong>
            </span>
            <span>
              {isAr ? "تم صرفه:" : "Paid out:"} <strong className="text-white">${stats?.paidOut.toFixed(2) || "0.00"}</strong>
            </span>
          </div>
        </div>
        {(stats?.availableBalance || 0) < MINIMUM_PAYOUT && (
          <p className="mt-4 text-xs font-normal text-gray-500">
            {isAr ? `الحد الأدنى للصرف هو $${MINIMUM_PAYOUT}` : `Minimum payout is $${MINIMUM_PAYOUT}`}
          </p>
        )}
      </div>

      {/* Referral Link + Share */}
      <div className="rounded-3xl bg-[#f5f5f7] p-8 md:p-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {isAr ? "رابط الإحالة الخاص بك" : "Your Referral Link"}
        </h2>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr ? "شارك الرابط ده. الكوكيز بتدوم 30 يوم." : "Share this link. Cookie lasts 30 days."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={referralLink}
            readOnly
            dir="ltr"
            className="flex-1 rounded-full border border-[#d2d2d7] bg-white px-5 py-3 font-mono text-sm font-normal outline-none"
          />
          <button
            onClick={copyLink}
            className="shrink-0 rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90"
          >
            {copied ? (isAr ? "✓ اتنسخ!" : "✓ Copied!") : (isAr ? "نسخ" : "Copy")}
          </button>
        </div>

        {/* Share buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={shareWhatsApp}
            className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
          >
            WhatsApp
          </button>
          <button
            onClick={shareFacebook}
            className="rounded-full bg-[#1877F2] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
          >
            Facebook
          </button>
          <button
            onClick={shareX}
            className="rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
          >
            X (Twitter)
          </button>
        </div>

        {/* QR Code */}
        {referralLink && (
          <div className="mt-8 flex flex-col items-center">
            <p className="mb-4 text-sm font-normal text-[#6e6e73]">
              {isAr ? "QR Code — امسح أو اطبع" : "QR Code — scan or print"}
            </p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`}
              alt="Referral QR Code"
              className="h-48 w-48 rounded-2xl bg-white p-3"
            />
          </div>
        )}
      </div>

      {/* Stats — 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{stats?.total || 0}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "إجمالي الدعوات" : "Total invites"}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#0071e3]">{stats?.completed || 0}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "اكتملت" : "Completed"}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{stats?.pending || 0}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "في الانتظار" : "Pending"}</p>
        </div>
      </div>

      {/* Referrals list */}
      {stats && stats.referrals.length > 0 && (
        <div className="rounded-3xl bg-[#f5f5f7] p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "الدعوات" : "Referrals"}
          </h2>
          <div className="mt-6 space-y-3">
            {stats.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <div>
                  <p className="text-sm font-medium">{r.referred_name || r.referred_email || "—"}</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {new Date(r.created_at).toLocaleDateString()}
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
                    {r.status === "completed"
                      ? isAr ? "اكتملت" : "Completed"
                      : r.status === "pending"
                        ? isAr ? "في الانتظار" : "Pending"
                        : isAr ? "مرفوضة" : "Rejected"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout history */}
      {stats && stats.payouts.length > 0 && (
        <div className="rounded-3xl bg-[#f5f5f7] p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "طلبات الصرف" : "Payout Requests"}
          </h2>
          <div className="mt-6 space-y-3">
            {stats.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <div>
                  <p className="text-sm font-medium">${p.amount.toFixed(2)}</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {new Date(p.created_at).toLocaleDateString()} · {p.method === "cash_wallet" ? (isAr ? "محفظة كاش" : "Cash Wallet") : p.method === "subscription_discount" ? (isAr ? "خصم اشتراك" : "Subscription Discount") : (isAr ? "تحويل بنكي" : "Bank Transfer")}
                  </p>
                  {p.admin_note && (
                    <p className="mt-1 text-xs font-normal text-[#6e6e73]">{p.admin_note}</p>
                  )}
                </div>
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
            ))}
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPayoutModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold tracking-tight">
              {isAr ? "طلب صرف العمولة" : "Request Payout"}
            </h2>
            <p className="mt-2 text-sm font-normal text-[#6e6e73]">
              {isAr ? `رصيدك المتاح: $${stats?.availableBalance.toFixed(2)}` : `Available: $${stats?.availableBalance.toFixed(2)}`}
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isAr ? "المبلغ ($)" : "Amount ($)"}
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={isAr ? `الحد الأدنى $${MINIMUM_PAYOUT}` : `Min $${MINIMUM_PAYOUT}`}
                  className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isAr ? "طريقة الصرف" : "Payout Method"}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayoutMethod("cash_wallet")}
                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                      payoutMethod === "cash_wallet" ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}
                  >
                    {isAr ? "محفظة كاش" : "Cash Wallet"}
                  </button>
                  <button
                    onClick={() => setPayoutMethod("subscription_discount")}
                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                      payoutMethod === "subscription_discount" ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}
                  >
                    {isAr ? "خصم اشتراك" : "Sub. Discount"}
                  </button>
                  <button
                    onClick={() => setPayoutMethod("bank_transfer")}
                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-normal transition-all ${
                      payoutMethod === "bank_transfer" ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}
                  >
                    {isAr ? "تحويل بنكي" : "Bank"}
                  </button>
                </div>
              </div>

              {payoutMethod === "cash_wallet" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isAr ? "رقم المحفظة (فودافون كاش / انستاباي)" : "Wallet Number (Vodafone Cash / InstaPay)"}
                  </label>
                  <input
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    placeholder="01000000000"
                    dir="ltr"
                    className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
                  />
                </div>
              )}

              {payoutMethod === "bank_transfer" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isAr ? "بيانات البنك (اسم البنك + رقم الحساب)" : "Bank Details (Bank name + Account number)"}
                  </label>
                  <textarea
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder={isAr ? "البنك الأهلي - 1234567890" : "National Bank - 1234567890"}
                    rows={3}
                    className="w-full rounded-2xl border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
                  />
                </div>
              )}

              {payoutMethod === "subscription_discount" && (
                <p className="rounded-2xl bg-[#f5f5f7] p-4 text-sm font-normal text-[#6e6e73]">
                  {isAr
                    ? "هيتم خصم المبلغ من اشتراكك القادم. سيتم التواصل معاك للتأكيد."
                    : "Amount will be deducted from your next subscription. We'll contact you to confirm."}
                </p>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 rounded-full border border-[#d2d2d7] bg-white px-5 py-3 text-sm font-normal transition-opacity hover:opacity-90"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={submitPayout}
                disabled={submitting}
                className="flex-1 rounded-full bg-[#0071e3] px-5 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "..." : (isAr ? "إرسال الطلب" : "Submit Request")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
