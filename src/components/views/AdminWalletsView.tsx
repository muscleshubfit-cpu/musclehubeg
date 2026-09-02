"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { getReceiptSignedUrl } from "@/lib/data";
import { coachTopupMethodLabel } from "@/lib/coach-limits";
import type { CoachTopupRequest } from "@/lib/supabase/types";

/**
 * ADMIN — COACH WALLETS (0035) — /admin/wallets
 *
 * OWNER FLOW («الأدمن يراجعهم ويكتب الرصيد يدوى لمحفظة المدرب»):
 *  1. PENDING QUEUE — every top-up request with its receipt (open the
 *     signed URL, verify the transfer, approve = credit the wallet
 *     through coach_adjust_wallet, or reject with a reason).
 *  2. BALANCES — per-coach wallet balance next to his per-client
 *     monthly fee and live client count, with the manual ±adjust form.
 */

type WalletRow = {
  coach_id: string;
  full_name: string;
  email: string | null;
  role: string;
  balance: number;
  currency: string;
  fee_per_client: number;
  fee_currency: string;
  client_count: number;
};

/** Row shape returned by GET /api/admin/wallets — coach_topup_requests + the
 *  embedded coach:profiles relation (full_name/email for display). */
type TopupRow = CoachTopupRequest & {
  coach: { full_name: string | null; email: string | null } | null;
};

