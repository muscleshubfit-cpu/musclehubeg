"use client";

import { useState } from "react";
import { Dumbbell, ArrowRight, QrCode, CreditCard, Smartphone, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { getTier, type TierId, type Duration, type PaymentMethod } from "@/lib/plans";
import { submitSubscriptionRequest, uploadReceipt } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Reveal, PageFade } from "@/components/motion";

export function CheckoutView({ tier, months }: { tier: TierId; months: Duration }) {
 const { t } = useI18n();
 const { navigate } = useNav();
 const { profile } = useAuth();
 const tierData = getTier(tier)!;
 const price = tierData.prices[months];
 const [method, setMethod] = useState<PaymentMethod>("instapay");
 const [fullName, setFullName] = useState(profile?.full_name || "");
 const [whatsapp, setWhatsapp] = useState(profile?.phone || "");
 const [receipt, setReceipt] = useState<File | null>(null);
 const [submitting, setSubmitting] = useState(false);
 const [done, setDone] = useState(false);

 const submit = async () => {
 if (!profile) {
 navigate("auth", { mode: "signup" });
 return;
 }
 if (!fullName.trim() || !whatsapp.trim()) {
 toast.error("يرجى ملء الاسم ورقم الواتساب");
 return;
 }
 if (!receipt) {
 toast.error("يرجى رفع إيصال الدفع");
 return;
 }
 setSubmitting(true);
 try {
 const receiptPath = await uploadReceipt(receipt);
 await submitSubscriptionRequest({
 user_id: profile.id,
 full_name: fullName.trim(),
 whatsapp: whatsapp.trim(),
 plan_tier: tier,
 duration_months: months,
 price_egp: price, // field name kept for DB compatibility, but value is in USD
 payment_method: method,
 receipt_path: receiptPath || null,
 });
 setDone(true);
 toast.success("تم إرسال طلب الاشتراك! سيراجعه الكوتش قريباً.");
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
 onClick={() => navigate("pricing")}
 >
 MuscleHub
 </button>
 <LanguageToggle />
 </header>

 <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20 md:py-28">
 <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{t("checkout.title")}</h1>

 {done ? (
 <div className="mt-12 rounded-3xl bg-[#f5f5f7] p-12 text-center">
 <h2 className="text-2xl font-semibold tracking-tight">تم إرسال طلبك بنجاح!</h2>
 <p className="mt-3 text-base font-normal text-[#6e6e73]">
 استلمنا طلب اشتراكك وإيصال الدفع. سيراجعه الكوتش أحمد قريباً وسيتم تفعيل اشتراكك.
 ستصللك إشعار فور التفعيل.
 </p>
 <button
 onClick={() => navigate("dashboard")}
 className="mt-8 rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
 >
 العودة للوحة التحكم
 </button>
 </div>
 ) : (
 <div className="mt-12 grid gap-6 md:grid-cols-2">
 {/* Summary */}
 <div className="rounded-3xl bg-[#f5f5f7] p-8">
 <h2 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
 {t("checkout.plan")}
 </h2>
 <p className="mt-2 text-2xl font-semibold tracking-tight">{t(tierData.nameKey)}</p>
 <p className="mt-1 text-sm font-normal text-[#6e6e73]">{t(tierData.subKey)}</p>

 <div className="mt-6 space-y-2 text-sm">
 <div className="flex items-center justify-between">
 <span className="font-normal text-[#6e6e73]">{t("checkout.duration")}</span>
 <span className="font-medium">{months} {t("pricing.months")}</span>
 </div>
 <div className="flex items-center justify-between border-t border-[#d2d2d7] pt-3">
 <span className="font-normal text-[#6e6e73]">{t("checkout.total")}</span>
 <span className="text-xl font-semibold">
 ${price} {months === 1 ? "/شهر" : "/سنة"}
 </span>
 </div>
 </div>
 </div>

 {/* Payment */}
 <div className="rounded-3xl bg-[#f5f5f7] p-8">
 <h2 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
 {t("checkout.method")}
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
 {t("checkout.instapay")}
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
 {t("checkout.vodafone")}
 </button>
 </div>

 <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 p-5">
 {/* Real QR code image — switches based on payment method */}
 <img
 src={method === "instapay" ? "/qr-instapay.png" : "/qr-vodafone.png"}
 alt={method === "instapay" ? "InstaPay QR Code" : "Vodafone Cash QR Code"}
 className="h-48 w-48 rounded-xl object-contain"
 loading="eager"
 />
 <p className="mt-3 text-center text-xs text-muted-foreground">{t("checkout.scanQr")}</p>
 <p className="mt-2 font-mono text-sm font-semibold" dir="ltr">
 {method === "instapay" ? "ahmedzake@instapay" : "01000000000"}
 </p>
 </div>

 {/* Contact info + receipt upload */}
 <div className="mt-5 space-y-3">
 <div>
 <Label htmlFor="fullname">{t("auth.fullName")}</Label>
 <Input
 id="fullname"
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder="Ahmed Ali"
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
 <Label htmlFor="receipt">إيصال الدفع (صورة / PDF)</Label>
 <div className="mt-1.5">
 <label
 className={cn(
 "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 transition-colors hover:border-primary/40",
 receipt && "border-primary/40 bg-primary/5",
 )}
 >
 <Upload className="h-5 w-5 text-muted-foreground" />
 <span className="text-sm">
 {receipt ? receipt.name : "اضغط لرفع الإيصال"}
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
 {t("checkout.pay")}
 <ArrowRight className="h-4 w-4 rtl:rotate-180" />
 </>
 )}
 </Button>
 </div>
 </div>
 )}

 <button
 className="mt-6 text-sm text-muted-foreground hover:text-foreground"
 onClick={() => navigate("pricing")}
 >
 ← {t("checkout.backToPricing")}
 </button>
 </main>

 <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
 © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
 </footer>
 </div>
 );
}
