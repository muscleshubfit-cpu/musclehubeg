"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, Upload, Loader2, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { type TierId, type Duration, type PaymentMethod, getTier } from "@/lib/plans";
import { MEMBERSHIPS, type MembershipTier } from "@/lib/memberships";
import { submitSubscriptionRequest, uploadReceipt } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Unified checkout — supports three payment methods:
 *   1. PayPal (PRIMARY — instant activation via Capture API)
 *   2. InstaPay (SECONDARY — manual receipt upload + coach approval)
 *   3. Vodafone Cash (SECONDARY — manual receipt upload + coach approval)
 *
 * For PayPal:
 *   - PayPal JS SDK loads with NEXT_PUBLIC_PAYPAL_CLIENT_ID
 *   - createOrder calls /api/paypal/create-order (server-side price)
 *   - onApprove calls /api/paypal/capture-order (server-side capture + activation)
 *   - On success: redirect to dashboard
 *   - On cancel/error: stay on checkout, show message
 *
 * For Manual (InstaPay/Vodafone Cash):
 *   - User uploads receipt → submitSubscriptionRequest → coach approval
 *   - Unchanged from original flow
 */

type PlanInfo = {
  name: string;
  sub: string;
  price: number;
  durationMonths: number;
  monthlyEquivalent?: number;
};

// Display names for the legacy /coaching products (mirrors i18n tier.* keys)
const LEGACY_PLAN_NAMES: Record<string, { ar: string; en: string }> = {
  starter: { ar: "ستارتر", en: "Starter" },
  elite: { ar: "إيليت", en: "Elite" },
};

function resolvePlan(tier: string, months: number, isAr: boolean): PlanInfo | null {
  const m = MEMBERSHIPS.find((x) => x.id === tier);
  // 0045: 'coaching' ($39.99 site product) is now BUYABLE — before this fix
  // it resolved to null and /checkout?tier=coaching rendered a dead-end
  // page with only a "back to memberships" link (owner complaint:
  // «منتج كوتشينج لا تفعل شىء»). 
  // 0046 OWNER DECREE (price revert): the /coaching page products
  // Starter ($20) / Elite ($40) are RESTORED — the owner kept their
  // PayPal-tied prices — so resolvePlan prices them from the legacy
  // plans.ts table again. At activation they are written under their
  // canonical model tiers (starter → premium, elite → pro) — see
  // canonicalModelTier() in plans.ts.
  if (m && (m.id === "premium" || m.id === "pro" || m.id === "coaching")) {
    const isYearly = months === 12;
    const price = isYearly && m.priceYearly ? m.priceYearly : m.priceMonthly || 0;
    return {
      name: isAr ? m.nameAr : m.nameEn,
      sub: isAr
        ? (isYearly ? "اشتراك سنوي" : "اشتراك شهري")
        : (isYearly ? "Yearly subscription" : "Monthly subscription"),
      price,
      durationMonths: months,
      monthlyEquivalent: isYearly ? (m.priceYearly || 0) / 12 : undefined,
    };
  }

  // 0046: legacy /coaching products — priced from plans.ts (PayPal-tied:
  // Starter $20/mo · $200/yr, Elite $40/mo · $400/yr). The checkout page
  // whitelist accepts these tiers again, so a Starter click now lands on
  // a REAL checkout instead of the 0045 redirect to /memberships.
  const legacy = getTier(tier as TierId);
  if (legacy) {
    const price = legacy.prices[months as 1 | 12] ?? legacy.prices[1];
    return {
      name: isAr
        ? LEGACY_PLAN_NAMES[tier]?.ar ?? tier
        : LEGACY_PLAN_NAMES[tier]?.en ?? tier.charAt(0).toUpperCase() + tier.slice(1),
      sub: isAr ? "اشتراك" : "Subscription",
      price,
      durationMonths: months,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// PayPal JS SDK loader (lazy — only loaded when PayPal is selected)
// ─────────────────────────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

/**
 * Load the PayPal JS SDK script dynamically.
 * Only called when the user selects PayPal as payment method.
 * Uses NEXT_PUBLIC_PAYPAL_CLIENT_ID (public — safe to expose in browser).
 */
function usePayPalScript(shouldLoad: boolean) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shouldLoad || loaded || error) return;
    if (!PAYPAL_CLIENT_ID) {
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
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
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

// ─────────────────────────────────────────────────────────────────────────
// PayPal Buttons component
// ─────────────────────────────────────────────────────────────────────────

function PayPalButtons({
  planTier,
  durationMonths,
  onSuccess,
  onError,
  isAr,
}: {
  planTier: string;
  durationMonths: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
  isAr: boolean;
}) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (renderedRef.current || !paypalRef.current) return;
    // Structural view of the PayPal SDK global — no `any` escape hatch.
    type PayPalButtonsConfig = {
      style?: Record<string, string>;
      createOrder: () => Promise<string>;
      onApprove: (data: { orderID: string }) => Promise<void> | void;
      onCancel: () => void;
      onError: (err: unknown) => void;
    };
    type PayPalWindow = {
      paypal?: {
        Buttons: (config: PayPalButtonsConfig) => { render: (el: HTMLElement) => Promise<void> };
      };
    };
    const w = window as unknown as PayPalWindow;
    if (!w.paypal?.Buttons) return;

    renderedRef.current = true;

    w.paypal
      .Buttons({
        style: { layout: "vertical", color: "blue", shape: "pill", label: "pay" },
        createOrder: async () => {
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planTier, durationMonths }),
          });
          const data = await res.json();
          if (!res.ok || !data.orderId) {
            throw new Error(data.error || "Failed to create order");
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
                isAr
                  ? "تم الدفع بنجاح! تم تفعيل اشتراكك 🎉"
                  : "Payment successful! Your subscription is active 🎉",
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
          console.error("[paypal] Button error:", err);
          toast.error(isAr ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Please try again.");
          onError("PayPal button error");
        },
      })
      .render(paypalRef.current)
      .catch((e: unknown) => {
        console.error("[paypal] Render error:", e);
        renderedRef.current = false;
      });
  }, [planTier, durationMonths, isAr, onSuccess, onError]);

  if (processing) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#6e6e73]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isAr ? "جاري معالجة الدفع..." : "Processing payment..."}
      </div>
    );
  }

  return <div ref={paypalRef} className="paypal-buttons-container" />;
}

