"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, Copy, ExternalLink, Wallet } from "lucide-react";
import {
  COACH_TOPUP_METHODS,
  SITE_PAYMENT_CONTACTS,
  coachTopupMethodLabel,
  type CoachTopupMethod,
} from "@/lib/coach-limits";
import { uploadReceipt, getReceiptSignedUrl } from "@/lib/data";

/**
 * COACH WALLET (0035) — /coach/wallet
 *
 * OWNER MODEL: the coach pays THE SITE a monthly fixed fee per client.
 * This view = balance + the three top-up rails (InstaPay / Vodafone
 * Cash / PayPal link — no fixed prices, the coach types what he paid)
 * + receipt upload + request history + ledger. The admin reviews the
 * receipts on /admin/wallets and credits the wallet manually.
 */

type WalletData = {
  balance: number;
  currency: string;
  fee_per_client: number;
  fee_currency: string;
  topups: any[];
  transactions: any[];
};

const statusBadge = (status: string, isAr: boolean) => {
  if (status === "approved")
    return {
      cls: "bg-[#34c759]/10 text-[#248a3d]",
      label: isAr ? "مقبول" : "Approved",
    };
  if (status === "rejected")
    return {
      cls: "bg-[#ff3b30]/10 text-[#ff3b30]",
      label: isAr ? "مرفوض" : "Rejected",
    };
  return {
    cls: "bg-[#ff9500]/10 text-[#c93400]",
    label: isAr ? "قيد المراجعة" : "Pending",
  };
};

const kindLabel = (kind: string, isAr: boolean) => {
  if (kind === "topup") return isAr ? "شحن محفظة" : "Top-up";
  if (kind === "activation") return isAr ? "تفعيل اشتراك" : "Activation";
  return isAr ? "تعديل إداري" : "Admin adjust";
};

