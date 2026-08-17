"use client";

import { useState } from "react";
import { ArrowRight, Upload, Loader2, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { getTier, type TierId, type Duration, type PaymentMethod } from "@/lib/plans";
import { MEMBERSHIPS, type MembershipTier } from "@/lib/memberships";
import { submitSubscriptionRequest, uploadReceipt } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Unified checkout — supports both:
 *   1. New membership tiers (premium, pro) — uses MEMBERSHIPS table for
 *      pricing ($9.99/$19.99 monthly, $79.99/$149.99 yearly)
 *   2. Legacy coaching tiers (starter, elite) — kept for backward compat
 *      with any old links
 */

type PlanInfo = {
  name: string;
  sub: string;
  price: number; // USD for the chosen duration
  durationMonths: number;
  monthlyEquivalent?: number; // for yearly plans: /12
};

function resolvePlan(tier: string, months: number, isAr: boolean): PlanInfo | null {
  // New membership tiers
  const m = MEMBERSHIPS.find((x) => x.id === tier);
  if (m && (m.id === "premium" || m.id === "pro")) {
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

  // Legacy tiers (starter, elite)
  const legacy = getTier(tier as TierId);
  if (legacy) {
    const price = legacy.prices[months as Duration] ?? legacy.prices[1];
    return {
      name: isAr ? tier : tier.charAt(0).toUpperCase() + tier.slice(1),
      sub: isAr ? "اشتراك" : "Subscription",
      price,
      durationMonths: months,
    };
  }

  return null;
}

export function CheckoutView({ tier, months }: { tier: TierId | MembershipTier; months: Duration }) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { navigate } = useNav();
  const { profile } = useAuth();
  const plan = resolvePlan(tier as string, months as number, isAr);

  const [method, setMethod] = useState<PaymentMethod>("instapay");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [whatsapp, setWhatsapp] = useState(profile?.phone || "");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
        price_egp: plan.price, // field name kept for DB compat, value is USD
        payment_method: method,
        receipt_path: receiptPath || null,
      });
      setDone(true);
      toast.success(
        isAr ? "تم إرسال طلب الاشتراك! راجعه فريق MuscleHub قريباً." : "Subscription request sent!",
      );
      setTimeout(() => navigate("dashboard"), 3000);
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button
          className="text-lg font-semibold tracking-tight"
          onClick={() => navigate("memberships")}
        >
          MuscleHub
        </button>
        <LanguageToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20 md:py-28">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {isAr ? "إتمام الاشتراك" : "Complete your subscription"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73]">
          {isAr
            ? "اختر طريقة الدفع وارفع الإيصال. هنفعّل اشتراكك خلال 24 ساعة."
            : "Choose a payment method and upload your receipt. We'll activate within 24 hours."}
        </p>

        {done ? (
          <div className="mt-12 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isAr ? "تم إرسال طلبك بنجاح!" : "Request sent successfully!"}
            </h2>
            <p className="mt-3 text-base font-normal text-[#6e6e73]">
              {isAr
                ? "استلمنا طلب اشتراكك وإيصال الدفع. راجعه فريق MuscleHub قريباً وسيتم تفعيل اشتراكك. ستصللك إشعار فور التفعيل."
                : "We received your subscription request and payment receipt. The MuscleHub team will review and activate your subscription shortly. You'll be notified once it's active."}
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
              {/* Summary */}
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

                {/* Refund policy */}
                <div className="mt-6 rounded-2xl border border-[#d2d2d7] bg-white p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#34c759]" />
                    <div>
                      <p className="text-xs font-semibold">
                        {isAr ? "سياسة الاسترداد" : "Refund policy"}
                      </p>
                      <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                        {isAr
                          ? "استرداد كامل خلال 7 أيام من تفعيل الاشتراك، بشرط عدم استخدام مميزات الخطة المدفوعة (توليد خطط، تبديلات، حفظ نتائج). بمجرد استخدام أي ميزة مدفوعة، لا يُسترد الاشتراك."
                          : "Full refund within 7 days of subscription activation, provided that no paid plan features have been used (plan generation, swaps, saved results). Once any paid feature is used, the subscription is non-refundable."}
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
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMethod("instapay")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-normal transition-colors",
                      method === "instapay"
                        ? "border-[#0071e3] bg-white text-[#0071e3]"
                        : "border-[#d2d2d7] hover:border-[#0071e3]/40",
                    )}
                  >
                    {isAr ? "InstaPay" : "InstaPay"}
                  </button>
                  <button
                    onClick={() => setMethod("vodafone_cash")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-normal transition-colors",
                      method === "vodafone_cash"
                        ? "border-[#0071e3] bg-white text-[#0071e3]"
                        : "border-[#d2d2d7] hover:border-[#0071e3]/40",
                    )}
                  >
                    {isAr ? "فودافون كاش" : "Vodafone Cash"}
                  </button>
                </div>

                <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 p-5">
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

                {/* Contact info + receipt upload */}
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
        © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
      </footer>
    </div>
  );
}