// ─────────────────────────────────────────────────────────────────────────
// Main CheckoutView
// ─────────────────────────────────────────────────────────────────────────

export function CheckoutView({ tier, months }: { tier: TierId | MembershipTier; months: Duration }) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { navigate } = useNav();
  const { profile } = useAuth();
  const plan = resolvePlan(tier as string, months as number, isAr);

  // PayPal is the DEFAULT (primary) payment method
  const [method, setMethod] = useState<PaymentMethod>("paypal");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [whatsapp, setWhatsapp] = useState(profile?.phone || "");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [paypalDone, setPaypalDone] = useState(false);

  // Load PayPal SDK only when PayPal is selected
  const { loaded: paypalLoaded, error: paypalLoadError } = usePayPalScript(method === "paypal");

  // PayPal success handler (must be before any conditional returns — hooks order)
  const handlePayPalSuccess = useCallback(() => {
    setPaypalDone(true);
    setTimeout(() => navigate("dashboard"), 2000);
  }, [navigate]);

  // PayPal error handler
  const handlePayPalError = useCallback((msg: string) => {
    console.error("[paypal] Checkout error:", msg);
  }, []);

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <button
          onClick={() => navigate("memberships")}
          className="text-sm text-[#0071e3] hover:underline"
        >
          {isAr ? "← العودة للعضويات" : "← Back to memberships"}
        </button>
      </div>
    );
  }

  // Manual payment submit (InstaPay / Vodafone Cash — unchanged)
  const submit = async () => {
    if (!profile) {
      navigate("auth", { mode: "signup" });
      return;
    }
    if (!fullName.trim() || !whatsapp.trim()) {
      toast.error(isAr ? "يرجى ملء الاسم ورقم الواتساب" : "Please fill name + WhatsApp");
      return;
    }
    if (!receipt) {
      toast.error(isAr ? "يرجى رفع إيصال الدفع" : "Please upload payment receipt");
      return;
    }
    setSubmitting(true);
    try {
      const receiptPath = await uploadReceipt(receipt);
      await submitSubscriptionRequest({
        user_id: profile.id,
        full_name: fullName.trim(),
        whatsapp: whatsapp.trim(),
        plan_tier: tier as string,
        duration_months: months as number,
        price_usd: plan.price,
        payment_method: method,
        receipt_path: receiptPath || null,
      });
      setDone(true);
      toast.success(
        isAr ? "تم إرسال طلب الاشتراك! راجعه فريق Musclehubeg قريباً." : "Subscription request sent!",
      );
      setTimeout(() => navigate("dashboard"), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const isManualMethod = method === "instapay" || method === "vodafone_cash";

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button
          className="text-lg font-semibold tracking-tight"
          onClick={() => navigate("memberships")}
        >
          Musclehubeg
          <span className="text-[#0071e3]">EG</span>
        </button>
        <LanguageToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20 md:py-28">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {isAr ? "إتمام الاشتراك" : "Complete your subscription"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73]">
          {isAr
            ? "اختر طريقة الدفع. الدفع عبر PayPal سريع وآمن، أما الدفع اليدوي فيتطلب موافقة الكوتش."
            : "Choose a payment method. PayPal is instant, manual methods require coach approval."}
        </p>

        {/* PayPal success state */}
        {paypalDone ? (
          <div className="mt-12 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-[#34c759]" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              {isAr ? "تم الدفع بنجاح!" : "Payment successful!"}
            </h2>
            <p className="mt-3 text-base font-normal text-[#6e6e73]">
              {isAr
                ? "تم تفعيل اشتراكك تلقائياً. جاري تحويلك إلى لوحة التحكم..."
                : "Your subscription is now active. Redirecting to dashboard..."}
            </p>
            <button
              onClick={() => navigate("dashboard")}
              className="mt-8 rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "العودة للوحة التحكم" : "Go to dashboard"}
            </button>
          </div>
        ) : done ? (
          /* Manual payment success state (unchanged) */
          <div className="mt-12 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isAr ? "تم إرسال طلبك بنجاح!" : "Request sent successfully!"}
            </h2>
            <p className="mt-3 text-base font-normal text-[#6e6e73]">
              {isAr
                ? "استلمنا طلب اشتراكك وإيصال الدفع. راجعه فريق Musclehubeg قريباً وسيتم تفعيل اشتراكك. ستصللك إشعار فور التفعيل."
                : "We received your subscription request and payment receipt. The Musclehubeg team will review and activate your subscription shortly. You'll be notified once it's active."}
            </p>
            <button
              onClick={() => navigate("dashboard")}
              className="mt-8 rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "العودة للوحة التحكم" : "Back to dashboard"}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {/* Summary (unchanged) */}
              <div className="rounded-3xl bg-[#f5f5f7] p-8">
                <h2 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                  {isAr ? "الخطة" : "Plan"}
                </h2>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{plan.name}</p>
                <p className="mt-1 text-sm font-normal text-[#6e6e73]">{plan.sub}</p>

                <div className="mt-6 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-[#6e6e73]">
                      {isAr ? "المدة" : "Duration"}
                    </span>
                    <span className="font-medium">
                      {plan.durationMonths} {isAr ? "شهر" : "months"}
                    </span>
                  </div>
                  {plan.monthlyEquivalent && (
                    <div className="flex items-center justify-between text-xs text-[#6e6e73]">
                      <span>{isAr ? "بمعدل شهري" : "Monthly equivalent"}</span>
                      <span>${plan.monthlyEquivalent.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-[#d2d2d7] pt-3">
                    <span className="font-normal text-[#6e6e73]">
                      {isAr ? "الإجمالي" : "Total"}
                    </span>
                    <span className="text-xl font-semibold">
                      ${plan.price}
                    </span>
                  </div>
                </div>

                {/* Refund policy (unchanged) */}
                <div className="mt-6 rounded-2xl border border-[#d2d2d7] bg-white p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#34c759]" />
                    <div>
                      <p className="text-xs font-semibold">
                        {isAr ? "سياسة الاسترداد" : "Refund policy"}
                      </p>
                      <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                        {isAr
                          ? "استرداد كامل خلال 7 أيام من تفعيل الاشتراك، بشرط عدم استخدام مميزات الخطة المدفوعة."
                          : "Full refund within 7 days of subscription activation, provided that no paid plan features have been used."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-3xl bg-[#f5f5f7] p-8">
                <h2 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                  {isAr ? "طريقة الدفع" : "Payment method"}
                </h2>

                {/* Payment method selection — 3 options */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {/* PayPal (PRIMARY) */}
                  <button
                    onClick={() => setMethod("paypal")}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-medium transition-colors sm:text-sm",
                      method === "paypal"
                        ? "border-[#0071e3] bg-white text-[#0071e3]"
                        : "border-[#d2d2d7] hover:border-[#0071e3]/40",
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wide text-[#0071e3] sm:text-xs">
                      {isAr ? "دفع سريع وآمن" : "Fast & secure"}
                    </span>
                    PayPal
                  </button>
                  {/* InstaPay */}
                  <button
                    onClick={() => setMethod("instapay")}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-normal transition-colors sm:text-sm",
                      method === "instapay"
                        ? "border-[#0071e3] bg-white text-[#0071e3]"
                        : "border-[#d2d2d7] hover:border-[#0071e3]/40",
                    )}
                  >
                    InstaPay
                  </button>
                  {/* Vodafone Cash */}
                  <button
                    onClick={() => setMethod("vodafone_cash")}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-normal transition-colors sm:text-sm",
                      method === "vodafone_cash"
                        ? "border-[#0071e3] bg-white text-[#0071e3]"
                        : "border-[#d2d2d7] hover:border-[#0071e3]/40",
                    )}
                  >
                    {isAr ? "فودافون" : "Vodafone"}
                  </button>
                </div>

                {/* ─── PAYPAL SECTION ─── */}
                {method === "paypal" && (
                  <div className="mt-5">
                    {paypalLoadError ? (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#ff3b30]/20 bg-[#ff3b30]/5 p-6 text-center">
                        <XCircle className="h-8 w-8 text-[#ff3b30]" />
                        <p className="text-sm font-medium text-[#ff3b30]">
                          {isAr
                            ? "PayPal غير متاح حالياً. استخدم الدفع اليدوي."
                            : "PayPal is not available. Please use manual payment."}
                        </p>
                      </div>
                    ) : !paypalLoaded ? (
                      <div className="flex items-center justify-center gap-2 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[#0071e3]" />
                        <span className="text-sm text-[#6e6e73]">
                          {isAr ? "تحميل PayPal..." : "Loading PayPal..."}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 rounded-xl bg-[#0071e3]/5 p-3 text-center text-xs text-[#0071e3]">
                          {isAr
                            ? "ادفع بأمان عبر PayPal. سيتم تفعيل اشتراكك فوراً."
                            : "Pay securely with PayPal. Your subscription activates instantly."}
                        </div>
                        <PayPalButtons
                          planTier={tier as string}
                          durationMonths={months as number}
                          onSuccess={handlePayPalSuccess}
                          onError={handlePayPalError}
                          isAr={isAr}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* ─── MANUAL PAYMENT SECTION (InstaPay / Vodafone Cash — unchanged) ─── */}
                {isManualMethod && (
                  <>
                    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 p-5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static QR asset rendered as-is; optimization must never touch a scannable QR (CoachWalletView precedent) */}
                      <img
                        src={method === "instapay" ? "/qr-instapay.png" : "/qr-vodafone.png"}
                        alt={method === "instapay" ? "InstaPay QR Code" : "Vodafone Cash QR Code"}
                        className="h-48 w-48 rounded-xl object-contain"
                        loading="eager"
                      />
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        {isAr ? "امسح الكود للدفع" : "Scan QR to pay"}
                      </p>
                      <p className="mt-2 font-mono text-sm font-semibold" dir="ltr">
                        {method === "instapay" ? "musclehub@instapay" : "01000000000"}
                      </p>
                    </div>

                    {/* Contact info + receipt upload (unchanged) */}
                    <div className="mt-5 space-y-3">
                      <div>
                        <Label htmlFor="fullname">{isAr ? "الاسم" : "Full name"}</Label>
                        <Input
                          id="fullname"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={isAr ? "محمد علي" : "Mohamed Ali"}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="+20 100 000 0000"
                          className="mt-1.5"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receipt">
                          {isAr ? "إيصال الدفع (صورة / PDF)" : "Payment receipt (image / PDF)"}
                        </Label>
                        <div className="mt-1.5">
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 transition-colors hover:border-primary/40",
                              receipt && "border-primary/40 bg-primary/5",
                            )}
                          >
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">
                              {receipt
                                ? receipt.name
                                : isAr
                                  ? "اضغط لرفع الإيصال"
                                  : "Click to upload receipt"}
                            </span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="mt-5 w-full gap-2"
                      disabled={submitting || !receipt || !fullName.trim() || !whatsapp.trim()}
                      onClick={submit}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.loading")}
                        </>
                      ) : (
                        <>
                          {isAr ? "إرسال طلب الاشتراك" : "Submit subscription request"}
                          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <button
              className="mt-6 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => navigate("memberships")}
            >
              {isAr ? "← العودة للعضويات" : "← Back to memberships"}
            </button>
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Musclehubeg. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}
