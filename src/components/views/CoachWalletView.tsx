"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, Copy, ExternalLink, Wallet, Loader2, Zap } from "lucide-react";
import {
  COACH_TOPUP_METHODS,
  COACH_CLIENT_PACKAGES,
  SITE_PAYMENT_CONTACTS,
  PAYPAL_TOPUP_MIN_USD,
  coachTopupMethodLabel,
  type CoachTopupMethod,
} from "@/lib/coach-limits";
import { uploadReceipt, getReceiptSignedUrl } from "@/lib/data";

/**
 * COACH WALLET (0035) — /coach/wallet
 *
 * OWNER MODEL: the coach pays THE SITE a monthly fixed fee per client.
 * GLOBAL USD (owner decree 2026-08-30): the wallet ledger is USD and
 * PayPal charges 1:1 — the coach types a USD amount and pays exactly it.
 * This view = balance + top-up rails:
 *   • PayPal (AUTOMATED — 0035 phase 2): the coach types a USD amount,
 *     pays through the PayPal JS SDK, and the wallet is credited
 *     INSTANTLY by /api/paypal/capture-order (coach_adjust_wallet).
 *     InstaPay/Vodafone Cash stay MANUAL (receipt → admin review).
 *   • InstaPay / Vodafone Cash: pay, upload the receipt, the admin
 *     reviews on /admin/wallets and credits the wallet manually.
 * + request history + ledger.
 */

import type { CoachTopupRequest, CoachWalletTransaction } from "@/lib/supabase/types";

type WalletData = {
  balance: number;
  currency: string;
  fee_per_client: number;
  fee_currency: string;
  topups: CoachTopupRequest[];
  transactions: CoachWalletTransaction[];
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

// ───────────────────────────────────────────────────────────────────────
// PayPal JS SDK (instant wallet top-up) — mirrors CheckoutView's loader
// ───────────────────────────────────────────────────────────────────────

const PAYPAL_PUBLIC_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

function usePayPalScript(shouldLoad: boolean) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shouldLoad || loaded || error) return;
    if (!PAYPAL_PUBLIC_CLIENT_ID) {
      console.error("[paypal] NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set");
      setError(true);
      return;
    }
    const scriptId = "paypal-sdk-script";
    const existing = document.getElementById(scriptId);
    if (existing) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_PUBLIC_CLIENT_ID}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      console.error("[paypal] Failed to load PayPal JS SDK");
      setError(true);
    };
    document.head.appendChild(script);
  }, [shouldLoad, loaded, error]);

  return { loaded, error };
}

/**
 * PayPal buttons for the wallet top-up. The USD amount is read at CLICK
 * time through getAmountUsd() (a ref-backed getter) so the buttons never
 * need re-rendering when the coach edits the amount.
 */
