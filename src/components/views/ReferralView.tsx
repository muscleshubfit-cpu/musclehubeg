"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { getReferralStats, createReferral } from "@/lib/data";
import { toast } from "sonner";

export function ReferralView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const isAr = lang === "ar";
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, referrals: [] as any[] });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const s = await getReferralStats(profile.id);
      setStats(s);
      setLoading(false);
    })();
  }, [profile]);

  const referralLink = profile ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${profile.id}` : "";

  const sendInvite = async () => {
    if (!profile || !email.trim()) return;
    setSending(true);
    try {
      await createReferral(profile.id, email.trim());
      const s = await getReferralStats(profile.id);
      setStats(s);
      setEmail("");
      toast.success(isAr ? "تم إرسال الدعوة! هتاخد خصم 10% لما صديقك يشترك." : "Invitation sent! You'll get 10% discount when your friend subscribes.");
    } catch (e: any) {
      toast.error(e.message || (isAr ? "حدث خطأ" : "Something went wrong"));
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(isAr ? "تم نسخ الرابط!" : "Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "برنامج الإحالة" : "Referral Program"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "ادعي أصدقاؤك واكسب خصم 10% على اشتراكك لكل صديق يشترك!"
            : "Invite your friends and earn 10% discount for each friend who subscribes!"}
        </p>
      </div>

      {/* Stats — Apple-style large numbers */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{stats.total}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "إجمالي الدعوات" : "Total invites"}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#0071e3]">{stats.completed}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "اشتركوا" : "Subscribed"}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{stats.pending}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? "في الانتظار" : "Pending"}</p>
        </div>
      </div>

      {/* Invite by email */}
      <div className="rounded-3xl bg-[#f5f5f7] p-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {isAr ? "ادعي صديق بالإيميل" : "Invite a friend by email"}
        </h2>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr ? "هنبعتله دعوة بالإيميل، ولما يشترك هتاخد خصم 10% تلقائياً." : "We'll send them an email invitation. When they subscribe, you get 10% discount automatically."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isAr ? "صديقك@example.com" : "friend@example.com"}
            dir="ltr"
            className="flex-1 rounded-full border border-[#d2d2d7] bg-white px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
          />
          <button
            onClick={sendInvite}
            disabled={sending || !email.trim()}
            className="rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (isAr ? "أرسل الدعوة" : "Send invite")}
          </button>
        </div>
      </div>

      {/* Share link */}
      <div className="rounded-3xl bg-[#f5f5f7] p-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {isAr ? "رابط الإحالة الخاص بك" : "Your referral link"}
        </h2>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr ? "شارك الرابط ده على وسائل التواصل واحصل على خصم لكل اشتراك." : "Share this link on social media and get discount for each subscription."}
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
            className="shrink-0 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-base font-normal transition-opacity hover:opacity-90"
          >
            {copied ? (isAr ? "✓ اتنسخ!" : "✓ Copied!") : (isAr ? "نسخ" : "Copy")}
          </button>
        </div>
      </div>

      {/* Referrals list */}
      {stats.referrals.length > 0 && (
        <div className="rounded-3xl bg-[#f5f5f7] p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "الدعوات المُرسلة" : "Sent invitations"}
          </h2>
          <div className="mt-6 space-y-3">
            {stats.referrals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <div>
                  <p className="text-sm font-medium">{r.referred_email}</p>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-normal ${
                    r.status === "completed"
                      ? "bg-[#0071e3]/10 text-[#0071e3]"
                      : r.status === "pending"
                        ? "bg-[#ff9500]/10 text-[#ff9500]"
                        : "bg-[#f5f5f7] text-[#6e6e73]"
                  }`}
                >
                  {r.status === "completed"
                    ? (isAr ? "اكتمل" : "Completed")
                    : r.status === "pending"
                      ? (isAr ? "في الانتظار" : "Pending")
                      : r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
