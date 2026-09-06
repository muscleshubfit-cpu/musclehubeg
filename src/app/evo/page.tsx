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
import Image from "next/image";
import { ThemeImg } from "@/components/ThemeImg";
import { openEvoFloatingChat } from "@/lib/evo-chat-context";

export default function EvoPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const features = [
    {
      icon: Brain,
      titleAr: "رد مبني على قياساتك",
      titleEn: "Answers Based On Your Measurements",
      descAr: "الاشتراك المدفوع يخلي EVO ياخد في الحسبان قياساتك الأخيرة (الوزن والدهون وغيرها) في ردوده عليك.",
      descEn: "With an active subscription EVO factors in your latest measurements (weight, body fat, etc.) when answering.",
      color: "#0071e3",
    },
    {
      icon: TrendingUp,
      titleAr: "خطط محفوظة في حسابك",
      titleEn: "Plans Saved To Your Account",
      descAr: "الخطة اللي EVO يبنيها لك تقدر تحفظها في حسابك كخطة كاملة في لوحة خططك — مش نص في محادثة بس.",
      descEn: "Plans EVO builds for you can be saved to your account as full plans in your plans dashboard — not just chat text.",
      color: "#34c759",
    },
    {
      icon: RefreshCw,
      titleAr: "استبدالات ذكية بعداد",
      titleEn: "Smart Swaps With A Counter",
      descAr: "بدّل أي وجبة أو تمرين بضغطة، مع عداد واضح يوضح رصيدك الأسبوعي — والنتيجة بتتحفظ في خطتك.",
      descEn: "Swap any meal or exercise in one tap, with a clear weekly counter — and the result is saved into your plan.",
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
      titleAr: "تتبع تقدمك",
      titleEn: "Progress Tracking",
      descAr: "EVO بيقرأ وزنك وقياساتك وتقدمك، ويستخدمها في بناء خططك.",
      descEn: "EVO reads your weight, measurements, and progress, and uses them to build your plans.",
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
      evoAr: "يقدر يحفظ خطتك في لوحة خططك",
      evoEn: "Can save your plan to your plans dashboard",
    },
    {
      chatbotAr: "مفيش تحليل للأنماط",
      chatbotEn: "No pattern analysis",
      evoAr: "بياخد قياساتك الأخيرة في الحساب",
      evoEn: "Factors in your latest measurements",
    },
    {
      chatbotAr: "متاح للمشتركين بس عادةً",
      chatbotEn: "Usually for subscribers only",
      evoAr: "متاح للجميع بـ limits مختلفة",
      evoEn: "Available to everyone with different limits",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Hero */}
        <section className="text-center">
          <div className="marble-card mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <ThemeImg
              light="/images/brand/evo-widget-light.webp"
              dark="/images/brand/evo-widget-dark.webp"
              alt="EVO"
              width={80}
              height={80}
              className="h-20 w-20 rounded-2xl object-cover"
            />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            EVO
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg font-normal text-[var(--muted-foreground)] md:text-xl">
            {isAr
              ? "محرك أداء ذكي — مش مجرد شات بوت."
              : "An intelligent performance engine — not just a chatbot."}
          </p>

          {/* Two CTAs — visually different */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {/* Start Conversation — opens the floating EVO chat drawer
                (EVO CHAT SURFACE LAW 2026-08-27: the widget is the only
                chat surface — this used to link to the removed /chat) */}
            <button
              type="button"
              onClick={openEvoFloatingChat}
              className="btn-chrome group inline-flex cursor-pointer items-center gap-3 px-6 py-3 text-base"
            >
              <ThemeImg
                light="/images/brand/evo-widget-light.webp"
                dark="/images/brand/evo-widget-dark.webp"
                alt="EVO"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span>{isAr ? "ابدأ المحادثة مع EVO" : "Start chatting with EVO"}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>

            {/* Learn More — different visual style (outline) */}
            <a
              href="#features"
              className="btn-outline px-6 py-3 text-base font-normal"
            >
              <Info className="h-4 w-4" />
              <span>{isAr ? "اعرف أكثر عن EVO" : "Learn more about EVO"}</span>
            </a>
          </div>

          {/* Owner's EVO warrior artwork (transparent cutout — white page bg
              keeps the cutout edges invisible) */}
          <div className="relative mx-auto mt-10 max-h-[520px] w-fit">
            <Image
              src="/images/brand/evo-character.webp"
              alt={isAr ? "محارب EVO بالدرع السبارتي — المساعد الذكي من Alkemos" : "EVO warrior in Spartan armor — Alkemos smart assistant"}
              width={874}
              height={1000}
              sizes="(max-width: 768px) 90vw, 480px"
              className="mx-auto h-auto max-h-[520px] w-auto object-contain"
              priority
            />
          </div>
        </section>

        {/* What is EVO? — marble-card (identity) */}
        <section className="marble-card mt-16 p-6 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "إيه هو EVO؟" : "What is EVO?"}
          </h2>
          <p className="mt-4 text-base font-normal leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            {isAr
              ? "EVO هو محرك أداء ذكي مبني على الذكاء الاصطناعي، مصمم خصيصاً عشان يساعدك توصل لأهدافك الرياضية والتغذوية بشكل أسرع وأذكى. مش مجرد شات بوت بيرد على أسئلتك — EVO بيحلل بياناتك، يفهم جسمك، ويتعلم من تقدمك عشان يديك نصائح مخصصة ليك أنت بس."
              : "EVO is an AI-powered performance engine designed specifically to help you reach your fitness and nutrition goals faster and smarter. Not just a chatbot that answers your questions — EVO analyzes your data, understands your body, and learns from your progress to give you personalized advice."}
          </p>
          <p className="mt-3 text-base font-normal leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            {isAr
              ? "بيدمج معرفة المدربين البشريين مع سرعة ودقة الذكاء الاصطناعي في نظام واحد متكامل."
              : "It combines human coach expertise with AI speed and precision in one integrated system."}
          </p>
        </section>

        {/* EVO vs Chatbot — the key difference (identity: EVO column gets
            the tint + chrome inline treatment like the Alkemos column in
            the homepage comparison table) */}
        <section id="features" className="mt-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "إيه الفرق بين EVO والشات بوت العادي؟" : "What's the difference between EVO and a regular chatbot?"}
          </h2>
          <div className="marble-card mt-8 overflow-hidden">
            <div className="grid grid-cols-3 bg-[var(--tint)]">
              <div className="p-4 text-center text-xs font-medium text-[var(--muted-foreground)]">
                {isAr ? "المقارنة" : "Comparison"}
              </div>
              <div className="border-s border-[var(--edge)] p-4 text-center text-xs font-medium text-[var(--muted-foreground)]">
                {isAr ? "شات بوت عادي" : "Regular Chatbot"}
              </div>
              <div className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
                EVO
              </div>
            </div>
            {differences.map((diff, i) => (
              <div key={i} className="grid grid-cols-3 border-t border-[var(--edge)]">
                <div className="p-4 text-sm font-medium text-[var(--text)]">
                  {i + 1}
                </div>
                <div className="border-s border-[var(--edge)] p-4 text-sm font-normal text-[var(--muted-foreground)]">
                  <span className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted-foreground)] opacity-60" />
                    <span>{isAr ? diff.chatbotAr : diff.chatbotEn}</span>
                  </span>
                </div>
                <div className="bg-[var(--tint)] p-4 text-sm font-normal text-[var(--text)]" style={{ borderInline: "var(--border-chrome)" }}>
                  <span className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#878E94" }} />
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
                  className="marble-card p-6 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--edge)] bg-[var(--tint)]">
                      <Icon className="h-6 w-6 text-[var(--muted-2)]" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight">
                        {isAr ? feature.titleAr : feature.titleEn}
                      </h3>
                      <p className="mt-1 text-sm font-normal leading-relaxed text-[var(--muted-foreground)]">
                        {isAr ? feature.descAr : feature.descEn}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How EVO works — marble-card (identity) */}
        <section className="marble-card mt-16 p-6 text-[var(--text)] md:p-10">
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
                titleAr: "بيفهم هدفك",
                titleEn: "Understands your goal",
                descAr: "بيقرأ استبياناتك وهدفك ومستواك قبل ما يبني أي خطة.",
                descEn: "Reads your questionnaires, goal, and level before building any plan.",
              },
              {
                num: "03",
                titleAr: "يبني خطتك",
                titleEn: "Builds your plan",
                descAr: "خطط تغذية وتمارين مخصصة بناءً على بياناتك، جوه حدود عضويتك.",
                descEn: "Personalized nutrition and workout plans based on your data, within your membership limits.",
              },
              {
                num: "04",
                titleAr: "بيقترح التعديلات",
                titleEn: "Suggests adjustments",
                descAr: "لما تحتاج، EVO بيقترح تبديلات ذكية للوجبات والتمارين على طول.",
                descEn: "Whenever you need, EVO suggests smart meal and exercise swaps on the spot.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--edge)] bg-[var(--tint)] text-sm font-semibold text-[var(--text)]">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-base font-semibold">
                    {isAr ? step.titleAr : step.titleEn}
                  </h3>
                  <p className="mt-1 text-sm font-normal text-[var(--muted-foreground)]">
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
              <div key={i} className="marble-card p-4 text-center">
                <Icon className="mx-auto h-6 w-6 text-[var(--muted-2)]" />
                <p className="mt-2 text-sm font-semibold">
                  {isAr ? badge.labelAr : badge.labelEn}
                </p>
                <p className="mt-0.5 text-xs font-normal text-[var(--muted-foreground)]">
                  {isAr ? badge.descAr : badge.descEn}
                </p>
              </div>
            );
          })}
        </section>

        {/* Free vs Subscriber comparison — EVO/Subscriber column gets the
            identity tint + chrome treatment */}
        <section className="mt-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "EVO للزوار vs EVO للمشتركين" : "EVO for Visitors vs Subscribers"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm font-normal text-[var(--muted-foreground)]">
            {isAr
              ? "EVO متاح للجميع، بس المشتركين بياخدو ميزات أكتر وأعمق."
              : "EVO is available to everyone, but subscribers get deeper features."}
          </p>

          <div className="marble-card mt-8 overflow-hidden">
            <div className="grid grid-cols-3 bg-[var(--tint)]">
              <div className="p-4 text-center text-xs font-medium text-[var(--muted-foreground)]">
                {isAr ? "الميزة" : "Feature"}
              </div>
              <div className="border-s border-[var(--edge)] p-4 text-center text-xs font-medium text-[var(--muted-foreground)]">
                {isAr ? "زائر (مجاني)" : "Visitor (Free)"}
              </div>
              <div className="p-4 text-center text-xs font-semibold text-[var(--text)]">
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
                featAr: "حفظ الخطط في حسابك",
                featEn: "Save plans to your account",
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
                featAr: "رد مبني على قياساتك",
                featEn: "Answers based on your measurements",
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
              <div key={i} className="grid grid-cols-3 border-t border-[var(--edge)]">
                <div className="p-3 text-xs font-medium text-[var(--text)]">
                  {isAr ? row.featAr : row.featEn}
                </div>
                <div className="border-s border-[var(--edge)] p-3 text-xs font-normal text-[var(--muted-foreground)]">
                  {isAr ? row.freeAr : row.freeEn}
                </div>
                <div className="bg-[var(--tint)] p-3 text-xs font-medium text-[var(--text)]" style={{ borderInline: "var(--border-chrome)" }}>
                  {isAr ? row.subAr : row.subEn}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* One subscription for everything — dark marble band with a chrome
            ring (identity premium treatment; replaces the old
            black-to-blue gradient — zero-blue law) */}
        <section className="mt-12 rounded-[var(--radius-chrome)] bg-black p-8 text-center text-white md:p-12" style={{ boxShadow: "0 0 0 2px #C9CED3, var(--shadow)" }}>
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
            className="btn-chrome mt-6 inline-block px-6 py-3 text-base"
          >
            {isAr ? "شوف الباقات ›" : "See plans ›"}
          </a>
        </section>

        {/* Final CTA — two buttons again. Dark marble band in BOTH themes
            (identity premium treatment), so the text is pinned to the
            light-on-dark pair instead of var(--text) (which would render
            black-on-black in light mode). */}
        <section className="marble-card mt-12 p-8 text-center text-[#F5F5F7] md:p-12" style={{ backgroundColor: "#0B0B0D" }}>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "جاهز تجرب EVO؟" : "Ready to try EVO?"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base font-medium text-[#9BA0A6]">
            {isAr
              ? "ابدأ المحادثة دلوقتي — بدون تسجيل. لو عايز كل الميزات، اشترك في الكوتشينج."
              : "Start chatting now — no signup. For full features, subscribe to coaching."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={openEvoFloatingChat}
              className="btn-chrome inline-flex cursor-pointer items-center gap-3 px-6 py-3 text-base"
            >
              <ThemeImg
                light="/images/brand/evo-widget-light.webp"
                dark="/images/brand/evo-widget-dark.webp"
                alt="EVO"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span>{isAr ? "ابدأ المحادثة" : "Start chatting"}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            <a
              href="/coaching"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              <span>{isAr ? "اعرف عن الكوتشينج" : "Learn about coaching"}</span>
            </a>
          </div>
        </section>

        {/* Share buttons */}
        <div className="marble-card mt-8 flex items-center justify-between gap-4 p-4">
          <p className="text-sm font-medium text-[var(--text)]">
            {isAr ? "شارك صفحة EVO" : "Share EVO page"}
          </p>
          <ShareButtons
            title={isAr ? "EVO — كوتش ذكاء اصطناعي | Alkemos" : "EVO — AI Coach | Alkemos"}
            text={isAr ? "محرك أداء ذكي مش مجرد شات بوت — متاح للجميع" : "An intelligent performance engine, not just a chatbot — available to everyone"}
          />
        </div>
      </main>
    </div>
  );
}