export function AdminWalletsView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [adjustCoach, setAdjustCoach] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wallets");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setWallets(json.wallets ?? []);
      setTopups(json.topups ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, action: "approve" | "reject") => {
    let adminNote: string | undefined;
    if (action === "reject") {
      adminNote = prompt(isAr ? "سبب الرفض (اختياري):" : "Rejection reason (optional):") || undefined;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/admin/wallets/topups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, admin_note: adminNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      toast.success(
        action === "approve"
          ? isAr ? "اتشحن رصيد المدرب ✅" : "Wallet credited ✅"
          : isAr ? "الطلب مرفوض" : "Request rejected",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setBusy(null);
    }
  };

  const openReceipt = async (path: string) => {
    const url = await getReceiptSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const adjust = async () => {
    const amt = Number(adjustAmount);
    if (!Number.isFinite(amt) || amt === 0) {
      toast.error(isAr ? "اكتب مبلغًا غير صفر (+شحن / −خصم)" : "Enter a non-zero amount (+credit / −debit)");
      return;
    }
    if (!adjustCoach) {
      toast.error(isAr ? "اختار المدرب" : "Pick a coach");
      return;
    }
    if (!adjustNote.trim()) {
      toast.error(isAr ? "اكتب سبب التعديل" : "Write the reason");
      return;
    }
    setBusy("adjust");
    try {
      const res = await fetch("/api/admin/wallets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: adjustCoach, amount: amt, note: adjustNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      toast.success(isAr ? "اتعدل الرصيد ✅" : "Balance adjusted ✅");
      setAdjustAmount("");
      setAdjustNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setBusy(null);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-EG" : "en-US", { maximumFractionDigits: 2 }).format(n);

  const pending = topups.filter((t) => t.status === "pending");
  const reviewed = topups.filter((t) => t.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "محافظ المدربين" : "Coach Wallets"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "راجع إيصالات الشحن واشحن الرصيد يدويًا — التفعيل عند المدرب مش هينفع غير برصيد كفاية."
            : "Review top-up receipts and credit balances manually — coaches cannot activate without sufficient balance."}
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "جارٍ التحميل…" : "Loading…"}
        </div>
      ) : (
        <>
          {/* ─── PENDING QUEUE ─── */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "طلبات الشحن الواقفة" : "Pending top-ups"}
              {pending.length > 0 && (
                <span className="ms-2 rounded-full bg-[#ff9500] px-2 py-0.5 text-xs font-bold text-white">
                  {pending.length}
                </span>
              )}
            </h2>
            {pending.length === 0 ? (
              <div className="mt-3 rounded-2xl bg-[#f5f5f7] p-8 text-center text-sm text-[#6e6e73]">
                {isAr ? "مفيش طلبات مستنية مراجعة" : "Nothing waiting for review"}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {pending.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-[#e5e5ea] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {t.coach?.full_name || t.coach_id}
                          <span className="ms-2 text-xs font-normal text-[#6e6e73]">
                            {t.coach?.email}
                          </span>
                        </p>
                        <p className="mt-1 text-sm" dir="ltr">
                          <span className="font-semibold">{fmt(Number(t.amount))} {t.currency}</span>
                          <span className="ms-2 text-xs text-[#6e6e73]">
                            {coachTopupMethodLabel(t.method, lang)} ·{" "}
                            {new Date(t.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                          </span>
                        </p>
                        {t.note && (
                          <p className="mt-1 text-xs text-[#6e6e73]">{t.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openReceipt(t.receipt_path)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#d2d2d7] px-4 py-2 text-xs font-medium hover:border-[#0071e3]/40"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {isAr ? "الإيصال" : "Receipt"}
                        </button>
                        <button
                          onClick={() => review(t.id, "approve")}
                          disabled={busy === t.id}
                          className="rounded-full bg-[#34c759] px-4 py-2 text-xs font-medium text-white hover:brightness-105 disabled:opacity-50"
                        >
                          {isAr ? "قبول + شحن" : "Approve + credit"}
                        </button>
                        <button
                          onClick={() => review(t.id, "reject")}
                          disabled={busy === t.id}
                          className="rounded-full bg-[#ff3b30] px-4 py-2 text-xs font-medium text-white hover:brightness-105 disabled:opacity-50"
                        >
                          {isAr ? "رفض" : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── BALANCES ─── */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "أرصدة المحافظ" : "Wallet balances"}
            </h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-[#e5e5ea]">
              <table className="w-full text-sm">
                <thead className="bg-[#f5f5f7] text-xs text-[#6e6e73]">
                  <tr>
                    <th className="p-3 text-start">{isAr ? "المدرب" : "Coach"}</th>
                    <th className="p-3 text-start">{isAr ? "الرصيد" : "Balance"}</th>
                    <th className="p-3 text-start">{isAr ? "رسوم العميل/شهر" : "Fee/client·mo"}</th>
                    <th className="p-3 text-start">{isAr ? "العملاء" : "Clients"}</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.coach_id} className="border-t border-[#e5e5ea]">
                      <td className="p-3">
                        <span className="font-medium">{w.full_name}</span>
                        <span className="ms-2 text-xs text-[#6e6e73]">{w.email}</span>
                        {w.role === "admin" && (
                          <span className="ms-2 rounded-full bg-[#8b5cf6]/10 px-2 py-0.5 text-[10px] font-bold text-[#8b5cf6]">
                            {isAr ? "أدمن" : "ADMIN"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold" dir="ltr">
                        {fmt(w.balance)} {w.currency}
                      </td>
                      <td className="p-3" dir="ltr">
                        {fmt(w.fee_per_client)} {w.fee_currency}
                      </td>
                      <td className="p-3">{w.client_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── MANUAL ADJUST ─── */}
          <div className="rounded-3xl border border-[#e5e5ea] p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "تعديل رصيد يدوي" : "Manual balance adjust"}
            </h2>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "شحن يدوي (+) أو خصم (−) بسببه في سجل المحفظة."
                : "Manual credit (+) or debit (−) — logged in the coach's ledger."}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <select
                value={adjustCoach}
                onChange={(e) => setAdjustCoach(e.target.value)}
                className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              >
                <option value="">{isAr ? "اختار المدرب…" : "Pick a coach…"}</option>
                {wallets.map((w) => (
                  <option key={w.coach_id} value={w.coach_id}>
                    {w.full_name} ({fmt(w.balance)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder={isAr ? "+500 أو −200" : "+500 or −200"}
                className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
                dir="ltr"
              />
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder={isAr ? "السبب (مطلوب)" : "Reason (required)"}
                className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
            <button
              onClick={adjust}
              disabled={busy === "adjust"}
              className="mt-4 rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a3a3c] disabled:opacity-50"
            >
              {isAr ? "تنفيذ التعديل" : "Apply adjustment"}
            </button>
          </div>

          {/* ─── REVIEWED HISTORY ─── */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "طلعات اتراجعت" : "Reviewed requests"}
            </h2>
            {reviewed.length === 0 ? (
              <div className="mt-3 rounded-2xl bg-[#f5f5f7] p-8 text-center text-sm text-[#6e6e73]">
                {isAr ? "مفيش سجل بعد" : "Nothing reviewed yet"}
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-[#e5e5ea]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f5f7] text-xs text-[#6e6e73]">
                    <tr>
                      <th className="p-3 text-start">{isAr ? "المدرب" : "Coach"}</th>
                      <th className="p-3 text-start">{isAr ? "المبلغ" : "Amount"}</th>
                      <th className="p-3 text-start">{isAr ? "الطريقة" : "Method"}</th>
                      <th className="p-3 text-start">{isAr ? "الحالة" : "Status"}</th>
                      <th className="p-3 text-start">{isAr ? "ملاحظة" : "Note"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewed.map((t) => (
                      <tr key={t.id} className="border-t border-[#e5e5ea]">
                        <td className="p-3 text-xs">{t.coach?.full_name || t.coach_id}</td>
                        <td className="p-3 font-medium" dir="ltr">{fmt(Number(t.amount))}</td>
                        <td className="p-3 text-xs">{coachTopupMethodLabel(t.method, lang)}</td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              t.status === "approved"
                                ? "bg-[#34c759]/10 text-[#248a3d]"
                                : "bg-[#ff3b30]/10 text-[#ff3b30]",
                            )}
                          >
                            {t.status === "approved" ? (isAr ? "مقبول" : "Approved") : (isAr ? "مرفوض" : "Rejected")}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-[#6e6e73]">{t.admin_note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
