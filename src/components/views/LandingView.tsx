"use client";

import { useState } from "react";
import {
  Dumbbell,
  ArrowRight,
  LayoutDashboard,
  Check,
  Star,
  Heart,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Clock,
  Quote,
  Sparkles,
  Brain,
  Activity,
  LineChart,
  Salad,
  MessageCircle,
  Cpu,
  Eye,
  RefreshCw,
  Lock,
  Users,
  Award,
  ChevronDown,
  Bot,
  Wifi,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Premium images
const HERO_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6f2587b25688.jpeg";
const AI_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/28994da5426f.jpg";
const TRANSFORM_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d107f788f4a2.jpg";
const MEAL_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/75179d5df07d.jpg";

export function LandingView() {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach } = useAuth();
  const isLoggedIn = !!profile;
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===================== HEADER ===================== */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate("landing")} className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Muscle<span className="text-primary">Hub</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {isLoggedIn ? (
              <Button size="sm" className="gap-2" onClick={() => navigate(isCoach ? "coach" : "dashboard")}>
                <LayoutDashboard className="h-4 w-4" />
                {isCoach ? t("nav.clients") : t("nav.dashboard")}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("auth", { mode: "login" })}>
                  {isAr ? "تسجيل الدخول" : "Log in"}
                </Button>
                <Button size="sm" className="gap-2 shadow-glow" onClick={() => navigate("auth", { mode: "signup" })}>
                  {isAr ? "ابدأ مجاناً" : "Start Free"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===================== 1. HERO ===================== */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-32">
          {/* Text */}
          <div className="text-center md:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 animate-neon-flicker" />
              {isAr ? "منصة تحسين الأداء البشري بالذكاء الاصطناعي" : "AI-Powered Human Optimization Platform"}
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
              {isAr ? (
                <>
                  ابنِ نسخة
                  <br />
                  <span className="text-shimmer">أقوى منك</span>
                </>
              ) : (
                <>
                  Build a
                  <br />
                  <span className="text-shimmer">Stronger You</span>
                </>
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground md:mx-0">
              {isAr
                ? "ليست مجرد تطبيق لياقة. ليست مجرد دردشة ذكاء اصطناعي. MuscleHub هي النظام البيئي الذكي الذي يجمع بين خبرة الكوتش أحمد زكي ومحرك الذكاء الاصطناعي EVO لتحسين كل جانب من أدائك البشري."
                : "Not just a fitness app. Not just an AI chatbot. MuscleHub is the intelligent ecosystem that combines Coach Ahmed Zake's expertise with the EVO AI engine to optimize every aspect of your human performance."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Button size="lg" className="gap-2 shadow-glow text-base" onClick={() => navigate("auth", { mode: "signup" })}>
                {isAr ? "ابدأ تحوّلك" : "Start Your Transformation"}
                <ArrowRight className="h-5 w-5 rtl:rotate-180" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 border-primary/30 text-base" onClick={() => navigate("auth", { mode: "signup" })}>
                <Bot className="h-5 w-5 text-primary" />
                {isAr ? "تعرّف على EVO" : "Meet EVO"}
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground md:justify-start">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> {isAr ? "ابدأ خلال دقيقة" : "Start in a minute"}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> {isAr ? "خطط بالـ AI" : "AI-personalized"}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> {isAr ? "كوتش حقيقي" : "Real coach"}</span>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-primary opacity-20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 shadow-glow">
              <img
                src={HERO_IMG}
                alt={isAr ? "رياضي محترف في جيم بإضاءة درامية" : "Professional athlete in dramatic gym lighting"}
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              {/* EVO badge */}
              <div className="absolute end-4 top-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-background/60 px-4 py-2 backdrop-blur-xl">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-xs font-semibold text-foreground">EVO {isAr ? "يعمل الآن" : "Active"}</span>
              </div>
              {/* Stats overlay */}
              <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
                {[
                  { v: "+500", l: isAr ? "عميل" : "clients" },
                  { v: "95%", l: isAr ? "نجاح" : "success" },
                  { v: "24/7", l: isAr ? "تحليل" : "monitoring" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-primary/10 bg-background/60 p-3 text-center backdrop-blur-xl">
                    <div className="font-display text-lg font-bold text-primary">{s.v}</div>
                    <div className="text-[10px] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 2. TRUST SECTION ===================== */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Award, title: isAr ? "خبرة بشرية" : "Human Expertise", desc: isAr ? "+8 سنوات كوتشينج حقيقي" : "+8 years real coaching" },
              { icon: Brain, title: isAr ? "ذكاء اصطناعي" : "AI Intelligence", desc: isAr ? "محرك EVO يحلل بياناتك" : "EVO engine analyzes your data" },
              { icon: Activity, title: isAr ? "علم رياضي" : "Sports Science", desc: isAr ? "منهجية علمية مثبتة" : "Proven scientific methodology" },
              { icon: Shield, title: isAr ? "دعم مستمر" : "Continuous Support", desc: isAr ? "مراقبة 24/7 وإشعارات" : "24/7 monitoring + alerts" },
              { icon: TrendingUp, title: isAr ? "نتائج حقيقية" : "Real Results", desc: isAr ? "+500 قصة نجاح" : "+500 success stories" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 3. WHAT IS MUSCLEHUB ===================== */}
      <section className="relative overflow-hidden py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {isAr ? "ما هي MuscleHub؟" : "What is MuscleHub?"}
          </span>
          <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
            {isAr ? (
              <>
                ليست منصة لياقة.
                <br />
                <span className="text-gradient">بل نظام تحسين بشري كامل.</span>
              </>
            ) : (
              <>
                Not a fitness platform.
                <br />
                <span className="text-gradient">A complete human optimization system.</span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {isAr
              ? "MuscleHub تجمع بين خبرة الإنسان وعلم الرياضة والتغذية وعلم النفس السلوكي والذكاء الاصطناعي وتحليل البيانات والتعلم المستمر — في نظام بيئي ذكي واحد. الهدف ليس فقط تغيير جسمك، بل تحسين أدائك الكامل كإنسان."
              : "MuscleHub combines human expertise, sports science, nutrition science, behavioral psychology, artificial intelligence, data analysis, and continuous learning — in one intelligent ecosystem. The goal isn't just to change your body, but to optimize your entire human performance."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              isAr ? "خبرة بشرية" : "Human Experience",
              isAr ? "علم رياضي" : "Sports Science",
              isAr ? "علم تغذية" : "Nutrition Science",
              isAr ? "علم نفس سلوكي" : "Behavioral Psychology",
              isAr ? "ذكاء اصطناعي" : "Artificial Intelligence",
              isAr ? "تحليل بيانات" : "Data Analysis",
              isAr ? "تعلم مستمر" : "Continuous Learning",
            ].map((tag) => (
              <span key={tag} className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 4. HUMAN + AI (AHI) ===================== */}
      <section className="border-y border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Cpu className="h-3.5 w-3.5" />
              {isAr ? "الذكاء البشري الاصطناعي (AHI)" : "Artificial Human Intelligence (AHI)"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "المستقبل ليس إنسان ضد AI." : "The future isn't Human vs AI."}
              <br />
              <span className="text-shimmer">{isAr ? "المستقبل إنسان + AI." : "The future is Human + AI."}</span>
            </h2>
          </div>

          <div className="mt-16 grid items-center gap-8 md:grid-cols-3">
            {/* Ahmed Zake */}
            <div className="gradient-border rounded-[1.5rem] p-8 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Users className="h-8 w-8" />
              </span>
              <h3 className="mt-4 text-xl font-bold">Ahmed Zake</h3>
              <p className="text-sm text-primary">{isAr ? "الكوتش البشري" : "The Human Coach"}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "خبرة +8 سنوات" : "+8 years experience"}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "تعاطف وفهم" : "Empathy & understanding"}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "تفكير نقدي" : "Critical thinking"}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "إشراف شخصي" : "Personal supervision"}</li>
              </ul>
            </div>

            {/* Plus symbol */}
            <div className="flex flex-col items-center justify-center">
              <span className="font-display text-6xl font-bold text-primary">+</span>
              <p className="mt-2 text-xs text-muted-foreground">{isAr ? "يتجانسان معاً" : "synergize together"}</p>
            </div>

            {/* EVO */}
            <div className="gradient-border rounded-[1.5rem] p-8 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-gold text-gold-foreground shadow-gold">
                <Bot className="h-8 w-8" />
              </span>
              <h3 className="mt-4 text-xl font-bold">EVO</h3>
              <p className="text-sm text-gold">{isAr ? "محرك الأداء الذكي" : "AI Performance Engine"}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "ذكاء وتحليل" : "Intelligence & analysis"}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "تنبؤ واستباق" : "Prediction & prevention"}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "أتمتة وتحسين" : "Automation & optimization"}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {isAr ? "تعلم مستمر" : "Continuous learning"}</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 rounded-[1.5rem] border border-primary/20 bg-primary/5 p-8 text-center">
            <p className="text-lg font-medium text-foreground">
              {isAr
                ? "معاً، يخلقان تجربة كوتشينج لا مثيل لها — ذكاء الآلة بدقة الإنسان، وسرعة البيانات بحكمة الخبرة."
                : "Together, they create the ultimate coaching experience — machine intelligence with human precision, data speed with experiential wisdom."}
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 5. MEET EVO ===================== */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold text-gold">
              <Bot className="h-3.5 w-3.5" />
              {isAr ? "تعرّف على EVO" : "Meet EVO"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "EVO ليس شات بوت." : "EVO is not a chatbot."}
              <br />
              <span className="text-gradient">{isAr ? "بل محرك أداء ذكي." : "It's an intelligent performance engine."}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {isAr
                ? "EVO يعمل مع الكوتش، ليس بدلاً منه. يحلل، يتنبأ، يوصي، ويحدّث خططك تلقائياً — 24/7."
                : "EVO works with the coach, not instead of the coach. It analyzes, predicts, recommends, and updates your plans automatically — 24/7."}
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Activity, title: isAr ? "تحليل بيانات الجسم" : "Body Data Analysis", desc: isAr ? "يحلل وزنك، قياساتك، تقدمك الأسبوعي ويكتشف الأنماط." : "Analyzes your weight, measurements, weekly progress and detects patterns." },
              { icon: Brain, title: isAr ? "تحليل العادات" : "Habit Analysis", desc: isAr ? "يفهم عاداتك الغذائية والرياضية ويحدد نقاط الضعف." : "Understands your nutrition and training habits, identifies weak points." },
              { icon: Salad, title: isAr ? "تحليل التغذية" : "Nutrition Analysis", desc: isAr ? "يحسب السعرات والماكروز ويقترح تبديلات بنفس القيمة الغذائية." : "Calculates calories, macros and suggests equivalent food swaps." },
              { icon: Dumbbell, title: isAr ? "تحليل التمارين" : "Workout Analysis", desc: isAr ? "يقيس الحجم والشدة ويقترح بدائل مناسبة لمستواك." : "Measures volume and intensity, suggests alternatives for your level." },
              { icon: Eye, title: isAr ? "اكتشاف استباقي" : "Problem Detection", desc: isAr ? "يكتشف المشاكل قبل وقوعها — ثبات، إفراط، إصابات محتملة." : "Detects problems before they happen — plateaus, overtraining, injuries." },
              { icon: TrendingUp, title: isAr ? "تنبؤ بالثبات" : "Plateau Prediction", desc: isAr ? "يتنبأ بفترات الثبات ويعدّل خطتك قبل حدوثها." : "Predicts plateau phases and adjusts your plan before they happen." },
              { icon: Zap, title: isAr ? "توصيات ذكية" : "Smart Recommendations", desc: isAr ? "يقدم توصيات شخصية مبنية على بياناتك الفعلية." : "Delivers personalized recommendations based on your actual data." },
              { icon: RefreshCw, title: isAr ? "تحديث تلقائي" : "Auto-Update Plans", desc: isAr ? "يحدّث خططك تلقائياً حسب تقدمك وتغيرات جسمك." : "Automatically updates your plans based on progress and body changes." },
              { icon: Clock, title: isAr ? "مراقبة 24/7" : "24/7 Monitoring", desc: isAr ? "يراقب تقدمك باستمرار ويرسل إشعارات فورية." : "Continuously monitors your progress and sends instant alerts." },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-glow">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 6. WHY MUSCLEHUB ===================== */}
      <section className="border-y border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "ليه MuscleHub مش زي أي منصة تانية؟" : "Why MuscleHub is different?"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {isAr ? "مش بنبيعك ميزات — بنبيعك نتائج وتحوّل حقيقي." : "We don't sell features — we sell results and real transformation."}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              { icon: Users, title: isAr ? "كوتش حقيقي يتابعك" : "A real coach follows you", desc: isAr ? "مش AI بس. الكوتش أحمد زكي بيراجع استبياناتك، يوافق على خططك، ويرد على تذاكرك بنفسه." : "Not just AI. Coach Ahmed Zake reviews your questionnaires, approves your plans, and replies to your tickets personally." },
              { icon: Bot, title: isAr ? "AI بذاكرة عنك" : "AI with memory of you", desc: isAr ? "EVO بيتعلم من بياناتك ويبقى عنده مرجعية كاملة عنك. لما تسأله، بيرد بناءً على خطتك الفعلية." : "EVO learns from your data and has full reference of you. When you ask, it responds based on your actual plan." },
              { icon: RefreshCw, title: isAr ? "خطط تتكيف معك" : "Plans that adapt to you", desc: isAr ? "مش خطة ثابتة. خطتك تتغير تلقائياً حسب تقدمك، وزنك، التزامك، وتغييرات جسمك." : "Not a static plan. Your plan changes automatically based on progress, weight, adherence, and body changes." },
              { icon: Lock, title: isAr ? "بياناتك آمنة" : "Your data is secure", desc: isAr ? "كل بياناتك محفوظة بشكل مشفر على Supabase. مفيش حد بيشوفها غيرك وإنت والكوتش بس." : "All your data is encrypted on Supabase. No one sees it except you and your coach." },
              { icon: MessageCircle, title: isAr ? "تبديلات ذكية بالجرام" : "Smart swaps in grams", desc: isAr ? "لما تطلب تبديل وجبة، EVO بيحسب البديل بالجرامات والسعرات والماكروز بدقة." : "When you request a meal swap, EVO calculates the alternative in grams, calories, and macros precisely." },
              { icon: Award, title: isAr ? "نتائج موثقة" : "Proven results", desc: isAr ? "أكتر من 500 عميل غيّروا حياتهم. قصص نجاح حقيقية بأرقام وصور قبل وبعد." : "Over 500 clients transformed their lives. Real success stories with numbers and before/after photos." },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-background p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
                  <b.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 7. HOW IT WORKS ===================== */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-block rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              {isAr ? "إزاي تشتغل" : "How it works"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "رحلتك في 4 خطوات" : "Your journey in 4 steps"}
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: isAr ? "أنشئ حسابك" : "Create account", desc: isAr ? "في ثوانٍ. بالإيميل أو Google." : "In seconds. Email or Google." },
              { n: "02", title: isAr ? "أكمل الاستبيانات" : "Complete questionnaires", desc: isAr ? "أخبرنا عن هدفك، وزنك، عاداتك، إصاباتك." : "Tell us your goal, weight, habits, injuries." },
              { n: "03", title: isAr ? "EVO يحلل ويخطط" : "EVO analyzes & plans", desc: isAr ? "الكوتش + EVO يولّدون خططك ويوافقون عليها." : "Coach + EVO generate and approve your plans." },
              { n: "04", title: isAr ? "ابدأ التحوّل" : "Start transforming", desc: isAr ? "تتبع تقدمك، استبدل، واسأل EVO أي وقت." : "Track progress, swap, and ask EVO anytime." },
            ].map((s, i) => (
              <div key={i} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="font-display text-4xl font-bold text-primary/30">{s.n}</span>
                <h3 className="mt-2 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 8. PERSONALIZED COACHING ===================== */}
      <section className="border-y border-border/50 bg-card/30 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Target className="h-3.5 w-3.5" />
              {isAr ? "كوتشينج متكيف" : "Adaptive Coaching"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "خطط تتغير كأنها حية" : "Plans that evolve like they're alive"}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {isAr
                ? "خطتك ليست ملف PDF ثابت. إنها نظام حي يتكيف معك. كل أسبوع، EVO يحلل تقدمك ويعدّل السعرات، الماكروز، التمارين، والكثافة — تلقائياً. إذا توقفت، يعدّل. إذا تقدمت بسرعة، يزيد التحدي."
                : "Your plan isn't a static PDF. It's a living system that adapts to you. Every week, EVO analyzes your progress and adjusts calories, macros, exercises, and intensity — automatically. If you stall, it adjusts. If you progress fast, it increases the challenge."}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                isAr ? "تتبع أسبوعي للوزن والقياسات" : "Weekly weight & measurement tracking",
                isAr ? "رسوم بيانية واضحة لتقدمك" : "Clear progress charts",
                isAr ? "صور قبل وبعد موثقة" : "Documented before/after photos",
                isAr ? "تعديلات تلقائية حسب التقدم" : "Automatic adjustments based on progress",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[1.5rem] border border-border shadow-card">
              <img src={MEAL_IMG} alt={isAr ? "وجبة صحية متوازنة" : "Healthy balanced meal"} className="aspect-square w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
            </div>
            <div className="absolute end-4 top-4 rounded-2xl border border-primary/20 bg-background/80 p-3 backdrop-blur-xl">
              <div className="flex items-center gap-3 text-xs">
                <div><div className="font-bold text-success">P: 180g</div><div className="text-muted-foreground">{isAr ? "بروتين" : "Protein"}</div></div>
                <div><div className="font-bold text-warning">C: 200g</div><div className="text-muted-foreground">{isAr ? "كارب" : "Carbs"}</div></div>
                <div><div className="font-bold text-primary">F: 70g</div><div className="text-muted-foreground">{isAr ? "دهون" : "Fat"}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 9. AI INTELLIGENCE ===================== */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="overflow-hidden rounded-[1.5rem] border border-border shadow-card">
              <img src={AI_IMG} alt={isAr ? "شبكة عصبية ذكاء اصطناعي" : "AI neural network"} className="aspect-square w-full object-cover" loading="lazy" />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold text-gold">
              <Cpu className="h-3.5 w-3.5" />
              {isAr ? "ذكاء EVO" : "EVO Intelligence"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "ذكاء يفكر بدلاً عنك" : "Intelligence that thinks for you"}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {isAr
                ? "EVO لا ينتظر أن تسأل. يحلل بياناتك باستمرار، يكتشف الأنماط، يتنبأ بالمشاكل، ويوصي بالتحسينات — قبل أن تدرك أنك بحاجتها."
                : "EVO doesn't wait for you to ask. It continuously analyzes your data, detects patterns, predicts problems, and recommends improvements — before you realize you need them."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: isAr ? "ردود فورية" : "Instant responses" },
                { icon: Eye, label: isAr ? "كشف استباقي" : "Proactive detection" },
                { icon: TrendingUp, label: isAr ? "تنبؤ بالنتائج" : "Outcome prediction" },
                { icon: RefreshCw, label: isAr ? "تحديث تلقائي" : "Auto-updates" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 10. RESULTS ===================== */}
      <section className="relative overflow-hidden border-y border-border/50 py-24">
        <div className="absolute inset-0">
          <img src={TRANSFORM_IMG} alt={isAr ? "تحوّل لياقة" : "Fitness transformation"} className="h-full w-full object-cover opacity-20" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">
            {isAr ? "التحوّل مش مستحيل." : "Transformation isn't impossible."}
            <br />
            <span className="text-gradient">{isAr ? "محتاج نظام ذكي." : "It needs a smart system."}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {isAr
              ? "أكتر حاجة بتوقف الناس إنهم مش عارفين يبدأوا منين. احنا بنشيل عنك التفكير كله — تخطيط، متابعة، تعديل، تحفيز. إنت بس التزم وشف النتيجة."
              : "The biggest thing stopping people is not knowing where to start. We take away all the thinking — planning, tracking, adjusting, motivating. You just commit and see results."}
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { v: "+500", l: isAr ? "عميل نجح" : "clients succeeded" },
              { v: "95%", l: isAr ? "نسبة رضا" : "satisfaction rate" },
              { v: "-8.5kg", l: isAr ? "متوسط الفقد" : "avg. weight loss" },
              { v: "12wk", l: isAr ? "متوسط المدة" : "avg. duration" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
                <div className="font-display text-3xl font-bold text-primary">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 11. TESTIMONIALS ===================== */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-block rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              {isAr ? "قصص نجاح" : "Success Stories"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "عملاء حقيين، نتائج حقيقية" : "Real clients, real results"}
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { name: isAr ? "محمد العشري" : "Mohamed ElAshry", result: isAr ? "-12 كجم في 3 أشهر" : "-12kg in 3 months", text: isAr ? "أحسن كوتش جربته. EVO بيرد على أسئلتي في أي وقت وحسابات التبديلات مظبوطة 100%." : "Best coach I've tried. EVO answers my questions anytime and swap calculations are 100% accurate." },
              { name: isAr ? "سارة منصور" : "Sara Mansour", result: isAr ? "-2 مقاس في 4 أشهر" : "-2 sizes in 4 months", text: isAr ? "كنت حاسة إني ضايعه، بس أحمد فهم حالتي وعمللي خطة تناسبني. التتبع الأسبوعي خلاني ملتزمة." : "I felt lost, but Ahmed understood my situation and made a plan that fits me. Weekly tracking kept me committed." },
              { name: isAr ? "أحمد فؤاد" : "Ahmed Fouad", result: isAr ? "+6 كجم عضلات" : "+6kg muscle", text: isAr ? "برنامج التمارين احترافي جداً. كل تمرين متفسر بالعربي وفيه نصايح. التبديلات سريعة ومريحة في الجيم." : "The workout program is very professional. Every exercise explained in Arabic with tips. Swaps are quick at the gym." },
            ].map((tm, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-1 text-gold">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
                </div>
                <Quote className="mt-4 h-8 w-8 text-primary/20" />
                <p className="mt-2 text-sm leading-relaxed">{tm.text}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">{tm.name.charAt(0)}</span>
                  <div>
                    <p className="text-sm font-semibold">{tm.name}</p>
                    <p className="text-xs text-success">{tm.result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 12. PRICING PREVIEW ===================== */}
      <section className="border-y border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-block rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium text-gold">
              {isAr ? "الأسعار" : "Pricing"}
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "استثمر في نفسك" : "Invest in yourself"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {isAr ? "3 باقات تناسب كل هدف وميزانية. ابدأ من $20/شهر." : "3 plans for every goal and budget. Start from $20/month."}
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { name: "Starter", price: "$20", period: isAr ? "/شهر" : "/mo", features: [isAr ? "2 تبديل يومي" : "2 daily swaps", isAr ? "خطة تغذية + تمارين" : "Nutrition + workout plan", isAr ? "تتبع تقدم" : "Progress tracking"], highlight: false },
              { name: "Pro", price: "$35", period: isAr ? "/شهر" : "/mo", features: [isAr ? "5 تبديلات يومية" : "5 daily swaps", isAr ? "مساعد EVO الذكي" : "EVO AI coach", isAr ? "أولوية دعم" : "Priority support", isAr ? "تعديلات أسرع" : "Faster adjustments"], highlight: true },
              { name: "Elite", price: "$60", period: isAr ? "/شهر" : "/mo", features: [isAr ? "تبديلات غير محدودة" : "Unlimited swaps", isAr ? "كوتشينج VIP" : "VIP coaching", isAr ? "استجابة فورية" : "Instant response", isAr ? "أقصى مساءلة" : "Max accountability"], highlight: false },
            ].map((p, i) => (
              <div key={i} className={`relative rounded-[1.5rem] border p-6 ${p.highlight ? "border-primary/50 glass-gold animate-gold-pulse" : "border-border bg-card"}`}>
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    {isAr ? "الأكثر شيوعاً" : "MOST POPULAR"}
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                <div className="mt-4 flex items-end gap-1">
                  <span className="font-display text-4xl font-extrabold text-gradient">{p.price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">{p.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full gap-2" variant={p.highlight ? "default" : "secondary"} onClick={() => navigate("pricing")}>
                  {isAr ? "ابدأ الآن" : "Get Started"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="ghost" className="gap-2 text-primary" onClick={() => navigate("pricing")}>
              {isAr ? "شوف كل التفاصيل والأسعار" : "See all details & pricing"}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== 13. FAQ ===================== */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-block rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              FAQ
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {[
              { q: isAr ? "ما هو MuscleHub؟" : "What is MuscleHub?", a: isAr ? "MuscleHub هي منصة تحسين أداء بشري تجمع بين خبرة الكوتش أحمد زكي ومحرك الذكاء الاصطناعي EVO لتقديم خطط تغذية وتمارين مخصصة، تتبع تقدم ذكي، ومساعد ذكي بذاكرة عن بياناتك." : "MuscleHub is a human optimization platform combining Coach Ahmed Zake's expertise with the EVO AI engine to deliver personalized nutrition and workout plans, smart progress tracking, and an AI coach with memory of your data." },
              { q: isAr ? "من هو EVO؟" : "Who is EVO?", a: isAr ? "EVO هو محرك الأداء الذكي. ليس شات بوت عادي، بل نظام يحلل بياناتك، يتنبأ بالنتائج، يوصي بالتحسينات، ويحدّث خططك تلقائياً. يعمل مع الكوتش وليس بدلاً منه." : "EVO is the intelligent performance engine. Not a regular chatbot, it's a system that analyzes your data, predicts outcomes, recommends improvements, and updates your plans automatically. It works with the coach, not instead of the coach." },
              { q: isAr ? "هل الخطط مخصصة فعلاً لي؟" : "Are the plans truly personalized?", a: isAr ? "نعم. كل خطة تُبنى بناءً على استبياناتك (الوزن، الهدف، الحساسية، الإصابات، المعدات، الخبرة) ويتم تحديثها تلقائياً حسب تقدمك الأسبوعي." : "Yes. Every plan is built from your questionnaires (weight, goal, allergies, injuries, equipment, experience) and automatically updated based on your weekly progress." },
              { q: isAr ? "كم تبديل يومياً مسموح؟" : "How many daily swaps are allowed?", a: isAr ? "حسب باقتك: Starter = 2 تبديل وجبات + 2 تبديل تمارين يومياً. Pro = 5 + 5. Elite = غير محدود. التبديلات تتجدد كل يوم." : "Based on your plan: Starter = 2 meal + 2 exercise swaps daily. Pro = 5 + 5. Elite = unlimited. Swaps reset daily." },
              { q: isAr ? "هل الكوتش حقيقي أم AI فقط؟" : "Is the coach real or just AI?", a: isAr ? "الكوتش أحمد زكي حقيقي تماماً. يراجع استبياناتك، يوافق على خططك بنفسه، ويرد على تذاكر الدعم. EVO يساعده في التحليل والتوصيات لكن القرار النهائي للكوتش." : "Coach Ahmed Zake is 100% real. He reviews your questionnaires, approves your plans personally, and replies to support tickets. EVO assists with analysis and recommendations but the final decision is the coach's." },
              { q: isAr ? "ما طرق الدفع المتاحة؟" : "What payment methods are available?", a: isAr ? "InstaPay و Vodafone Cash حالياً. ترفع إيصال الدفع والكوتش يراجعه ويوافق عليه." : "InstaPay and Vodafone Cash currently. You upload a payment receipt and the coach reviews and approves it." },
              { q: isAr ? "هل يمكنني الإلغاء؟" : "Can I cancel?", a: isAr ? "نعم، يمكنك عدم التجديد في أي وقت. لا توجد عقود ملزمة." : "Yes, you can choose not to renew at any time. No binding contracts." },
              { q: isAr ? "هل بياناتي آمنة؟" : "Is my data secure?", a: isAr ? "نعم. جميع البيانات محفوظة بشكل مشفر على Supabase مع سياسات RLS. لا يمكن لأحد رؤية بياناتك سواك والكوتش." : "Yes. All data is encrypted on Supabase with RLS policies. No one can see your data except you and the coach." },
              { q: isAr ? "هل يدعم العربية؟" : "Does it support Arabic?", a: isAr ? "نعم، المنصة ثنائية اللغة (عربي/إنجليزي) بالكامل مع دعم RTL." : "Yes, the platform is fully bilingual (Arabic/English) with RTL support." },
              { q: isAr ? "هل يعمل على الموبايل؟" : "Does it work on mobile?", a: isAr ? "نعم، الموقع متجاوب بالكامل ويمكن تثبيته كتطبيق (PWA) على الموبايل." : "Yes, the site is fully responsive and can be installed as a PWA app on mobile." },
              { q: isAr ? "ما الفرق بين MuscleHub والتطبيقات الأخرى؟" : "How is MuscleHub different from other apps?", a: isAr ? "MuscleHub يجمع بين الكوتش البشري والذكاء الاصطناعي في نظام واحد. التطبيقات الأخرى تقدم إما AI فقط أو كوتش فقط. نحن نقدم الاثنين معاً (AHI)." : "MuscleHub combines human coaching and AI in one system. Other apps offer either AI only or coach only. We offer both together (AHI)." },
              { q: isAr ? "كم يستغرق رؤية نتائج؟" : "How long to see results?", a: isAr ? "مع الالتزام، تبدأ برؤية نتائج خلال 2-4 أسابيع. نتائج ملحوظة خلال 8-12 أسبوع." : "With commitment, you start seeing results in 2-4 weeks. Noticeable results in 8-12 weeks." },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-start text-base font-semibold hover:text-primary">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===================== 14. FINAL CTA ===================== */}
      <section className="relative overflow-hidden py-32">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-primary shadow-glow">
            <Dumbbell className="h-10 w-10 text-primary-foreground" />
          </span>
          <h2 className="mt-8 text-5xl font-extrabold leading-tight md:text-6xl">
            {isAr ? "جسمك الجديد" : "Your new body"}
            <br />
            <span className="text-shimmer">{isAr ? "بيستناك" : "is waiting"}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            {isAr
              ? "انضم لأكثر من 500 عميل غيّروا حياتهم. ابدأ اليوم بخطة مخصصة لك وحدك، مع كوتش حقيقي وذكاء اصطناعي يتابعك 24/7."
              : "Join 500+ clients who transformed their lives. Start today with a plan made just for you, with a real coach and AI monitoring you 24/7."}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2 shadow-glow text-lg" onClick={() => navigate("auth", { mode: "signup" })}>
              {isAr ? "ابدأ تحوّلي" : "Start My Transformation"}
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-primary/30 text-lg" onClick={() => navigate("pricing")}>
              {isAr ? "شوف الأسعار" : "View Pricing"}
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {isAr ? "ابدأ خلال دقيقة" : "Start in a minute"}</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> {isAr ? "بياناتك آمنة" : "Data is secure"}</span>
            <span className="flex items-center gap-1.5"><Wifi className="h-4 w-4" /> {isAr ? "EVO يعمل 24/7" : "EVO active 24/7"}</span>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
                  <Dumbbell className="h-5 w-5 text-primary-foreground" />
                </span>
                <span className="font-display text-lg font-bold">Muscle<span className="text-primary">Hub</span></span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                {isAr ? "منصة تحسين أداء بشري بالذكاء الاصطناعي. نجمع بين خبرة الكوتش أحمد زكي ومحرك EVO الذكي." : "AI-powered human optimization platform. Combining Coach Ahmed Zake's expertise with the EVO AI engine."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">{isAr ? "روابط" : "Links"}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("pricing")} className="hover:text-primary">{isAr ? "الأسعار" : "Pricing"}</button></li>
                <li><button onClick={() => navigate("blog")} className="hover:text-primary">{isAr ? "المدونة" : "Blog"}</button></li>
                <li><button onClick={() => navigate("auth", { mode: "signup" })} className="hover:text-primary">{isAr ? "تسجيل" : "Sign up"}</button></li>
                <li><button onClick={() => navigate("auth", { mode: "login" })} className="hover:text-primary">{isAr ? "دخول" : "Log in"}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">{isAr ? "تواصل" : "Contact"}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</li>
                <li className="flex items-center gap-2"><Heart className="h-4 w-4" /> Instagram</li>
                <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> {isAr ? "دعم 24/7" : "24/7 support"}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  );
}
