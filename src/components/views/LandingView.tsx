"use client";

import {
  Dumbbell,
  Salad,
  LineChart,
  Camera,
  Activity,
  MessageCircle,
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
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";

// Professional images (ZAI image search — OSS-hosted, stable URLs)
const HERO_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/24227317e4cb.jpg";
const MEAL_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/75179d5df07d.jpg";
const PROGRESS_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/ab2024f63a1a.png";
const TRANSFORM_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/fe79cdb3de91.jpg";

export function LandingView() {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach } = useAuth();
  const isLoggedIn = !!profile;

  // Use Arabic content when lang is ar, English otherwise
  const isAr = lang === "ar";

  const features = [
    {
      icon: Salad,
      title: isAr ? "خطط وجبات مخصصة بالـ AI" : "AI-Powered Meal Plans",
      desc: isAr
        ? "خطة تغذية يومية مبنية على وزنك وهدفك وتفضيلاتك. سعرات محسوبة بدقة وماكروز متوازنة مع استبعاد الأطعمة غير المحببة."
        : "Daily nutrition plan based on your weight, goal, and preferences. Precisely calculated calories and balanced macros.",
    },
    {
      icon: Dumbbell,
      title: isAr ? "برامج تمارين احترافية" : "Professional Workout Programs",
      desc: isAr
        ? "برنامج أسبوعي مصمم حسب مستواك ومعداتك وإصاباتك. تمرينات بصور وإرشادات تفصيلية بالعربية."
        : "Weekly program tailored to your level, equipment, and injuries. Exercises with detailed Arabic instructions.",
    },
    {
      icon: MessageCircle,
      title: isAr ? "مساعد ذكي بذاكرة" : "Smart AI Coach with Memory",
      desc: isAr
        ? "كوتش ذكي يتعرف على بياناتك وخططك ويجيب على أسئلتك فوراً. يحسب تبديلات الأطعمة بالجرامات والماكروز."
        : "AI coach that knows your data and plans, answers instantly. Calculates food swaps in grams and macros.",
    },
    {
      icon: Activity,
      title: isAr ? "تبديلات ذكية يومية" : "Daily Smart Swaps",
      desc: isAr
        ? "بدّل أي وجبة أو تمرين بضغطة واحدة. المساعد الذكي يحسب البديل المكافئ بالسعرات والعضلات. 2-5 تبديلات يومياً حسب اشتراكك."
        : "Swap any meal or exercise with one click. AI calculates equivalent replacement. 2-5 daily swaps based on your plan.",
    },
    {
      icon: LineChart,
      title: isAr ? "تتبع التقدم بالرسوم" : "Progress Tracking with Charts",
      desc: isAr
        ? "سجل وزنك وقياساتك أسبوعياً وشاهد تحولك على رسوم بيانية واضحة. صور قبل وبعد لتشوف الفرق بنفسك."
        : "Log weight and measurements weekly, see your transformation on clear charts. Before/after photos to see the difference.",
    },
    {
      icon: Shield,
      title: isAr ? "إشراف مباشر من الكوتش" : "Direct Coach Supervision",
      desc: isAr
        ? "الكوتش أحمد زكي يراجع استبياناتك ويوافق على خططك بنفسه. تذاكر دعم مباشرة + إشعارات فورية بكل تحديث."
        : "Coach Ahmed Zake reviews your questionnaires and approves plans personally. Direct support tickets + instant notifications.",
    },
  ];

  const steps = [
    {
      n: "1",
      title: isAr ? "أنشئ حسابك" : "Create your account",
      desc: isAr ? "في ثوانٍ معدودة. سجل بالإيميل أو Google." : "In seconds. Sign up with email or Google.",
    },
    {
      n: "2",
      title: isAr ? "أكمل الاستبيانات" : "Complete questionnaires",
      desc: isAr ? "أخبرنا عن هدفك، وزنك، نظامك الغذائي، إصاباتك، ومعداتك." : "Tell us your goal, weight, diet, injuries, and equipment.",
    },
    {
      n: "3",
      title: isAr ? "اختر باقتك" : "Choose your plan",
      desc: isAr ? "ستارتر، برو، أو إيليت — حسب احتياجك وعدد التبديلات اليومية." : "Starter, Pro, or Elite — based on your needs and daily swaps.",
    },
    {
      n: "4",
      title: isAr ? "احصل على خططك" : "Get your plans",
      desc: isAr ? "الكوتش يولّد خططك بالـ AI، يراجعها، ويوافق عليها. تبدأ التحوّل!" : "Coach generates your plans with AI, reviews, and approves. Transform!",
    },
  ];

  const testimonials = [
    {
      name: isAr ? "محمد العشري" : "Mohamed ElAshry",
      result: isAr ? "خسر 12 كجم في 3 أشهر" : "Lost 12kg in 3 months",
      text: isAr
        ? "أحسن كوتش جربته. الخطة مخصصة فعلاً وبطعم حياتي. المساعد الذكي بيرد على أسئلتي في أي وقت وحسابات التبديلات مظبوطة 100%."
        : "Best coach I've tried. The plan is truly personalized. The AI coach answers my questions anytime and swap calculations are 100% accurate.",
      rating: 5,
    },
    {
      name: isAr ? "سارة منصور" : "Sara Mansour",
      result: isAr ? "نزلت مقاسين في 4 أشهر" : "Dropped 2 sizes in 4 months",
      text: isAr
        ? "كنت حاسة إني ضايعه، بس أحمد فهم حالتي وعمللي خطة تناسبني. التتبع الأسبوعي خلاني ملتزمة وشوفة الفرق بنفسي."
        : "I felt lost, but Ahmed understood my situation and made a plan that fits me. Weekly tracking kept me committed and I saw the difference.",
      rating: 5,
    },
    {
      name: isAr ? "أحمد فؤاد" : "Ahmed Fouad",
      result: isAr ? "زاد 6 كجم عضلات" : "Gained 6kg muscle",
      text: isAr
        ? "برنامج التمارين احترافي جداً. كل تمرين متفسر بالعربي وفيه نصايح. التبديلات لما بكون في الجيم بديل سريع ومريح."
        : "The workout program is very professional. Every exercise explained in Arabic with tips. Swaps are quick and convenient at the gym.",
      rating: 5,
    },
  ];

  const stats = [
    { v: "+500", l: isAr ? "عميل نجحوا" : "clients succeeded", icon: Heart },
    { v: "+8", l: isAr ? "سنوات خبرة" : "years experience", icon: Star },
    { v: "24/7", l: isAr ? "مساعد ذكي" : "AI coach", icon: Zap },
    { v: "95%", l: isAr ? "نسبة الرضا" : "satisfaction rate", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-bold">{t("brand.name")}</span>
          </div>
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
                  {t("landing.hero.login")}
                </Button>
                <Button size="sm" className="gap-2" onClick={() => navigate("auth", { mode: "signup" })}>
                  {t("landing.hero.cta")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Image */}
      <section className="relative overflow-hidden bg-hero-glow">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          {/* Text */}
          <div className="text-center md:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? "منصة كوتشينج رقمية متكاملة" : "All-in-one digital coaching platform"}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
              {isAr ? (
                <>
                  ابنِ الجسم <span className="text-gradient">اللي تستحاه</span>
                  <br />
                  مع كوتش يعرفك بالاسم
                </>
              ) : (
                <>
                  Build the body <span className="text-gradient">you deserve</span>
                  <br />
                  with a coach who knows you
                </>
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground md:text-lg md:mx-0">
              {isAr
                ? "خطط تغذية وتمارين مخصصة بالذكاء الاصطناعي، مساعد ذكي بذاكرة عن بياناتك، تتبع أسبوعي للتقدم، وإشراف مباشر من الكوتش أحمد زكي. كل اللي تحتاجه عشان تحوّل جسمك وحياتك في مكان واحد."
                : "AI-powered nutrition and workout plans, a smart coach with memory of your data, weekly progress tracking, and direct supervision from Coach Ahmed Zake. Everything you need to transform your body and life in one place."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {isLoggedIn ? (
                <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate(isCoach ? "coach" : "dashboard")}>
                  <LayoutDashboard className="h-4 w-4" />
                  {isCoach ? t("coach.title") : t("nav.dashboard")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              ) : (
                <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate("auth", { mode: "signup" })}>
                  {isAr ? "ابدأ رحلتك مجاناً" : "Start your journey"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={() => navigate("pricing")}>
                {isAr ? "شوف الباقات" : "View pricing"}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground md:justify-start">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {isAr ? "ابدأ خلال دقيقة" : "Start in a minute"}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {isAr ? "خطط مخصصة بالـ AI" : "AI-personalized plans"}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {isAr ? "دعم مباشر" : "Direct support"}
              </span>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-20 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border shadow-glow">
              <img
                src={HERO_IMG}
                alt={isAr ? "كوتش لياقة محترف في الجيم" : "Professional fitness coach in gym"}
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
                    AZ
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-white">Ahmed Zake</p>
                    <p className="text-xs text-white/80">
                      {isAr ? "كوتش تغذية ولياقة معتمد" : "Certified Nutrition & Fitness Coach"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating stat card */}
            <div className="absolute -start-4 top-1/4 hidden rounded-2xl border border-border bg-card p-3 shadow-card md:block">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-success/15 text-success">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">+500</p>
                  <p className="text-[10px] text-muted-foreground">{isAr ? "عميل" : "clients"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-xl font-bold text-gradient">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-primary">
            {isAr ? "المميزات" : "Features"}
          </span>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">
            {isAr ? "كل اللي تحتاجه عشان تنجح" : "Everything you need to succeed"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {isAr
              ? "منصة متكاملة تجمع بين الذكاء الاصطناعي وخبرة الكوتش لتقدم لك تجربة كوتشينج ما كانتش متاحة قبل كده في العالم العربي."
              : "An integrated platform combining AI and coach expertise to deliver a coaching experience previously unavailable in the Arab world."}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <span className="inline-block rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-primary">
              {isAr ? "إزاي نشتغل" : "How it works"}
            </span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">
              {isAr ? "4 خطوات بسيطة لتحوّل حقيقي" : "4 simple steps to real transformation"}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="relative rounded-3xl border border-border bg-background p-6 shadow-card">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute end-0 top-1/2 hidden h-px w-6 translate-x-full bg-border lg:block" />
                )}
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary font-display text-lg font-bold text-primary-foreground shadow-glow">
                  {s.n}
                </span>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Coach Highlight */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" />
              {isAr ? "تقنية حصرية" : "Exclusive technology"}
            </span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">
              {isAr ? "مساعد ذكي بيتعلم من بياناتك" : "AI coach that learns from your data"}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {isAr
                ? "مش مجرد شات بوت عادي. المساعد الذكي بتاعنا بيبقى عنده مرجعية كاملة عنك: وزنك، هدفك، خطتك الحالية، استبياناتك، وتقدمك. لما تسأله \"ينفع أكل بطاطس بدل الرز؟\" بيحسبلك التبديل بالجرامات والماكروز على طول."
                : "Not just a regular chatbot. Our AI coach has full reference of your data: weight, goal, current plan, questionnaires, and progress. When you ask \"can I eat potato instead of rice?\" it calculates the swap in grams and macros instantly."}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                isAr ? "بيحسب تبديلات الأطعمة بالجرامات والسعرات" : "Calculates food swaps in grams and calories",
                isAr ? "بيقترح بدائل التمارين بنفس العضلات والحجم" : "Suggests exercise alternatives with same muscles and volume",
                isAr ? "بيرد على أسئلتك 24/7 في ثوانٍ" : "Answers your questions 24/7 in seconds",
                isAr ? "بيعرف حد التبديلات المتبقي لك" : "Knows your remaining swap quota",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-8 gap-2" onClick={() => navigate("auth", { mode: "signup" })}>
              {isAr ? "جرّب المساعد الذكي" : "Try the AI coach"}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>

          {/* Image */}
          <div className="order-1 md:order-2">
            <div className="relative overflow-hidden rounded-3xl border border-border shadow-card">
              <img
                src={MEAL_IMG}
                alt={isAr ? "وجبة صحية متوازنة" : "Healthy balanced meal"}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              {/* Macro badge */}
              <div className="absolute end-4 top-4 rounded-2xl border border-white/20 bg-black/60 px-4 py-2 backdrop-blur">
                <div className="flex items-center gap-3 text-xs text-white">
                  <div>
                    <div className="font-bold text-success">P: 180g</div>
                    <div className="text-white/60">{isAr ? "بروتين" : "Protein"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-warning">C: 200g</div>
                    <div className="text-white/60">{isAr ? "كارب" : "Carbs"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-primary">F: 70g</div>
                    <div className="text-white/60">{isAr ? "دهون" : "Fat"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Tracking Section */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          {/* Image */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-border shadow-card">
              <img
                src={PROGRESS_IMG}
                alt={isAr ? "تتبع تقدم اللياقة" : "Fitness progress tracking"}
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Floating chart card */}
            <div className="absolute -bottom-4 -end-4 hidden rounded-2xl border border-border bg-card p-4 shadow-card md:block">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs font-bold text-success">-4.5 kg</p>
                  <p className="text-[10px] text-muted-foreground">{isAr ? "في 8 أسابيع" : "in 8 weeks"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <LineChart className="h-3.5 w-3.5" />
              {isAr ? "تتبع ذكي" : "Smart tracking"}
            </span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">
              {isAr ? "شوف تحوّلك بأرقام وصور" : "See your transformation in numbers and photos"}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {isAr
                ? "سجل وزنك وقياساتك أسبوعياً وشاهد رسم بياني واضح لتقدمك. ارفع صور قبل وبعد وشوف الفرق بنفسك. كل ده محفوظ بشكل آمن ومش مرئي إلا ليك وللكوتش."
                : "Log your weight and measurements weekly and see a clear progress chart. Upload before/after photos and see the difference. Everything stored securely and visible only to you and your coach."}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <LineChart className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-xs font-medium">{isAr ? "رسوم بيانية" : "Charts"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <Camera className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-xs font-medium">{isAr ? "صور تقدم" : "Progress photos"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <Target className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-xs font-medium">{isAr ? "أهداف" : "Goals"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-primary">
            {isAr ? "قصص نجاح" : "Success stories"}
          </span>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">
            {isAr ? "عملاء حقيقين، نتائج حقيقية" : "Real clients, real results"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {isAr
              ? "أكتر من 500 عميل غيّروا حياتهم معنا. دي قصصهم الحقيقية."
              : "Over 500 clients transformed their lives with us. These are their real stories."}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((tm, i) => (
            <div key={i} className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-1 text-warning">
                {Array.from({ length: tm.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <Quote className="mt-4 h-8 w-8 text-primary/20" />
              <p className="mt-2 text-sm leading-relaxed text-foreground">{tm.text}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {tm.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{tm.name}</p>
                    <p className="text-xs text-success">{tm.result}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transformation Banner */}
      <section className="relative overflow-hidden border-y border-border">
        <div className="absolute inset-0">
          <img
            src={TRANSFORM_IMG}
            alt={isAr ? "تحوّل لياقة" : "Fitness transformation"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              {isAr ? "التحوّل مش مستحيل، بس محتاج خطة" : "Transformation isn't impossible, but it needs a plan"}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {isAr
                ? "اكتر حاجة بتوقف الناس إنهم مش عارفين يبدأوا منين. احنا بنشيل عنك التفكير كله — تخطيط، متابعة، تعديل. إنت بس التزم وشف النتيجة."
                : "The biggest thing stopping people is not knowing where to start. We take away all the thinking — planning, tracking, adjusting. You just commit and see results."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate("auth", { mode: "signup" })}>
                {isAr ? "ابدأ تحوّلك النهارده" : "Start your transformation today"}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("pricing")}>
                {isAr ? "شوف الباقات والأسعار" : "See plans & pricing"}
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {isAr ? "ابدأ في أقل من دقيقة" : "Start in under a minute"}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                {isAr ? "بياناتك آمنة" : "Your data is safe"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-10 blur-2xl" />
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-secondary/40 to-card p-10 shadow-card">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Dumbbell className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-3xl font-bold md:text-4xl">
              {isAr ? "جسمك الجديد بيستناك" : "Your new body is waiting"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              {isAr
                ? "انضم لأكثر من 500 عميل غيّروا حياتهم. ابدأ النهارده بخطة مخصصة ليك وحدك."
                : "Join 500+ clients who transformed their lives. Start today with a plan made just for you."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate("auth", { mode: "signup" })}>
                {isAr ? "أنشئ حسابك مجاناً" : "Create your free account"}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("pricing")}>
                {isAr ? "شوف الأسعار" : "See pricing"}
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              {isAr ? "ابدأ خلال دقيقة • خطط مخصصة بالـ AI" : "Start in a minute • AI-personalized plans"}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
                  <Dumbbell className="h-5 w-5 text-primary-foreground" />
                </span>
                <span className="font-display text-lg font-bold">{t("brand.name")}</span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                {isAr
                  ? "منصة كوتشينج رقمية متكاملة بتجمع بين الذكاء الاصطناعي وخبرة الكوتش أحمد زكي لمساعدتك تحقق أهدافك."
                  : "An integrated digital coaching platform combining AI and Coach Ahmed Zake's expertise to help you achieve your goals."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">{isAr ? "روابط سريعة" : "Quick links"}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-primary">{isAr ? "الأسعار" : "Pricing"}</Link></li>
                <li><Link href="/blog" className="hover:text-primary">{isAr ? "المدونة" : "Blog"}</Link></li>
                <li><button onClick={() => navigate("auth", { mode: "signup" })} className="hover:text-primary">{isAr ? "تسجيل" : "Sign up"}</button></li>
                <li><button onClick={() => navigate("auth", { mode: "login" })} className="hover:text-primary">{isAr ? "تسجيل دخول" : "Log in"}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">{isAr ? "تواصل معنا" : "Contact"}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</li>
                <li className="flex items-center gap-2"><Camera className="h-4 w-4" /> Instagram</li>
                <li className="flex items-center gap-2"><Heart className="h-4 w-4" /> {isAr ? "دعم 24/7" : "24/7 support"}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
          </div>
        </div>
      </footer>
    </div>
  );
}
