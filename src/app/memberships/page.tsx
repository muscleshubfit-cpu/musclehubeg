"use client";

import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  MEMBERSHIPS,
  COMPARISON_ROWS,
  translateCell,
  type MembershipTier,
} from "@/lib/memberships";
import { Check, X, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "عضويات MuscleHubEG" : "MuscleHubEG Memberships"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
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
            const isPremium = tier.id === "premium";
            const hasYearly = tier.priceYearly !== null && tier.priceYearly !== undefined;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-3xl p-6 md:p-8 transition-all duration-300 hover:scale-[1.02] ${
                  isPro
                    ? "bg-gradient-to-b from-[#1d1d1f] to-[#2a2a2e] text-white ring-2 ring-[#0071e3] shadow-2xl shadow-[#0071e3]/20 md:scale-105"
                    : isPremium
                    ? "bg-white text-[#1d1d1f] ring-1 ring-[#0071e3]/30 shadow-lg shadow-[#0071e3]/10"
                    : "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-[#d2d2d7]"
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#0071e3] to-[#0090e3] px-5 py-1.5 text-xs font-bold text-white shadow-lg">
                    ⭐ {isAr ? "الأكثر شعبية" : "Most Popular"}
                  </span>
                )}

                {/* Tier name + badge */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">
                    {isAr ? tier.nameAr : tier.nameEn}
                  </h3>
                  {isFree && (
                    <span className="rounded-full bg-[#34c759]/15 px-3 py-1 text-[10px] font-bold text-[#34c759]">
                      {isAr ? "مجاني للأبد" : "Free forever"}
                    </span>
                  )}
                </div>

                {/* Monthly price (always visible) */}
                <div className="mt-5">
                  <p className={`text-xs font-medium ${isPro ? "text-gray-400" : "text-[#6e6e73]"}`}>
                    {isAr ? "شهري" : "Monthly"}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">
                      {isFree ? (isAr ? "مجاني" : "Free") : `$${tier.priceMonthly!.toFixed(2)}`}
                    </span>
                    {!isFree && (
                      <span className={`text-sm font-normal ${isPro ? "text-gray-400" : "text-[#6e6e73]"}`}>
                        /{isAr ? "شهر" : "mo"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Yearly price (shown on the same card when available) */}
                {hasYearly && !isFree && (
                  <div className="mt-4 rounded-2xl bg-[#34c759]/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isPro ? "text-[#34c759]" : "text-[#34c759]"}`}>
                        {isAr ? "سنوي" : "Yearly"}
                      </span>
                      <span className="rounded-full bg-[#34c759] px-2 py-0.5 text-[10px] font-semibold text-white">
                        -33%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="text-xl font-semibold tracking-tight">
                        ${tier.priceYearly!.toFixed(2)}
                      </span>
                      <span className={`text-xs font-normal ${isPro ? "text-gray-400" : "text-[#6e6e73]"}`}>
                        /{isAr ? "سنة" : "yr"}
                      </span>
                    </div>
                    <p className={`mt-1 text-[10px] font-normal ${isPro ? "text-gray-400" : "text-[#6e6e73]"}`}>
                      ${(tier.priceYearly! / 12).toFixed(2)}/{isAr ? "شهر" : "mo"} {isAr ? "بمعدل" : "avg"}
                    </p>
                  </div>
                )}

                {/* Features */}
                <ul className="mt-6 flex-1 space-y-3">
                  {(isAr ? tier.features : tier.featuresEn).map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-[#0071e3]" : "text-[#34c759]"}`} />
                      <span className="text-sm font-normal">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA buttons — clear "Subscribe Now" for higher conversion */}
                <div className="mt-6 space-y-2">
                  {isFree ? (
                    <a
                      href={ctaHref(tier.id, 1)}
                      className={`block w-full rounded-full px-6 py-3.5 text-center text-sm font-bold transition-all hover:scale-[1.02] ${
                        isPro
                          ? "bg-white text-[#1d1d1f] shadow-lg"
                          : "bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]"
                      }`}
                    >
                      {ctaLabel(tier.id, isAr)}
                    </a>
                  ) : (
                    <>
                      {/* Monthly CTA — primary action */}
                      <a
                        href={ctaHref(tier.id, 1)}
                        className={`block w-full rounded-full px-6 py-3.5 text-center text-sm font-bold transition-all hover:scale-[1.02] ${
                          isPro
                            ? "bg-gradient-to-r from-[#0071e3] to-[#0090e3] text-white shadow-lg shadow-[#0071e3]/30"
                            : "bg-[#0071e3] text-white shadow-md shadow-[#0071e3]/20"
                        }`}
                      >
                        {isAr ? `اشترك الآن - $${tier.priceMonthly!.toFixed(2)}/شهر` : `Subscribe Now - $${tier.priceMonthly!.toFixed(2)}/mo`}
                      </a>
                      {/* Yearly CTA — secondary with savings badge */}
                      {hasYearly && (
                        <a
                          href={ctaHref(tier.id, 12)}
                          className={`flex items-center justify-center gap-2 w-full rounded-full px-6 py-3 text-center text-sm font-bold transition-all hover:scale-[1.02] border ${
                            isPro
                              ? "border-white/20 bg-white/10 text-white"
                              : "border-[#34c759]/40 bg-[#34c759]/5 text-[#34c759]"
                          }`}
                        >
                          <span>{isAr ? `سنوي - $${tier.priceYearly!.toFixed(2)}` : `Yearly - $${tier.priceYearly!.toFixed(2)}`}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isPro ? "bg-white/20 text-white" : "bg-[#34c759] text-white"}`}>
                            -33%
                          </span>
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
        <div className="mt-12 rounded-3xl border border-[#34c759]/30 bg-[#34c759]/5 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#34c759]" />
            <div>
              <h3 className="text-base font-semibold">
                {isAr ? "سياسة الاسترداد" : "Refund policy"}
              </h3>
              <p className="mt-2 text-sm font-normal text-[#6e6e73]">
                {isAr
                  ? "نقدم استرداد كامل خلال 7 أيام من تفعيل الاشتراك، بشرط عدم استخدام أي ميزة مدفوعة في الخطة (توليد خطط تغذية/تمارين، تبديلات EVO، حفظ نتائج أدوات، تحميل PDF). بمجرد استخدام أي ميزة مدفوعة، يصبح الاشتراك غير قابل للاسترداد. الاشتراك المجاني لا يتطلب استرداد."
                  : "We offer a full refund within 7 days of subscription activation, provided that no paid plan features have been used (nutrition/workout plan generation, EVO swaps, saved tool results, PDF exports). Once any paid feature is used, the subscription becomes non-refundable. The Free tier requires no refund since it's free forever."}
              </p>
            </div>
          </div>
        </div>

        {/* Coaching — separate section, redesigned for higher conversion */}
        {coaching && (
          <div className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] p-6 text-white shadow-2xl shadow-[#8b5cf6]/20 md:p-10">
            <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    {isAr ? "كوتش بشري" : "Human Coach"}
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {isAr ? coaching.nameAr : coaching.nameEn}
                  </h3>
                </div>
                <p className="mt-3 text-sm font-normal text-white/80">
                  {isAr
                    ? "كوتشينج بشري مع مدربين وأخصائيين تغذية محترفين. خطط مخصصة + متابعة شخصية."
                    : "Human coaching with professional coaches and nutrition specialists. Personalized plans + personal follow-up."}
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(isAr ? coaching.features : coaching.featuresEn).map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                      <span className="text-sm font-normal">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 shrink-0 md:ms-8 md:mt-0">
                <a
                  href="/coaching"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#8b5cf6] shadow-lg transition-all hover:scale-[1.05]"
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
          <div className="mt-8 overflow-x-auto rounded-3xl border border-[#d2d2d7]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f5f5f7]">
                  <th className="p-4 text-start text-xs font-medium text-[#6e6e73]">
                    {isAr ? "الميزة" : "Feature"}
                  </th>
                  <th className="p-4 text-center text-xs font-medium text-[#6e6e73]">Free</th>
                  <th className="p-4 text-center text-xs font-medium text-[#0071e3]">Premium</th>
                  <th className="p-4 text-center text-xs font-medium text-[#1d1d1f]">Pro</th>
                  <th className="p-4 text-center text-xs font-medium text-[#8b5cf6]">Coaching</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-t border-[#d2d2d7]/60">
                    <td className="p-4 text-start font-medium">{isAr ? row.feature : row.featureEn}</td>
                    <td className="p-4 text-center">
                      {row.free === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#34c759]" />
                      ) : row.free === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-normal text-[#6e6e73]">{translateCell(row.free, isAr)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center bg-[#0071e3]/[0.03]">
                      {row.premium === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#34c759]" />
                      ) : row.premium === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-medium text-[#0071e3]">{translateCell(row.premium, isAr)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.pro === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#34c759]" />
                      ) : row.pro === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-medium">{translateCell(row.pro, isAr)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.coaching === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#8b5cf6]" />
                      ) : row.coaching === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-medium text-[#8b5cf6]">{translateCell(row.coaching, isAr)}</span>
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
                  ? "نعم، تقدر تلغي اشتراكك في أي وقت من صفحة حسابك."
                  : "Yes, you can cancel your subscription anytime from your account page.",
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
              <div key={i} className="rounded-2xl bg-[#f5f5f7] p-5">
                <h3 className="text-sm font-semibold">{faq.q}</h3>
                <p className="mt-1.5 text-sm font-normal text-[#6e6e73]">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Share */}
        <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4">
          <p className="text-sm font-medium">
            {isAr ? "شارك صفحة العضويات" : "Share memberships page"}
          </p>
          <ShareButtons title={isAr ? "عضويات MuscleHubEG" : "MuscleHubEG Memberships"} />
        </div>
      </main>
    </div>
  );
}
