"use client";

import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { PageBanner } from "@/components/PageBanner";
import { EngravedIcon } from "@/components/ThemeImg";
import { ShareButtons } from "@/components/ShareButtons";
import {
  MEMBERSHIPS,
  COMPARISON_ROWS,
  translateCell,
  type MembershipTier,
} from "@/lib/memberships";
import { Check } from "lucide-react";

export default function MembershipsPage({ lang: langProp }: { lang?: Lang } = {}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";
  const { profile } = useAuth();

  const tiers = MEMBERSHIPS.filter((m) => !m.separate);
  const coaching = MEMBERSHIPS.find((m) => m.id === "coaching");

  // Compute CTA target per tier:
  //   - Free:   if logged in → /profile,  if logged out → /auth?mode=signup
  //   - Premium/Pro: /checkout?tier=<id>&months=1|12  (checkout requires login)
  const ctaHref = (tierId: MembershipTier, months: 1 | 12) => {
    if (tierId === "free") {
      if (profile) return "/profile";
      return "/auth?mode=signup";
    }
    return `/checkout?tier=${tierId}&months=${months}`;
  };

  const ctaLabel = (tierId: MembershipTier, isAr: boolean) => {
    if (tierId === "free") {
      if (profile) return isAr ? "اذهب لصفحتك" : "Go to your profile";
      return isAr ? "ابدأ مجاناً" : "Get started free";
    }
    return isAr ? "اشترك الآن" : "Subscribe now";
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Owner artwork page banner (Phase 127 — 12 header images are PAGE banners) */}
        <PageBanner section="pricing" className="mb-10" />

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "عضويات Alkemos" : "Alkemos Memberships"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[var(--muted-foreground)] md:text-lg">
            {isAr
              ? "اختر العضوية المناسبة لك. شهري أو سنوي. ألغِ في أي وقت."
              : "Choose the plan that fits you. Monthly or yearly. Cancel anytime."}
          </p>
        </div>

        {/* Pricing cards — redesigned for higher conversion */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {tiers.map((tier) => {
            const isFree = tier.id === "free";
            const isPro = tier.id === "pro";
            const hasYearly = tier.priceYearly !== null && tier.priceYearly !== undefined;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col p-6 md:p-8 transition-transform duration-300 hover:-translate-y-0.5 ${
                  isPro
                    ? "marble-card text-[#F5F5F7] md:scale-105"
                    : "marble-card"
                }`}
                style={
                  isPro
                    ? {
                        backgroundColor: "#0B0B0D",
                        color: "#F5F5F7",
                        border: "2px solid transparent",
                        backgroundImage:
                          "linear-gradient(#0B0B0D, #0B0B0D), linear-gradient(145deg, #FDFDFD 0%, #C9CED3 35%, #878E94 50%, #E6E9EC 70%, #9AA0A6 100%)",
                        backgroundOrigin: "border-box",
                        backgroundClip: "padding-box, border-box",
                      }
                    : undefined
                }
              >
                {isPro && (
                  <span className="seal-chip absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0B0B0D]" style={{ color: "#F5F5F7", borderColor: "#3A3F45" }}>
                    <EngravedIcon name="laurel" alt="" size={12} className="h-3 w-3" />
                    {isAr ? "الأكثر شعبية" : "Most Popular"}
                  </span>
                )}

                {/* Tier name + badge */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">
                    {isAr ? tier.nameAr : tier.nameEn}
                  </h3>
                  {isFree && (
                    <span className="seal-chip">
                      {isAr ? "مجاني للأبد" : "Free forever"}
                    </span>
                  )}
                </div>

                {/* Monthly price (always visible) */}
                <div className="mt-5">
                  <p className={`text-xs font-medium ${isPro ? "text-[#9BA0A6]" : "text-[var(--muted-foreground)]"}`}>
                    {isAr ? "شهري" : "Monthly"}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-4xl font-semibold tracking-tight ${isFree ? "" : "chrome-text"}`}>
                      {isFree ? (isAr ? "مجاني" : "Free") : `$${tier.priceMonthly!.toFixed(2)}`}
                    </span>
                    {!isFree && (
                      <span className={`text-sm font-normal ${isPro ? "text-[#9BA0A6]" : "text-[var(--muted-foreground)]"}`}>
                        /{isAr ? "شهر" : "mo"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Yearly price (shown on the same card when available) */}
                {hasYearly && !isFree && (
                  <div className="marble-card mt-4 p-3" style={isPro ? { backgroundColor: "#141518", color: "#F5F5F7" } : undefined}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isPro ? "text-[#B9BEC4]" : "text-[var(--muted-2)]"}`}>
                        {isAr ? "سنوي" : "Yearly"}
                      </span>
                      <span className="seal-chip">-33%</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="chrome-text text-xl font-semibold tracking-tight">
                        ${tier.priceYearly!.toFixed(2)}
                      </span>
                      <span className={`text-xs font-normal ${isPro ? "text-[#9BA0A6]" : "text-[var(--muted-foreground)]"}`}>
                        /{isAr ? "سنة" : "yr"}
                      </span>
                    </div>
                    <p className={`mt-1 text-[10px] font-normal ${isPro ? "text-[#9BA0A6]" : "text-[var(--muted-foreground)]"}`}>
                      ${(tier.priceYearly! / 12).toFixed(2)}/{isAr ? "شهر" : "mo"} {isAr ? "بمعدل" : "avg"}
                    </p>
                  </div>
                )}

                {/* Features */}
                <ul className="mt-6 flex-1 space-y-3">
                  {(isAr ? tier.features : tier.featuresEn).map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-[#C9CED3]" : "text-[var(--text)]"}`} aria-hidden="true" />
                      <span className="text-sm font-normal">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA buttons — chrome identity (Phase 127) */}
                <div className="mt-6 space-y-2">
                  {isFree ? (
                    <a
                      href={ctaHref(tier.id, 1)}
                      className="btn-outline block w-full px-6 py-3.5 text-center text-sm font-semibold"
                    >
                      {ctaLabel(tier.id, isAr)}
                    </a>
                  ) : (
                    <>
                      {/* Monthly CTA — primary chrome action */}
                      <a
                        href={ctaHref(tier.id, 1)}
                        className="btn-chrome block w-full px-6 py-3.5 text-center text-sm"
                      >
                        {isAr ? `اشترك الآن - $${tier.priceMonthly!.toFixed(2)}/شهر` : `Subscribe Now - $${tier.priceMonthly!.toFixed(2)}/mo`}
                      </a>
                      {/* Yearly CTA — secondary */}
                      {hasYearly && (
                        <a
                          href={ctaHref(tier.id, 12)}
                          className={`flex items-center justify-center gap-2 w-full px-6 py-3 text-center text-sm font-semibold ${
                            isPro ? "btn-outline border-[#3A3F45] text-[#F5F5F7]" : "btn-outline"
                          }`}
                        >
                          <span>{isAr ? `سنوي - $${tier.priceYearly!.toFixed(2)}` : `Yearly - $${tier.priceYearly!.toFixed(2)}`}</span>
                          <span className="seal-chip">-33%</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Refund policy banner */}
        <div className="marble-card mt-12 p-6">
          <div className="flex items-start gap-3">
            <EngravedIcon name="checkseal" alt="" size={26} className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <h3 className="text-base font-semibold">
                {isAr ? "سياسة الاسترداد" : "Refund policy"}
              </h3>
              <p className="mt-2 text-sm font-normal text-[var(--muted-foreground)]">
                {isAr
                  ? "نقدم استرداد كامل خلال 7 أيام من تفعيل الاشتراك، بشرط عدم استخدام أي ميزة مدفوعة في الخطة (توليد خطط تغذية/تمارين، تبديلات EVO، حفظ نتائج أدوات، تحميل PDF). بمجرد استخدام أي ميزة مدفوعة، يصبح الاشتراك غير قابل للاسترداد. الاشتراك المجاني لا يتطلب استرداد."
                  : "We offer a full refund within 7 days of subscription activation, provided that no paid plan features have been used (nutrition/workout plan generation, EVO swaps, saved tool results, PDF exports). Once any paid feature is used, the subscription becomes non-refundable. The Free tier requires no refund since it's free forever."}
              </p>
            </div>
          </div>
        </div>

        {/* Coaching — separate section, dark marble band (identity) */}
        {coaching && (
          <div className="marble-card mt-12 p-6 text-[#F5F5F7] md:p-10" style={{ backgroundColor: "#0B0B0D", color: "#F5F5F7" }}>
            <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="seal-chip" style={{ color: "#F5F5F7", borderColor: "#3A3F45" }}>
                    {isAr ? "كوتش بشري" : "Human Coach"}
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {isAr ? coaching.nameAr : coaching.nameEn}
                  </h3>
                </div>
                <p className="mt-3 text-sm font-normal text-[#9BA0A6]">
                  {isAr
                    ? "كوتشينج بشري مع مدربين وأخصائيين تغذية محترفين. خطط مخصصة + متابعة شخصية."
                    : "Human coaching with professional coaches and nutrition specialists. Personalized plans + personal follow-up."}
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(isAr ? coaching.features : coaching.featuresEn).map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9CED3]" aria-hidden="true" />
                      <span className="text-sm font-normal">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 shrink-0 md:ms-8 md:mt-0">
                <a
                  href="/coaching"
                  className="btn-chrome inline-flex items-center gap-2 px-8 py-4 text-sm"
                >
                  {isAr ? "ابدأ الآن ›" : "Get Started ›"}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Comparison table */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "مقارنة العضويات" : "Compare all plans"}
          </h2>
          <div className="marble-card mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--tint)]">
                  <th className="p-4 text-start text-xs font-medium text-[var(--muted-foreground)]">
                    {isAr ? "الميزة" : "Feature"}
                  </th>
                  <th className="p-4 text-center text-xs font-medium text-[var(--muted-foreground)]">Free</th>
                  <th className="p-4 text-center text-xs font-semibold text-[var(--text)]">Premium</th>
                  <th className="p-4 text-center text-xs font-semibold text-[var(--text)]">Pro</th>
                  <th className="p-4 text-center text-xs font-medium text-[var(--muted-foreground)]">Coaching</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-t border-[var(--edge)]">
                    <td className="p-4 text-start font-medium">{isAr ? row.feature : row.featureEn}</td>
                    <td className="p-4 text-center">
                      {row.free === "✓" ? (
                        <EngravedIcon name="checkseal" alt="" size={20} className="mx-auto h-5 w-5" />
                      ) : row.free === "—" ? (
                        <span className="text-[var(--muted-foreground)] opacity-50" aria-label="No">×</span>
                      ) : (
                        <span className="text-xs font-normal text-[var(--muted-foreground)]">{translateCell(row.free, isAr)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center" style={{ backgroundColor: "var(--tint)", borderInline: "var(--border-chrome)" }}>
                      {row.premium === "✓" ? (
                        <EngravedIcon name="checkseal" alt="" size={20} className="mx-auto h-5 w-5" />
                      ) : row.premium === "—" ? (
                        <span className="text-[var(--muted-foreground)] opacity-50" aria-label="No">×</span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--muted-2)]">{translateCell(row.premium, isAr)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.pro === "✓" ? (
                        <EngravedIcon name="checkseal" alt="" size={20} className="mx-auto h-5 w-5" />
                      ) : row.pro === "—" ? (
                        <span className="text-[var(--muted-foreground)] opacity-50" aria-label="No">×</span>
                      ) : (
                        <span className="text-xs font-medium">{translateCell(row.pro, isAr)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.coaching === "✓" ? (
                        <EngravedIcon name="checkseal" alt="" size={20} className="mx-auto h-5 w-5 opacity-70" />
                      ) : row.coaching === "—" ? (
                        <span className="text-[var(--muted-foreground)] opacity-50" aria-label="No">×</span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--muted-2)]">{translateCell(row.coaching, isAr)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "أسئلة شائعة" : "Questions?"}
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-4">
            {[
              {
                q: isAr ? "هل أقدر ألغي في أي وقت؟" : "Can I cancel anytime?",
                a: isAr
                  ? "نعم، من صفحة حسابك اضغط «إلغاء الاشتراك». مفيش خصم تلقائي — باقتك هتفضل شغالة لآخر مدة دفعتها وبعدها تخلص لو ما جدّدتش."
                  : "Yes — on your account page press “Cancel subscription”. Nothing auto-renews: your plan stays active until the period you paid for ends, then simply stops unless you pay again.",
              },
              {
                q: isAr ? "هل فيه سياسة استرداد؟" : "Is there a refund policy?",
                a: isAr
                  ? "نعم، استرداد كامل خلال 7 أيام من التفعيل بشرط عدم استخدام المميزات المدفوعة (توليد خطط، تبديلات، حفظ نتائج)."
                  : "Yes, full refund within 7 days of activation, provided no paid features (plan generation, swaps, saved results) have been used.",
              },
              {
                q: isAr ? "هل الكوتشينج مشمول في Pro؟" : "Is coaching included in Pro?",
                a: isAr
                  ? "لا، الكوتشينج منفصل تماماً عن العضويات. Pro يعطيك صلاحيات المنصة، الكوتشينج مدرب بشري."
                  : "No, coaching is completely separate from memberships. Pro gives you platform features, coaching gives you a human coach.",
              },
              {
                q: isAr ? "هل فيه تجربة مجانية؟" : "Is there a free trial?",
                a: isAr ? "لا، مفيش تجربة مجانية. بس الـ Free tier مجاني للأبد." : "No free trial. But the Free tier is free forever.",
              },
              {
                q: isAr ? "طرق الدفع؟" : "Payment methods?",
                a: isAr ? "PayPal (الطريقة الرئيسية — فورية وآمنة)، InstaPay، و Vodafone Cash. PayPal يعالج الدفع تلقائياً؛ الطرق اليدوية تتطلب رفع إيصال يراجعه الكوتش خلال 24 ساعة." : "PayPal (primary — instant and secure), InstaPay, and Vodafone Cash. PayPal processes automatically; manual methods require uploading a receipt reviewed within 24 hours.",
              },
            ].map((faq, i) => (
              <div key={i} className="marble-card p-5">
                <h3 className="text-sm font-semibold">{faq.q}</h3>
                <p className="mt-1.5 text-sm font-normal text-[var(--muted-foreground)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Share */}
        <div className="marble-card mt-8 flex items-center justify-between gap-4 p-4">
          <p className="text-sm font-medium">
            {isAr ? "شارك صفحة العضويات" : "Share memberships page"}
          </p>
          <ShareButtons title={isAr ? "عضويات Alkemos" : "Alkemos Memberships"} />
        </div>
      </main>
    </div>
  );
}
