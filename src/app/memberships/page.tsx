"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  MEMBERSHIPS,
  COMPARISON_ROWS,
  getPriceString,
  type MembershipTier,
} from "@/lib/memberships";
import { Check, X, ChevronRight, Sparkles } from "lucide-react";

export default function MembershipsPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const tiers = MEMBERSHIPS.filter((m) => !m.separate);
  const coaching = MEMBERSHIPS.find((m) => m.id === "coaching");

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "عضويات MuscleHub" : "MuscleHub Memberships"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "اختر العضوية المناسبة لك. طيّر في أي وقت."
              : "Choose the plan that fits you. Cancel anytime."}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full bg-[#f5f5f7] p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                billing === "monthly" ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]"
              }`}
            >
              {isAr ? "شهري" : "Monthly"}
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                billing === "yearly" ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]"
              }`}
            >
              {isAr ? "سنوي" : "Yearly"}
              <span className="ms-1.5 rounded-full bg-[#34c759] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                -33%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {tiers.map((tier, i) => {
            const price = getPriceString(tier);
            const displayPrice =
              billing === "yearly" && tier.priceYearly
                ? `$${(tier.priceYearly / 12).toFixed(2)}`
                : tier.priceMonthly === 0
                  ? "Free"
                  : `$${tier.priceMonthly!.toFixed(2)}`;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-3xl p-6 md:p-8 ${
                  tier.highlight
                    ? "bg-[#1d1d1f] text-white ring-2 ring-[#0071e3]"
                    : "bg-[#f5f5f7] text-[#1d1d1f]"
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0071e3] px-4 py-1 text-xs font-semibold text-white">
                    {isAr ? "الأكثر شعبية" : "Most Popular"}
                  </span>
                )}

                {/* Tier name */}
                <h3 className="text-lg font-semibold tracking-tight">
                  {isAr ? tier.nameAr : tier.nameEn}
                </h3>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    {displayPrice}
                  </span>
                  {tier.priceMonthly !== 0 && (
                    <span className={`text-sm font-normal ${tier.highlight ? "text-gray-400" : "text-[#6e6e73]"}`}>
                      /{isAr ? "شهر" : "mo"}
                    </span>
                  )}
                </div>
                {billing === "yearly" && tier.priceYearly && (
                  <p className={`mt-1 text-xs font-normal ${tier.highlight ? "text-gray-400" : "text-[#6e6e73]"}`}>
                    ${tier.priceYearly.toFixed(2)} {isAr ? "/ سنة" : "/ year"}
                  </p>
                )}

                {/* Features */}
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tier.highlight ? "text-[#0071e3]" : "text-[#34c759]"}`} />
                      <span className="text-sm font-normal">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={tier.id === "free" ? "/auth?mode=signup" : `/checkout?tier=${tier.id}&months=${billing === "yearly" ? 12 : 1}`}
                  className={`mt-6 w-full rounded-full px-6 py-3 text-center text-sm font-normal transition-opacity hover:opacity-90 ${
                    tier.highlight
                      ? "bg-white text-[#1d1d1f]"
                      : tier.id === "free"
                        ? "bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]"
                        : "bg-[#0071e3] text-white"
                  }`}
                >
                  {tier.id === "free"
                    ? isAr ? "ابدأ مجاناً" : "Get started free"
                    : isAr ? "اشترك الآن" : "Subscribe now"}
                </a>
              </div>
            );
          })}
        </div>

        {/* Coaching — separate section */}
        {coaching && (
          <div className="mt-12 rounded-3xl border border-[#d2d2d7] p-6 md:p-10">
            <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-xs font-medium text-[#8b5cf6]">
                    {isAr ? "منفصل" : "Separate"}
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {isAr ? coaching.nameAr : coaching.nameEn}
                  </h3>
                </div>
                <p className="mt-2 text-sm font-normal text-[#6e6e73]">
                  {isAr
                    ? "كوتشينج بشري مع مدربين وأخصائيين تغذية. منفصل تماماً عن العضويات."
                    : "Human coaching with real coaches and nutrition specialists. Completely separate from memberships."}
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {coaching.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8b5cf6]" />
                      <span className="text-sm font-normal">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 shrink-0 md:ms-8 md:mt-0">
                <a
                  href="/coaching"
                  className="inline-block rounded-full bg-[#8b5cf6] px-6 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90"
                >
                  {isAr ? "اعرف أكثر ›" : "Learn more ›"}
                </a>
                <a
                  href="/pricing"
                  className="mt-2 block text-center text-xs font-medium text-[#8b5cf6] hover:underline"
                >
                  {isAr ? "الأسعار ›" : "Pricing ›"}
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
                    <td className="p-4 text-start font-medium">{row.feature}</td>
                    <td className="p-4 text-center">
                      {row.free === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#34c759]" />
                      ) : row.free === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-normal text-[#6e6e73]">{row.free}</span>
                      )}
                    </td>
                    <td className="p-4 text-center bg-[#0071e3]/[0.03]">
                      {row.premium === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#34c759]" />
                      ) : row.premium === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-medium text-[#0071e3]">{row.premium}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.pro === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#34c759]" />
                      ) : row.pro === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-medium">{row.pro}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.coaching === "✓" ? (
                        <Check className="mx-auto h-4 w-4 text-[#8b5cf6]" />
                      ) : row.coaching === "—" ? (
                        <X className="mx-auto h-4 w-4 text-[#d2d2d7]" />
                      ) : (
                        <span className="text-xs font-medium text-[#8b5cf6]">{row.coaching}</span>
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
                q: isAr ? "هل الكوتشينج مشمول في Pro؟" : "Is coaching included in Pro?",
                a: isAr
                  ? "لا، الكوتشينج منفصل تماماً عن العضويات. Pro يعطيك صلاحيات المنصة، الكوتشينج مدرب بشري."
                  : "No, coaching is completely separate from memberships. Pro gives you platform features, coaching gives you a human coach.",
              },
              {
                q: isAr ? "إزاي تتحدد حدود EVO؟" : "How are EVO limits determined?",
                a: isAr
                  ? "حدود التوليد والتبديل بتتحسب شهرياً وبتعمل ريستيت أول كل شهر."
                  : "Generation and swap limits are counted monthly and reset on the 1st of each month.",
              },
              {
                q: isAr ? "هل فيه تجربة مجانية؟" : "Is there a free trial?",
                a: isAr ? "لا، مفيش تجربة مجانية. بس الـ Free tier مجاني للأبد." : "No free trial. But the Free tier is free forever.",
              },
              {
                q: isAr ? "طرق الدفع؟" : "Payment methods?",
                a: isAr ? "InstaPay و Vodafone Cash مع إيصال الدفع." : "InstaPay and Vodafone Cash with receipt upload.",
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
          <ShareButtons title={isAr ? "عضويات MuscleHub" : "MuscleHub Memberships"} />
        </div>
      </main>
    </div>
  );
}