function WalletPayPalButtons({
  getAmountUsd,
  onSuccess,
  onError,
  isAr,
}: {
  getAmountUsd: () => number;
  onSuccess: () => void;
  onError: (msg: string) => void;
  isAr: boolean;
}) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const amountRef = useRef(getAmountUsd);
  useEffect(() => {
    amountRef.current = getAmountUsd;
  }, [getAmountUsd]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (renderedRef.current || !paypalRef.current) return;
    // PayPal JS SDK loaded via <script> — typed window view (SDK types not
    // installed; only Buttons/render + the options we pass are consumed).
    const w = window as typeof window & {
      paypal?: {
        Buttons?: (options: Record<string, unknown>) => {
          render: (target: HTMLElement) => Promise<void>;
        };
      };
    };
    if (!w.paypal?.Buttons) return;

    renderedRef.current = true;

    w.paypal
      .Buttons({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal" },
        createOrder: async () => {
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purpose: "wallet_topup", amountUsd: amountRef.current() }),
          });
          const data = await res.json();
          if (!res.ok || !data.orderId) {
            throw new Error(data.message || data.error || "Failed to create order");
          }
          return data.orderId;
        },
        onApprove: async (data: { orderID: string }) => {
          setProcessing(true);
          try {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const result = await res.json();
            if (res.ok && result.success) {
              toast.success(
                isAr ? "تم شحن محفظتك بنجاح! 🎉" : "Wallet topped up successfully! 🎉",
              );
              onSuccess();
            } else {
              toast.error(result.error || (isAr ? "فشل الدفع" : "Payment failed"));
              onError(result.error || "Capture failed");
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(msg || (isAr ? "خطأ في المعالجة" : "Processing error"));
            onError(msg);
          } finally {
            setProcessing(false);
          }
        },
        onCancel: () => {
          toast.info(isAr ? "تم إلغاء الدفع" : "Payment cancelled");
        },
        onError: (err: unknown) => {
          console.error("[paypal] Wallet button error:", err);
          toast.error(isAr ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Please try again.");
          onError("PayPal button error");
        },
      })
      .render(paypalRef.current)
      .catch((e) => {
        console.error("[paypal] Render error:", e);
        renderedRef.current = false;
      });
  }, [isAr, onSuccess, onError]);

  if (processing) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#6e6e73]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isAr ? "جاري معالجة الدفع وشحن المحفظة..." : "Processing payment and wallet credit..."}
      </div>
    );
  }

  return <div ref={paypalRef} className="paypal-buttons-container" />;
}

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

  // Instant PayPal top-up state (0035 phase 2) — USD 1:1 (0038 decree)
  const [payAmount, setPayAmount] = useState("");
  const MIN_TOPUP_USD = PAYPAL_TOPUP_MIN_USD;
  const payUsd = Number(payAmount);
  const payValid = Number.isFinite(payUsd) && payUsd >= MIN_TOPUP_USD && payUsd <= 1_000_000;
  const { loaded: paypalLoaded, error: paypalError } = usePayPalScript(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/wallet");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "error");
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePayPalSuccess = useCallback(() => {
    setPayAmount("");
    load();
  }, [load]);

  const handlePayPalError = useCallback(() => {
    /* toast already shown by the buttons component */
  }, []);

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ غير متوقع" : "Unexpected error"));
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
                {data?.currency ?? "USD"}
              </span>
            </div>
            <p className="mt-3 text-sm font-normal text-white/60">
              {/* Effective monthly rate: the coach's admin-set fee if one
                  exists, otherwise the $6 package rate (same fallback
                  coachActivationCostUsd uses for non-package durations —
                  the display must NEVER say 0$ while activation debits 6$). */}
              {((): string => {
                const set = Number(data?.fee_per_client ?? 0);
                const eff = set > 0 ? set : COACH_CLIENT_PACKAGES[0].priceUsd;
                return isAr
                  ? `رسوم العميل الشهرية: ${fmt(eff)}$ — باقة ٣ شهور = ${fmt(16)}$ (سعر ثابت)، وأي مدة أخرى = ${fmt(eff)}$ × الشهور.`
                  : `Per-client monthly fee: ${fmt(eff)}$ — 3-month package = ${fmt(16)}$ (fixed price), any other duration = ${fmt(eff)}$ × months.`;
              })()}
            </p>
          </div>

          {/* ─── TOP-UP ─── */}
          <div className="rounded-3xl border border-[#e5e5ea] p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "اشحن محفظتك" : "Top up your wallet"}
            </h2>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "شحن فوري عبر PayPal — أو ادفع انستاباي / فودافون كاش وارفع الإيصال والأدمن يراجع ويشحن رصيدك."
                : "Instant top-up via PayPal — or pay via InstaPay / Vodafone Cash, upload the receipt, and the admin reviews + credits your wallet."}
            </p>

            {/* ── INSTANT PAYPAL RAIL (automated credit) ── */}
            <div className="mt-5 rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#0071e3]" />
                <h3 className="text-base font-semibold">
                  {isAr ? "شحن فوري عبر PayPal" : "Instant top-up via PayPal"}
                </h3>
                <span className="rounded-full bg-[#34c759]/10 px-2.5 py-0.5 text-xs font-medium text-[#248a3d]">
                  {isAr ? "الرصيد يضاف تلقائيًا" : "Auto credit"}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-normal text-[#6e6e73]">
                {isAr
                  ? "اكتب المبلغ بالدولار وادفع نفس المبلغ عبر PayPal، والرصيد يضاف لمحفظتك فورًا بدون مراجعة."
                  : "Type the amount in USD, pay exactly it via PayPal, and the balance is credited instantly — no review."}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    {isAr ? "مبلغ الشحن (دولار USD)" : "Top-up amount (USD)"}
                  </label>
                  <input
                    type="number"
                    min={MIN_TOPUP_USD}
                    step="0.5"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={isAr ? `مثال: 20 (أدنى ${MIN_TOPUP_USD})` : `e.g. 20 (min ${MIN_TOPUP_USD})`}
                    className="mt-1.5 w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {isAr ? "الرصيد المضاف لمحفظتك" : "Wallet credit"}
                  </label>
                  <div
                    className="mt-1.5 flex h-[42px] items-center rounded-xl bg-[#f5f5f7] px-4 text-sm font-medium text-[#1d1d1f]"
                    dir="ltr"
                  >
                    {payValid ? `${payUsd.toFixed(2)} USD` : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {!payValid ? (
                  <div className="rounded-xl bg-[#f5f5f7] p-4 text-center text-sm text-[#6e6e73]">
                    {isAr
                      ? `اكتب مبلغ صحيح (${MIN_TOPUP_USD}$ أو أكثر) لتفعيل زر PayPal`
                      : `Enter a valid amount (${MIN_TOPUP_USD} USD or more) to enable the PayPal button`}
                  </div>
                ) : paypalError ? (
                  <div className="rounded-xl bg-[#ff3b30]/5 p-4 text-center text-sm text-[#ff3b30]">
                    {isAr
                      ? "مفيش إعدادات PayPal — استخدم شحن انستاباي / فودافون كاش"
                      : "PayPal is not configured — use InstaPay / Vodafone Cash top-up"}
                  </div>
                ) : paypalLoaded ? (
                  <WalletPayPalButtons
                    getAmountUsd={() => Number(payAmount)}
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                    isAr={isAr}
                  />
                ) : (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#6e6e73]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isAr ? "جارٍ تحميل PayPal…" : "Loading PayPal…"}
                  </div>
                )}
              </div>
            </div>

            {/* ── MANUAL RAILS (receipt → admin review) ── */}
            <h3 className="mt-6 text-base font-semibold">
              {isAr ? "شحن بإيصال — مراجعة الأدمن" : "Receipt top-up — admin review"}
            </h3>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "ادفع بأي وسيلة من دول بأي مبلغ، ارفع إيصال الدفع، والأدمن يراجع ويشحن رصيدك."
                : "Pay via any rail below with any amount, upload the receipt, and the admin reviews + credits your wallet."}
            </p>

            {/* Method cards — InstaPay / Vodafone Cash only (PayPal is instant above) */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {COACH_TOPUP_METHODS.filter((m) => m.id !== "paypal").map((m) => {
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
                      // eslint-disable-next-line @next/next/no-img-element -- static QR asset rendered as-is; optimization must never touch a scannable QR (AffiliateToolkit banner precedent)
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
                  {isAr ? "المبلغ اللي دفعته (دولار USD)" : "Amount you paid (USD)"}
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isAr ? "مثال: 30" : "e.g. 30"}
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
                    {data!.topups.map((t) => {
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
                            {t.receipt_path ? (
                              <button
                                onClick={() => openReceipt(t.receipt_path)}
                                className="text-xs font-medium text-[#0071e3] hover:underline"
                              >
                                {isAr ? "عرض" : "View"}
                              </button>
                            ) : (
                              <span className="text-xs text-[#6e6e73]">—</span>
                            )}
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
                    {data!.transactions.map((x) => (
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