export function CoachWalletView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<CoachTopupMethod>("instapay");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/wallet");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setData(json);
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(isAr ? "اكتب مبلغ الشحن" : "Enter the top-up amount");
      return;
    }
    if (!receipt) {
      toast.error(isAr ? "ارفع إيصال الدفع الأول" : "Upload the payment receipt first");
      return;
    }
    setSubmitting(true);
    try {
      const receiptPath = await uploadReceipt(receipt);
      if (!receiptPath) throw new Error(isAr ? "فشل رفع الإيصال" : "Receipt upload failed");
      const res = await fetch("/api/coach/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, method, note, receipt_path: receiptPath }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      toast.success(
        isAr
          ? "وصل طلب الشحن — الأدمن هيراجع الإيصال ويشحن رصيدك"
          : "Top-up request received — the admin will review and credit your wallet",
      );
      setAmount("");
      setNote("");
      setReceipt(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(isAr ? "اتنسخ ✅" : "Copied ✅");
    } catch {
      /* clipboard unavailable — the value is visible anyway */
    }
  };

  const openReceipt = async (path: string) => {
    const url = await getReceiptSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-EG" : "en-US", {
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "محفظتي" : "My Wallet"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "اشحن محفظتك عشان تفعّل اشتراكات عملائك — التفعيل بيخصم رسوم العميل الشهرية من الرصيد."
            : "Top up your wallet to activate client subscriptions — the monthly per-client fee is debited from the balance."}
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "جارٍ التحميل…" : "Loading…"}
        </div>
      ) : (
        <>
          {/* ─── BALANCE ─── */}
          <div className="rounded-3xl bg-gradient-to-br from-[#1d1d1f] to-[#3a3a3c] p-8 text-white">
            <div className="flex items-center gap-2 text-sm font-normal text-white/60">
              <Wallet className="h-4 w-4" />
              {isAr ? "الرصيد الحالي" : "Current balance"}
            </div>
            <div className="mt-2 text-5xl font-semibold tracking-tight" dir="ltr">
              {fmt(data?.balance ?? 0)}{" "}
              <span className="text-xl font-normal text-white/60">
                {data?.currency ?? "EGP"}
              </span>
            </div>
            <p className="mt-3 text-sm font-normal text-white/60">
              {isAr
                ? `رسوم العميل الشهرية: ${fmt(data?.fee_per_client ?? 0)} ${data?.fee_currency ?? "EGP"} — تفعيل ٣ شهور = ${fmt((data?.fee_per_client ?? 0) * 3)}، وهكذا.`
                : `Per-client monthly fee: ${fmt(data?.fee_per_client ?? 0)} ${data?.fee_currency ?? "EGP"} — activating 3 months = ${fmt((data?.fee_per_client ?? 0) * 3)}, and so on.`}
            </p>
          </div>

          {/* ─── TOP-UP ─── */}
          <div className="rounded-3xl border border-[#e5e5ea] p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "اشحن محفظتك" : "Top up your wallet"}
            </h2>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "ادفع بأي وسيلة من دول بأي مبلغ، ارفع إيصال الدفع، والأدمن يراجع ويشحن رصيدك."
                : "Pay via any rail below with any amount, upload the receipt, and the admin reviews + credits your wallet."}
            </p>

            {/* Method cards */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {COACH_TOPUP_METHODS.map((m) => {
                const contact = SITE_PAYMENT_CONTACTS[m.id];
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors",
                      active
                        ? "border-[#0071e3] bg-[#0071e3]/5"
                        : "border-[#d2d2d7] hover:border-[#0071e3]/40",
                    )}
                  >
                    <span className="text-sm font-medium">
                      {isAr ? m.ar : m.en}
                    </span>
                    {contact.qr && (
                      <img
                        src={contact.qr}
                        alt={`${m.en} QR`}
                        className="h-28 w-28 rounded-lg object-contain"
                        loading="lazy"
                      />
                    )}
                    <span
                      className="break-all font-mono text-xs text-[#6e6e73]"
                      dir="ltr"
                    >
                      {contact.value}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (contact.link) window.open(contact.link, "_blank", "noopener");
                        else copy(contact.value);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#0071e3] hover:underline"
                    >
                      {contact.link ? (
                        <>
                          <ExternalLink className="h-3 w-3" />
                          {isAr ? "افتح لينك الدفع" : "Open payment link"}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          {isAr ? "نسخ" : "Copy"}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">
                  {isAr ? "المبلغ اللي دفعته" : "Amount you paid"}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isAr ? "مثال: 1500" : "e.g. 1500"}
                  className="mt-1.5 w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {isAr ? "ملاحظة (اختياري)" : "Note (optional)"}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isAr ? "مرجع التحويل…" : "Transfer reference…"}
                  className="mt-1.5 w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
                />
              </div>
            </div>

            <label
              className={cn(
                "mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 transition-colors hover:border-[#0071e3]/40",
                receipt && "border-[#0071e3]/40 bg-[#0071e3]/5",
              )}
            >
              <Upload className="h-5 w-5 text-[#6e6e73]" />
              <span className="text-sm">
                {receipt
                  ? receipt.name
                  : isAr
                    ? "إيصال الدفع (صورة / PDF — مطلوب)"
                    : "Payment receipt (image / PDF — required)"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </label>

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 w-full rounded-full bg-[#0071e3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] disabled:opacity-50 sm:w-auto"
            >
              {submitting
                ? isAr ? "جارٍ الإرسال…" : "Sending…"
                : isAr ? "إرسال طلب الشحن" : "Submit top-up request"}
            </button>
          </div>

          {/* ─── TOP-UP HISTORY ─── */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "طلبات الشحن" : "Top-up requests"}
            </h2>
            {(data?.topups?.length ?? 0) === 0 ? (
              <div className="mt-3 rounded-2xl bg-[#f5f5f7] p-8 text-center text-sm text-[#6e6e73]">
                {isAr ? "مفيش طلبات شحن بعد" : "No top-up requests yet"}
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-[#e5e5ea]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f5f7] text-start text-xs text-[#6e6e73]">
                    <tr>
                      <th className="p-3 text-start">{isAr ? "التاريخ" : "Date"}</th>
                      <th className="p-3 text-start">{isAr ? "المبلغ" : "Amount"}</th>
                      <th className="p-3 text-start">{isAr ? "الطريقة" : "Method"}</th>
                      <th className="p-3 text-start">{isAr ? "الحالة" : "Status"}</th>
                      <th className="p-3 text-start">{isAr ? "الإيصال" : "Receipt"}</th>
                      <th className="p-3 text-start">{isAr ? "ملاحظة الأدمن" : "Admin note"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topups.map((t: any) => {
                      const badge = statusBadge(t.status, isAr);
                      return (
                        <tr key={t.id} className="border-t border-[#e5e5ea]">
                          <td className="p-3 text-xs text-[#6e6e73]">
                            {new Date(t.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                          </td>
                          <td className="p-3 font-medium" dir="ltr">{fmt(Number(t.amount))}</td>
                          <td className="p-3 text-xs">{coachTopupMethodLabel(t.method, lang)}</td>
                          <td className="p-3">
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.cls)}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => openReceipt(t.receipt_path)}
                              className="text-xs font-medium text-[#0071e3] hover:underline"
                            >
                              {isAr ? "عرض" : "View"}
                            </button>
                          </td>
                          <td className="p-3 text-xs text-[#6e6e73]">{t.admin_note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── LEDGER ─── */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "حركة المحفظة" : "Wallet ledger"}
            </h2>
            {(data?.transactions?.length ?? 0) === 0 ? (
              <div className="mt-3 rounded-2xl bg-[#f5f5f7] p-8 text-center text-sm text-[#6e6e73]">
                {isAr ? "مفيش حركات بعد" : "No transactions yet"}
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-[#e5e5ea]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f5f7] text-xs text-[#6e6e73]">
                    <tr>
                      <th className="p-3 text-start">{isAr ? "التاريخ" : "Date"}</th>
                      <th className="p-3 text-start">{isAr ? "النوع" : "Kind"}</th>
                      <th className="p-3 text-start">{isAr ? "المبلغ" : "Amount"}</th>
                      <th className="p-3 text-start">{isAr ? "الرصيد بعدها" : "Balance after"}</th>
                      <th className="p-3 text-start">{isAr ? "ملاحظة" : "Note"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.transactions.map((x: any) => (
                      <tr key={x.id} className="border-t border-[#e5e5ea]">
                        <td className="p-3 text-xs text-[#6e6e73]">
                          {new Date(x.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                        </td>
                        <td className="p-3 text-xs">{kindLabel(x.kind, isAr)}</td>
                        <td
                          className={cn(
                            "p-3 font-medium",
                            Number(x.amount) > 0 ? "text-[#248a3d]" : "text-[#ff3b30]",
                          )}
                          dir="ltr"
                        >
                          {Number(x.amount) > 0 ? "+" : ""}
                          {fmt(Number(x.amount))}
                        </td>
                        <td className="p-3" dir="ltr">{fmt(Number(x.balance_after))}</td>
                        <td className="p-3 text-xs text-[#6e6e73]">{x.note || "—"}</td>
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
