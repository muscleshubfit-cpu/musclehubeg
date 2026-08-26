"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  Brain,
  TrendingUp,
  RefreshCw,
  MessageCircle,
  Dumbbell,
  Apple,
  BarChart3,
  Sparkles,
  ArrowRight,
  Info,
  Zap,
  Clock,
  Shield,
} from "lucide-react";

export default function EvoPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const features = [
    {
      icon: Brain,
      titleAr: "تحليل ذكي للبيانات",
      titleEn: "Smart Data Analysis",
      descAr: "بياناتك الصحية، وزنك، تقدمك، عاداتك — EVO بيحللها كلها ويفهم نمط جسمك.",
      descEn: "Your health data, weight, progress, habits — EVO analyzes them all and understands your body pattern.",
      color: "#0071e3",
    },
    {
      icon: TrendingUp,
      titleAr: "تنبؤ بالنتائج",
      titleEn: "Outcome Prediction",
      descAr: "بناءً على بياناتك، EVO بيتنبأ بمتى هتوصل لهدفك ويقترح تعديلات تسرّع النتيجة.",
      descEn: "Based on your data, EVO predicts when you'll reach your goal and suggests adjustments to speed up results.",
      color: "#34c759",
    },
    {
      icon: RefreshCw,
      titleAr: "تحديث تلقائي للخطط",
      titleEn: "Automatic Plan Updates",
      descAr: "خطتك بتتحدث أسبوعياً تلقائياً بناءً على تقدمك — مش خططة ثابتة طول الشهر.",
      descEn: "Your plan updates weekly based on your progress — not a static plan for the whole month.",
      color: "#ff9500",
    },
    {
      icon: MessageCircle,
      titleAr: "استشارات فورية 24/7",
      titleEn: "Instant Consultations 24/7",
      descAr: "اسأل EVO أي سؤال عن التغذية، التمارين، المكملات، أو التحفيز — في أي وقت.",
      descEn: "Ask EVO any question about nutrition, exercises, supplements, or motivation — anytime.",
      color: "#8b5cf6",
    },
    {
      icon: Dumbbell,
      titleAr: "تبديل التمارين بذكاء",
      titleEn: "Smart Exercise Swaps",
      descAr: "مش عايز تمرين معين؟ EVO بيقترح بديل يناسب عضلاتك ومستواك ومعداتك.",
      descEn: "Don't want a specific exercise? EVO suggests alternatives matching your muscles, level, and equipment.",
      color: "#ff3b30",
    },
    {
      icon: Apple,
      titleAr: "تبديل الوجبات بذكاء",
      titleEn: "Smart Meal Swaps",
      descAr: "مش بتحب أكلة؟ EVO بيقترح بديل بنفس الماكروز والسعرات بالظبط.",
      descEn: "Don't like a meal? EVO suggests alternatives with the exact same macros and calories.",
      color: "#34c759",
    },
    {
      icon: BarChart3,
      titleAr: "تتبع وتحليل الأنماط",
      titleEn: "Pattern Tracking & Analysis",
      descAr: "EVO بيلاحظ الأنماط: إمتى بتتمرن أفضل، إيه اللي بيخليك تلتزم أو تفشل.",
      descEn: "EVO notices patterns: when you train best, what makes you stick or fail.",
      color: "#0071e3",
    },
    {
      icon: Sparkles,
      titleAr: "متاح للجميع",
      titleEn: "Available to Everyone",
      descAr: "EVO متاح لكل الزوار والمشتركين — الزوار بـ limits، المشتركين بكل الميزات.",
      descEn: "EVO is available to all visitors and subscribers — visitors with limits, subscribers with full features.",
      color: "#ff9500",
    },
  ];

  const differences = [
    {
      chatbotAr: "بيرد بأسئلة عامة",
      chatbotEn: "Replies with generic answers",
      evoAr: "بيرد بناءً على بياناتك أنت",
      evoEn: "Replies based on YOUR data",
    },
    {
      chatbotAr: "مفيش ذاكرة لجسمك",
      chatbotEn: "No memory of your body",
      evoAr: "بيتذكر وزنك، هدفك، تقدمك",
      evoEn: "Remembers your weight, goal, progress",
    },
    {
      chatbotAr: "مش بيتدخل في خطتك",
      chatbotEn: "Doesn't interact with your plan",
      evoAr: "بيحدّث خطتك تلقائياً",
      evoEn: "Updates your plan automatically",
    },
    {
      chatbotAr: "مفيش تحليل للأنماط",
      chatbotEn: "No pattern analysis",
      evoAr: "بيحلل أنماط التزامك ونتائجك",
      evoEn: "Analyzes your consistency and results patterns",
    },
    {
      chatbotAr: "متاح للمشتركين بس عادةً",
      chatbotEn: "Usually for subscribers only",
      evoAr: "متاح للجميع بـ limits مختلفة",
      evoEn: "Available to everyone with different limits",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0071e3] to-[#8b5cf6]">
            <img
              src="/images/evo-standalone.jpg"
              alt="EVO"
              className="h-20 w-20 rounded-2xl object-cover"
            />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            EVO
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg font-normal text-[#6e6e73] md:text-xl">
            {isAr
              ? "محرك أداء ذكي — مش مجرد شات بوت."
              : "An intelligent performance engine — not just a chatbot."}
          </p>

          {/* Two CTAs — visually different */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {/* Start Conversation — with EVO profile image */}
            <a
              href="/chat"
              className="group inline-flex items-center gap-3 rounded-full bg-[#0071e3] px-6 py-3 text-base font-medium text-white transition-opacity hover:opacity-90"
            >
              <img
                src="/images/evo-standalone.jpg"
                alt="EVO"
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30"
              />
              <span>{isAr ? "ابدأ المحادثة مع EVO" : "Start chatting with EVO"}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>

            {/* Learn More — different visual style (outline) */}
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-base font-normal text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              <Info className="h-4 w-4" />
              <span>{isAr ? "اعرف أكثر عن EVO" : "Learn more about EVO"}</span>
            </a>
          </div>
        </section>

        {/* What is EVO? */}
        <section className="mt-16 rounded-3xl bg-[#f5f5f7] p-6 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "إيه هو EVO؟" : "What is EVO?"}
          </h2>
          <p className="mt-4 text-base font-normal leading-relaxed text-[#6e6e73] md:text-lg">
            {isAr
              ? "EVO هو محرك أداء ذكي مبني على الذكاء الاصطناعي، مصمم خصيصاً عشان يساعدك توصل لأهدافك الرياضية والتغذوية بشكل أسرع وأذكى. مش مجرد شات بوت بيرد على أسئلتك — EVO بيحلل بياناتك، يفهم جسمك، ويتعلم من تقدمك عشان يديك نصائح مخصصة ليك أنت بس."
              : "EVO is an AI-powered performance engine designed specifically to help you reach your fitness and nutrition goals faster and smarter. Not just a chatbot that answers your questions — EVO analyzes your data, understands your body, and learns from your progress to give you personalized advice."}
          </p>
          <p className="mt-3 text-base font-normal leading-relaxed text-[#6e6e73] md:text-lg">
            {isAr
              ? "بيدمج معرفة المدربين البشريين مع سرعة ودقة الذكاء الاصطناعي في نظام واحد متكامل."
              : "It combines human coach expertise with AI speed and precision in one integrated system."}
          </p>
        </section>

        {/* EVO vs Chatbot — the key difference */}
        <section id="features" className="mt-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "إيه الفرق بين EVO والشات بوت العادي؟" : "What's the difference between EVO and a regular chatbot?"}
          </h2>
          <div className="mt-8 overflow-hidden rounded-3xl border border-[#d2d2d7]">
            <div className="grid grid-cols-3 bg-[#f5f5f7]">
              <div className="p-4 text-center text-xs font-medium text-[#6e6e73]">
                {isAr ? "المقارنة" : "Comparison"}
              </div>
              <div className="border-s border-[#d2d2d7] p-4 text-center text-xs font-medium text-[#ff3b30]">
                {isAr ? "شات بوت عادي" : "Regular Chatbot"}
              </div>
              <div className="border-s border-[#d2d2d7] p-4 text-center text-xs font-medium text-[#0071e3]">
                EVO
              </div>
            </div>
            {differences.map((diff, i) => (
              <div key={i} className="grid grid-cols-3 border-t border-[#d2d2d7]/60">
                <div className="p-4 text-sm font-medium text-[#1d1d1f]">
                  {i + 1}
                </div>
                <div className="border-s border-[#d2d2d7] p-4 text-sm font-normal text-[#6e6e73]">
                  <span className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff3b30]" />
                    <span>{isAr ? diff.chatbotAr : diff.chatbotEn}</span>
                  </span>
                </div>
                <div className="border-s border-[#d2d2d7] bg-[#0071e3]/[0.03] p-4 text-sm font-normal text-[#1d1d1f]">
                  <span className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0071e3]" />
                    <span>{isAr ? diff.evoAr : diff.evoEn}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "إيه اللي EVO بيعمله؟" : "What can EVO do?"}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="rounded-3xl bg-[#f5f5f7] p-6 transition-colors hover:bg-[#efefef]"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                      style={{ backgroundColor: `${feature.color}15` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: feature.color }} />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight">
                        {isAr ? feature.titleAr : feature.titleEn}
                      </h3>
                      <p className="mt-1 text-sm font-normal leading-relaxed text-[#6e6e73]">
                        {isAr ? feature.descAr : feature.descEn}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How EVO works */}
        <section className="mt-16 rounded-3xl bg-[#f5f5f7] p-6 text-[#1d1d1f] md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "إزاي EVO بيشتغل؟" : "How does EVO work?"}
          </h2>
          <div className="mt-6 space-y-6">
            {[
              {
                num: "01",
                titleAr: "بيجمع بياناتك",
                titleEn: "Collects your data",
                descAr: "EVO بيقرأ استبياناتك، وزنك، قياساتك، خططك، وتقدمك.",
                descEn: "EVO reads your questionnaires, weight, measurements, plans, and progress.",
              },
              {
                num: "02",
                titleAr: "بيحلل الأنماط",
                titleEn: "Analyzes patterns",
                descAr: "بيلاحظ إيه اللي شغال معاك وإيه اللي مش شغال، وبيفهم جسمك.",
                descEn: "Notices what works for you and what doesn't, understanding your body.",
              },
              {
                num: "03",
                titleAr: "بيتنبأ بالنتائج",
                titleEn: "Predicts outcomes",
                descAr: "بيقولك متى هتوصل لهدفك وإيه التعديلات اللي هتسرّع النتيجة.",
                descEn: "Tells you when you'll reach your goal and what adjustments will speed up results.",
              },
              {
                num: "04",
                titleAr: "بيحدّث خطتك",
                titleEn: "Updates your plan",
                descAr: "أسبوعياً بيكيف خطتك بناءً على تقدمك الفعلي، مش افتراضيات.",
                descEn: "Weekly adapts your plan based on your actual progress, not assumptions.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-base font-semibold">
                    {isAr ? step.titleAr : step.titleEn}
                  </h3>
                  <p className="mt-1 text-sm font-normal text-[#6e6e73]">
                    {isAr ? step.descAr : step.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust badges */}
        <section className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Zap, labelAr: "فوري", labelEn: "Instant", descAr: "ردود في ثواني", descEn: "Replies in seconds" },
            { icon: Clock, labelAr: "24/7", labelEn: "24/7", descAr: "متاح كل وقت", descEn: "Always available" },
            { icon: Shield, labelAr: "آمن", labelEn: "Secure", descAr: "بياناتك مشفرة", descEn: "Your data is encrypted" },
            { icon: Sparkles, labelAr: "متاح", labelEn: "Available", descAr: "للجميع", descEn: "For everyone" },
          ].map((badge, i) => {
            const Icon = badge.icon;
            return (
              <div key={i} className="rounded-2xl bg-[#f5f5f7] p-4 text-center">
                <Icon className="mx-auto h-6 w-6 text-[#0071e3]" />
                <p className="mt-2 text-sm font-semibold">
                  {isAr ? badge.labelAr : badge.labelEn}
                </p>
                <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                  {isAr ? badge.descAr : badge.descEn}
                </p>
              </div>
            );
          })}
        </section>

        {/* Free vs Subscriber comparison */}
        <section className="mt-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "EVO للزوار vs EVO للمشتركين" : "EVO for Visitors vs Subscribers"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "EVO متاح للجميع، بس المشتركين بياخدو ميزات أكتر وأعمق."
              : "EVO is available to everyone, but subscribers get deeper features."}
          </p>

          <div className="mt-8 overflow-hidden rounded-3xl border border-[#d2d2d7]">
            <div className="grid grid-cols-3 bg-[#f5f5f7]">
              <div className="p-4 text-center text-xs font-medium text-[#6e6e73]">
                {isAr ? "الميزة" : "Feature"}
              </div>
              <div className="border-s border-[#d2d2d7] p-4 text-center text-xs font-medium text-[#6e6e73]">
                {isAr ? "زائر (مجاني)" : "Visitor (Free)"}
              </div>
              <div className="border-s border-[#d2d2d7] p-4 text-center text-xs font-medium text-[#0071e3]">
                {isAr ? "مشترك" : "Subscriber"}
              </div>
            </div>
            {[
              {
                featAr: "المحادثة الأساسية",
                featEn: "Basic chat",
                freeAr: "✓ 10 رسائل/يوم",
                freeEn: "✓ 10 msgs/day",
                subAr: "✓ غير محدود",
                subEn: "✓ Unlimited",
              },
              {
                featAr: "التوجيه لصفحات المنصة",
                featEn: "Platform page guidance",
                freeAr: "✓",
                freeEn: "✓",
                subAr: "✓",
                subEn: "✓",
              },
              {
                featAr: "الإجابة من مقالات المدونة",
                featEn: "Blog article answers",
                freeAr: "✓ ملخص",
                freeEn: "✓ Summary",
                subAr: "✓ ملخص كامل + روابط",
                subEn: "✓ Full summary + links",
              },
              {
                featAr: "حفظ بيانات الجسم",
                featEn: "Save body data",
                freeAr: "✗ (session بس)",
                freeEn: "✗ (session only)",
                subAr: "✓ دائم",
                subEn: "✓ Permanent",
              },
              {
                featAr: "تحديث الخطة تلقائياً",
                featEn: "Automatic plan updates",
                freeAr: "✗",
                freeEn: "✗",
                subAr: "✓",
                subEn: "✓",
              },
              {
                featAr: "تبديل الوجبات/التمارين",
                featEn: "Meal/exercise swaps",
                freeAr: "✗ (نصائح عامة)",
                freeEn: "✗ (general tips)",
                subAr: "✓ (داخل خطتك)",
                subEn: "✓ (in your plan)",
              },
              {
                featAr: "التنبؤ بالنتائج",
                featEn: "Outcome prediction",
                freeAr: "✗",
                freeEn: "✗",
                subAr: "✓",
                subEn: "✓",
              },
              {
                featAr: "تحليل الأنماط",
                featEn: "Pattern analysis",
                freeAr: "✗",
                freeEn: "✗",
                subAr: "✓",
                subEn: "✓",
              },
              {
                featAr: "الذاكرة عبر الجلسات",
                featEn: "Cross-session memory",
                freeAr: "✗",
                freeEn: "✗",
                subAr: "✓",
                subEn: "✓",
              },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-t border-[#d2d2d7]/60">
                <div className="p-3 text-xs font-medium text-[#1d1d1f]">
                  {isAr ? row.featAr : row.featEn}
                </div>
                <div className="border-s border-[#d2d2d7] p-3 text-xs font-normal text-[#6e6e73]">
                  {isAr ? row.freeAr : row.freeEn}
                </div>
                <div className="border-s border-[#d2d2d7] bg-[#0071e3]/[0.03] p-3 text-xs font-medium text-[#1d1d1f]">
                  {isAr ? row.subAr : row.subEn}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* One subscription for everything */}
        <section className="mt-12 rounded-3xl bg-gradient-to-br from-[#1d1d1f] to-[#0071e3] p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "اشتراك واحد. كل الخدمات." : "One subscription. Everything."}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base font-medium text-white/80">
            {isAr
              ? "اشتراك الكوتشينج بيشمل: EVO بكل ميزاته + خطط تغذية مخصصة + برامج تمارين + متابعة شخصية + كل أدوات المنصة. مفيش زيادة في السعر."
              : "Coaching subscription includes: EVO with full features + personalized nutrition plans + workout programs + personal follow-up + all platform tools. No extra cost."}
          </p>
          <a
            href="/memberships"
            className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-base font-normal text-[#0071e3] transition-opacity hover:opacity-90"
          >
            {isAr ? "شوف الباقات ›" : "See plans ›"}
          </a>
        </section>

        {/* Final CTA — two buttons again */}
        <section className="mt-12 rounded-3xl bg-gradient-to-br from-[#0071e3] to-[#8b5cf6] p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "جاهز تجرب EVO؟" : "Ready to try EVO?"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base font-medium text-white/80">
            {isAr
              ? "ابدأ المحادثة دلوقتي — بدون تسجيل. لو عايز كل الميزات، اشترك في الكوتشينج."
              : "Start chatting now — no signup. For full features, subscribe to coaching."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/chat"
              className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-base font-normal text-[#0071e3] transition-opacity hover:opacity-90"
            >
              <img
                src="/images/evo-standalone.jpg"
                alt="EVO"
                className="h-8 w-8 rounded-full object-cover ring-2 ring-[#0071e3]/20"
              />
              <span>{isAr ? "ابدأ المحادثة" : "Start chatting"}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
            <a
              href="/coaching"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              <span>{isAr ? "اعرف عن الكوتشينج" : "Learn about coaching"}</span>
            </a>
          </div>
        </section>

        {/* Share buttons */}
        <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4">
          <p className="text-sm font-medium text-[#1d1d1f]">
            {isAr ? "شارك صفحة EVO" : "Share EVO page"}
          </p>
          <ShareButtons
            title={isAr ? "EVO — كوتش ذكاء اصطناعي | MuscleHubEG" : "EVO — AI Coach | MuscleHubEG"}
            text={isAr ? "محرك أداء ذكي مش مجرد شات بوت — متاح للجميع" : "An intelligent performance engine, not just a chatbot — available to everyone"}
          />
        </div>
      </main>
    </div>
  );
}
