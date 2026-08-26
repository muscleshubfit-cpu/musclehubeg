"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  getReferralStats,
  createPayoutRequest,
  COMMISSION_RATE,
  MINIMUM_PAYOUT,
  type ReferralStats,
  type PayoutMethod,
} from "@/lib/referral";
import { getAffiliateStats, type AffiliateStats } from "@/lib/affiliate-engine";
import { toast } from "sonner";
import { AffiliateToolkit } from "@/components/views/AffiliateToolkit";
import { CopyButton } from "@/components/ui/copy-button";
import {
  buildAffiliateUrl,
  buildPromoCopy,
  PROMO_TEMPLATES,
} from "@/lib/affiliate-content";
import {
  Link2,
  TrendingUp,
  Users,
  Coins,
  Wallet,
  FileText,
  LayoutGrid,
} from "lucide-react";

export function ReferralView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const isAr = lang === "ar";
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
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
    try {
      const [s, affS] = await Promise.all([
        getReferralStats(profile.id),
        getAffiliateStats(profile.id),
      ]);
      setStats(s);
      setAffiliateStats(affS);
    } catch (e: any) {
      console.error("[ReferralView] load failed:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [profile]);

  const referralLink = useMemo(
    () => (stats?.referralCode ? buildAffiliateUrl(stats.referralCode) : ""),
    // React Compiler wants the whole `stats` object here so it can prove
    // the memo is stable. Using `stats?.referralCode` makes the dependency
    // narrower than what the compiler can verify statically.
    [stats],
  );

  const shareWhatsApp = () => {
    // Use the existing WhatsApp template from affiliate-content.ts
    // (single source of truth — same text as the toolkit's WhatsApp card)
    const text = buildPromoCopy(PROMO_TEMPLATES[1], referralLink, isAr);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareFacebook = () => {
    // Facebook's sharer.php only accepts a URL — it ignores custom text
    // (Facebook deprecated the `quote=` parameter). The preview is rendered
    // from the page's Open Graph metadata. We share the URL; the OG tags
    // on the homepage accurately describe MuscleHubEG as a comprehensive
    // sports platform with exercises, programs, calculators, and coaching.
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, "_blank");
  };

  const shareX = () => {
    // Use the existing short social template from affiliate-content.ts
    // (single source of truth — same text as the toolkit's Short Social card)
    const text = buildPromoCopy(PROMO_TEMPLATES[2], referralLink, isAr);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Download QR Code as PNG — fetches the image from the QR API,
  // converts to a blob, and triggers a download. This works cross-origin
  // because api.qrserver.com sends CORS headers.
  const downloadQr = async () => {
    if (!referralLink) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(referralLink)}`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `musclehubeg-affiliate-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(isAr ? "تم تحميل QR Code" : "QR Code downloaded");
    } catch (e: any) {
      toast.error(isAr ? "تعذر تحميل QR Code" : "Failed to download QR Code");
    }
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
          {isAr ? "برنامج الأفلييت والعمولات" : "Affiliate & Commission Program"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? `اكسب ${(COMMISSION_RATE * 100).toFixed(0)}% عمولة من كل صديق يشترك. العمولة بتتضاف لرصيدك لما الدفع يتأكد.`
            : `Earn ${(COMMISSION_RATE * 100).toFixed(0)}% commission for each friend who subscribes. Commission is added when payment is confirmed.`}
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

      {/* ── Section: YOUR LINK — single, modern link card ── */}
      <SectionHeader
        id="sec-link"
        icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "رابطك" : "YOUR LINK"}
      />

      {/* Modern link card — dark gradient, compact, all-in-one */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d1d1f] to-[#0a0a0a] text-white">
        {/* Top: link + copy */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Link2 className="h-5 w-5 text-[#5ac8fa]" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                {isAr ? "رابط الأفلييت الخاص بك" : "Your Affiliate Link"}
              </h2>
              <p className="mt-1 text-xs font-normal text-gray-400 sm:text-sm">
                {isAr ? "شاركه. الكوكيز بيدوم 30 يوم." : "Share it. Cookie lasts 30 days."}
              </p>
            </div>
          </div>

          {/* URL input + Copy — stacks on mobile, row on desktop */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={referralLink}
              readOnly
              dir="ltr"
              aria-label={isAr ? "رابط الأفلييت" : "Affiliate link"}
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-mono text-xs text-white outline-none focus:border-[#5ac8fa] sm:text-sm"
            />
            <CopyButton
              value={referralLink}
              label={isAr ? "نسخ" : "Copy"}
              successLabel={isAr ? "تم النسخ ✓" : "Copied ✓"}
              errorLabel={isAr ? "تعذر" : "Failed"}
              variant="primary"
              analyticsEvent="affiliate_link_copied"
              analyticsPayload={{ source: "dashboard_link_card" }}
              ariaLabel={isAr ? "نسخ رابط الأفلييت" : "Copy affiliate link"}
              className="shrink-0"
            />
          </div>

          {/* Share buttons — compact, responsive */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={shareWhatsApp}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:text-sm"
            >
              WhatsApp
            </button>
            <button
              onClick={shareFacebook}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#1877F2] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:text-sm"
            >
              Facebook
            </button>
            <button
              onClick={shareX}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#1d1d1f] transition-opacity hover:opacity-90 sm:text-sm"
            >
              X
            </button>
          </div>
        </div>

        {/* Bottom: QR code + Download — side-by-side on desktop, stacked on mobile */}
        {referralLink && (
          <div className="flex flex-col items-center gap-4 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(referralLink)}`}
              alt={isAr ? "QR Code لرابط الأفلييت" : "QR Code for affiliate link"}
              className="h-32 w-32 shrink-0 rounded-xl bg-white p-2 sm:h-36 sm:w-36"
            />
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <p className="text-sm font-medium">
                {isAr ? "امسح أو حمّل QR Code" : "Scan or Download QR Code"}
              </p>
              <p className="mt-1 text-xs font-normal text-gray-400">
                {isAr ? "يحتوي على رابطك الشخصي. يعمل مطبوعًا أو رقميًا." : "Encodes your personal link. Works printed or digital."}
              </p>
              <button
                onClick={downloadQr}
                className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:text-sm"
              >
                {isAr ? "تحميل QR" : "Download QR"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section: EARNINGS — Stats (3 cards) ── */}
      <SectionHeader
        id="sec-earnings"
        icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "الأرباح" : "EARNINGS"}
      />
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

      {/* Commission breakdown (affiliate engine) */}
      {affiliateStats && (affiliateStats.initialCommissions > 0 || affiliateStats.renewalCommissions > 0 || affiliateStats.productCommissions > 0) && (
        <div className="rounded-3xl bg-[#f5f5f7] p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "تفصيل العمولات" : "Commission Breakdown"}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-2xl font-semibold tracking-tight text-[#0071e3]">{affiliateStats.initialCommissions}</p>
              <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "اشتراكات أولية" : "Initial Subs"}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-2xl font-semibold tracking-tight text-[#34c759]">{affiliateStats.renewalCommissions}</p>
              <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "تجديدات" : "Renewals"}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-2xl font-semibold tracking-tight text-[#ff9500]">{affiliateStats.productCommissions}</p>
              <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "منتجات" : "Products"}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-2xl font-semibold tracking-tight text-[#ff3b30]">{affiliateStats.reversedEarnings > 0 ? `$${affiliateStats.reversedEarnings.toFixed(2)}` : "0"}</p>
              <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "مرتجع" : "Reversed"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section: REFERRALS ── */}
      <SectionHeader
        id="sec-referrals"
        icon={<Users className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "الإحالات" : "REFERRALS"}
      />
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

      {/* ── Section: COMMISSIONS ── */}
      <SectionHeader
        id="sec-commissions"
        icon={<Coins className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "العمولات" : "COMMISSIONS"}
      />
      {stats && stats.earnings.length > 0 && (
        <div className="rounded-3xl bg-[#f5f5f7] p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "سجل العمولات" : "Commission Log"}
          </h2>
          <div className="mt-6 space-y-3">
            {stats.earnings.slice(0, 20).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <div>
                  <p className="text-sm font-medium">${Number(e.amount).toFixed(2)}</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {new Date(e.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-normal ${
                    e.status === "paid"
                      ? "bg-[#0071e3]/10 text-[#0071e3]"
                      : e.status === "available"
                        ? "bg-[#34c759]/10 text-[#1d8a3d]"
                        : e.status === "requested"
                          ? "bg-[#ff9500]/10 text-[#ff9500]"
                          : "bg-[#6e6e73]/10 text-[#6e6e73]"
                  }`
                }
                >
                  {e.status === "paid"
                    ? isAr ? "تم الصرف" : "Paid"
                    : e.status === "available"
                      ? isAr ? "متاح" : "Available"
                      : e.status === "requested"
                        ? isAr ? "مطلوب" : "Requested"
                        : isAr ? "معلق" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section: PAYOUTS ── */}
      <SectionHeader
        id="sec-payouts"
        icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "المدفوعات" : "PAYOUTS"}
      />
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

      {/* ── Sections: PROMOTIONAL CONTENT + WEBSITE BANNERS ── */}
      <SectionHeader
        id="sec-promo"
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "المحتوى الترويجي" : "PROMOTIONAL CONTENT"}
      />

      <SectionHeader
        id="sec-banners"
        icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
        title={isAr ? "بانرات الموقع" : "WEBSITE BANNERS"}
      />

      <AffiliateToolkit />

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

// ─────────────────────────────────────────────────────────────────────────
// Small section header used to organise the dashboard into clear sections.
// Visual anchor only — does not change any financial/payout data flow.
// ─────────────────────────────────────────────────────────────────────────
function SectionHeader({
  id,
  title,
  icon,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 pt-4"
      role="heading"
      aria-level={2}
      aria-label={title}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8e8e93]">
        <span className="text-[#0071e3]">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-[#d2d2d7] to-transparent" aria-hidden="true" />
    </div>
  );
}
