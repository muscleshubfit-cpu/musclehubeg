"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Marquee } from "@/components/ui/3d-testimonials";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { listBlogPosts, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { Dumbbell, Apple, BarChart3, Bot, Check, ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";

const testimonialsData = [
  { name: "Mohamed ElAshry", username: "@mohamed", body: "Lost 12kg in 3 months. EVO answers my questions anytime!", img: "https://randomuser.me/api/portraits/men/32.jpg", country: "🇪🇬 Egypt" },
  { name: "Sara Mansour", username: "@sara", body: "The coaches understood my situation and made a plan that fits me perfectly.", img: "https://randomuser.me/api/portraits/women/44.jpg", country: "🇪🇬 Egypt" },
  { name: "Ahmed Fouad", username: "@ahmedf", body: "Gained 6kg muscle. The workout program is very professional.", img: "https://randomuser.me/api/portraits/men/52.jpg", country: "🇪🇬 Egypt" },
  { name: "Omar Hassan", username: "@omar", body: "The swap feature is a game changer. Quick and accurate!", img: "https://randomuser.me/api/portraits/men/22.jpg", country: "🇸🇦 KSA" },
  { name: "Layla Ahmed", username: "@layla", body: "Weekly tracking kept me committed. Down 2 sizes in 4 months!", img: "https://randomuser.me/api/portraits/women/68.jpg", country: "🇦🇪 UAE" },
  { name: "Khaled Ibrahim", username: "@khaled", body: "Best coaching platform in Egypt. The AI + human combo is unbeatable.", img: "https://randomuser.me/api/portraits/men/85.jpg", country: "🇪🇬 Egypt" },
  { name: "Nour Adel", username: "@nour", body: "EVO adjusts my plan automatically. I never hit a plateau!", img: "https://randomuser.me/api/portraits/women/45.jpg", country: "🇰🇼 Kuwait" },
  { name: "Youssef Tarek", username: "@youssef", body: "The meal plans are personalized to the gram. Incredible attention to detail.", img: "https://randomuser.me/api/portraits/men/33.jpg", country: "🇪🇬 Egypt" },
  { name: "Mariam Sherif", username: "@mariam", body: "Lost 8kg and gained confidence. The coaching is the real deal.", img: "https://randomuser.me/api/portraits/women/53.jpg", country: "🇪🇬 Egypt" },
];

function TestimonialCard({ img, name, username, body, country, isAr }: { img: string; name: string; username: string; body: string; country: string; isAr: boolean }) {
  return (
    <Card className="w-72 shrink-0 bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            <AvatarImage src={img} alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <figcaption className="text-sm font-medium text-[#1d1d1f] flex items-center gap-1">
              {name} <span className="text-xs">{country}</span>
            </figcaption>
            <p className="text-xs font-normal text-[#6e6e73]">{username}</p>
          </div>
        </div>
        <blockquote className="mt-3 text-sm font-normal leading-relaxed text-[#1d1d1f]">{body}</blockquote>
      </CardContent>
    </Card>
  );
}

// Disabled Reveal — animations were causing jarring "shake" effects
// during scroll. Now just renders children directly.
function Reveal({
  children,
  className = "",
  delay: _delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}

function CenteredSection({
  children,
  bg = "bg-white",
}: {
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <section className={`${bg} px-4 py-16 md:py-24`}>
      <div className="mx-auto max-w-4xl text-center">{children}</div>
    </section>
  );
}

export default function CoachingPage() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const router = useRouter();
  const { profile } = useAuth();
  const isAr = lang === "ar";
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);

  // Smooth scroll to pricing section
  const scrollToPricing = () => {
    document.getElementById("coaching-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 0046 OWNER DECREE — «الأسعار اللي شيلتها هي الصحيحة والمربوطة مع باي بال،
  // والسعر الجديد 39 هو الغلط»: this page keeps selling the ORIGINAL
  // Starter ($20/mo) / Elite ($40/mo) products — the PayPal-tied prices.
  // The 0045 unified $39.99/$359 cards here were REVERTED. The real 0045
  // fix (the /memberships coaching card dead-end) stays: /checkout accepts
  // starter/elite AND coaching. At activation these legacy products are
  // written under their canonical model tiers (starter → premium,
  // elite → pro) via canonicalModelTier() so feature gates + the 0045 DB
  // guard keep working — clients pay the exact price they clicked.
  const goToCheckout = (tier: string) => {
    const checkoutUrl = `/checkout?tier=${tier}&months=1`;
    if (profile) {
      router.push(checkoutUrl);
    } else {
      router.push(`/auth?mode=signup&next=${encodeURIComponent(checkoutUrl)}`);
    }
  };

  useEffect(() => {
    (async () => {
      const posts = await listBlogPosts(lang);
      setLatestPosts(posts.slice(0, 3));
    })();
  }, [lang]);

  const blogHref = isAr ? "/ar/blog" : "/blog";

  const features = [
    {
      icon: Apple,
      titleAr: "خطط تغذية مخصصة",
      titleEn: "Personalized Nutrition Plans",
      descAr: "خطة تغذية بالجرام والسعرات والماكروز بناءً على هدفك، وزنك، وعاداتك الغذائية. مع تبديل الوجبات بذكاء.",
      descEn: "Nutrition plan with precise macros, calories, and gram-level detail based on your goal, weight, and dietary habits. Smart meal swaps included.",
      color: "#34c759",
    },
    {
      icon: Dumbbell,
      titleAr: "برامج تمارين متكيفة",
      titleEn: "Adaptive Workout Programs",
      descAr: "برنامج تمارين يتكيف مع مستواك، معداتك المتاحة، وتقدمك. مع تبديل التمارين بذكاء والشرح الكامل لكل تمرين.",
      descEn: "Workout program that adapts to your level, available equipment, and progress. Smart exercise swaps with full instructions.",
      color: "#0071e3",
    },
    {
      icon: BarChart3,
      titleAr: "تتبع التقدم الذكي",
      titleEn: "Smart Progress Tracking",
      descAr: "تتبع وزنك، قياساتك، وصورك. EVO بيحلل الأنماط ويخبرك بإيه اللي شغال وإيه اللي محتاج تعديل.",
      descEn: "Track your weight, measurements, and photos. EVO analyzes patterns and tells you what's working and what needs adjustment.",
      color: "#ff9500",
    },
    {
      icon: Bot,
      titleAr: "EVO — مساعدك الذكي 24/7",
      titleEn: "EVO — Your AI Assistant 24/7",
      descAr: "اسأل EVO أي سؤال عن التغذية، التمارين، أو التحفيز في أي وقت. مش مجرد شات بوت — محرك أداء ذكي بيتعلم من بياناتك.",
      descEn: "Ask EVO any question about nutrition, exercises, or motivation anytime. Not just a chatbot — a smart engine that learns from your data.",
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main>
        {/* ===================== HERO ===================== */}
        {/* Image 1 (coaching-1) directly under the title */}
        <section className="bg-gradient-to-b from-[#f5f5f7] to-white px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-4 py-1.5 text-xs font-medium text-[#0071e3]">
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? "كوتشينج أونلاين" : "Online Coaching"}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              {isAr ? "مدربين وأخصائيين" : "Coaches & Nutrition"}
              <br />
              {isAr ? "تغذية محترفين." : "Specialists."}
            </h1>
            {/* Image 1 — directly under the hero title */}
            <div className="relative mt-8 aspect-[3/2] w-full overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="/images/hero/coaching-1.jpg"
                alt={isAr ? "منصة Musclehubeg الذكية" : "Musclehubeg smart platform"}
                fill
                className="object-cover"
                loading="eager"
              />
            </div>
            <p className="mx-auto mt-8 max-w-xl text-lg font-normal leading-snug text-[#6e6e73] md:text-xl">
              {isAr
                ? "خطط تغذية مخصصة، برامج تمارين متكيفة، متابعة شخصية، ومحرك ذكاء اصطناعي (EVO) متاح 24/7."
                : "Personalized nutrition plans, adaptive workout programs, personal follow-up, and an AI engine (EVO) available 24/7."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={scrollToPricing}
                className="rounded-full bg-[#0071e3] px-7 py-3 text-base font-medium text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "ابدأ تحوّلك" : "Start your transformation"}
              </button>
              <a
                href="#how-it-works"
                className="rounded-full bg-[#f5f5f7] px-7 py-3 text-base font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
              >
                {isAr ? "كيف يعمل الكوتشينج؟" : "How coaching works"}
              </a>
            </div>
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section id="how-it-works" className="scroll-mt-20 bg-white px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "رحلتك في ٤ خطوات." : "Your journey in 4 steps."}
              </h2>
            </Reveal>
            <div className="mt-12 space-y-8 md:space-y-12">
              {[
                { n: "01", title: isAr ? "أنشئ حسابك" : "Create your account", desc: isAr ? "في ثوانٍ. بالإيميل أو Google." : "In seconds. Email or Google." },
                { n: "02", title: isAr ? "أكمل الاستبيانات" : "Complete questionnaires", desc: isAr ? "أخبرنا عن هدفك، وزنك، عاداتك." : "Tell us your goal, weight, habits." },
                { n: "03", title: isAr ? "EVO يحلل ويخطط" : "EVO analyzes & plans", desc: isAr ? "المدربين + EVO يولّدون خططك المخصصة." : "Coaches + EVO generate your plans." },
                { n: "04", title: isAr ? "ابدأ التحوّل" : "Start transforming", desc: isAr ? "تتبع، استبدل، واسأل EVO." : "Track, swap, and ask EVO." },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 80}>
                  <div className="grid grid-cols-[auto_1fr] gap-6 border-t border-[#d2d2d7] pt-6 md:grid-cols-[120px_1fr] md:gap-12 md:pt-8">
                    <div className="text-sm font-normal text-[#6e6e73]">{s.n}</div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight md:text-3xl">{s.title}</h3>
                      <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== FEATURES ===================== */}
        <section className="bg-[#f5f5f7] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "كل أداة محتاجها." : "Every tool you need."}
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={i} delay={i * 100}>
                    <div className="h-full rounded-3xl bg-white p-8">
                      <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ backgroundColor: `${f.color}15` }}>
                        <Icon className="h-7 w-7" style={{ color: f.color }} />
                      </span>
                      <h3 className="mt-5 text-xl font-semibold tracking-tight">
                        {isAr ? f.titleAr : f.titleEn}
                      </h3>
                      <p className="mt-3 text-base font-normal leading-relaxed text-[#6e6e73]">
                        {isAr ? f.descAr : f.descEn}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== COACHING VISUALS ===================== */}
        {/* Image 2 (coaching-2) — placed between Features and EVO sections */}
        <section className="bg-white px-4 py-12 md:py-20">
          <div className="relative mx-auto aspect-[3/2] w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl">
            <Image
              src="/images/hero/coaching-2.jpg"
              alt={isAr ? "تدريب احترافي بالذكاء الاصطناعي" : "Professional AI-assisted training"}
              fill
              className="object-cover"
              loading="lazy"
            />
          </div>
        </section>

        {/* ===================== EVO INTEGRATION ===================== */}
        <section className="bg-[#f5f5f7] px-4 py-16 text-[#1d1d1f] md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "المدرب + EVO معاك 24/7." : "Your coach + EVO, 24/7."}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-normal text-[#6e6e73] md:text-xl">
              {isAr
                ? "مش مجرد شات بوت. محرك أداء ذكي بيقرأ بياناتك وهدفك، ويبني لك خطط مخصصة، ويقترح تبديلات ذكية — وهو جزء من باقة الكوتشينج، مش اشتراك منفصل عنها."
                : "Not just a chatbot. A smart engine that reads your data and goal, builds personalized plans, and suggests smart swaps — included in your coaching plan, not a separate subscription."}
            </p>
            {/* Owner directive 2026-08-30: EVO is a service inside the
                subscriptions, NOT a CTA. The old twin promo buttons
                ("Learn more about EVO" + "Start chatting") are demoted to a
                single quiet informational link. */}
            <div className="mt-6">
              <a
                href="/evo"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
                style={{ border: "1px solid #d2d2d7" }}
              >
                {isAr ? "اعرف أكثر عن EVO" : "Learn more about EVO"}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </a>
            </div>
          </div>
        </section>

        {/* ===================== TESTIMONIALS ===================== */}
        <section className="bg-[#f5f5f7] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "نتائج حقيقية." : "Real results."}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-4 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:text-xl">
                {isAr ? "+500 عميل غيّروا حياتهم مع Musclehubeg." : "500+ clients transformed their lives with Musclehubeg."}
              </p>
            </Reveal>

            {/* Musclehubeg brand mark — above the marquee */}
            <Reveal delay={200}>
              <div className="mt-10 flex flex-col items-center">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-[#0071e3] text-3xl font-bold text-white ring-4 ring-white shadow-lg">
                  M
                </div>
                <p className="mt-3 text-sm font-semibold">Musclehubeg</p>
                <p className="text-xs font-normal text-[#6e6e73]">
                  {isAr ? "منصة لياقة وتغذية أونلاين" : "Online Fitness & Nutrition Platform"}
                </p>
              </div>
            </Reveal>

            {/* 3D Marquee */}
            <Reveal delay={300}>
              <div className="relative mt-8 flex h-[400px] w-full items-center justify-center overflow-hidden [perspective:300px]">
                <div
                  className="flex flex-row items-center gap-4"
                  style={{
                    transform: "translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)",
                  }}
                >
                  <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">
                    {testimonialsData.map((review) => (
                      <TestimonialCard key={review.username} {...review} isAr={isAr} />
                    ))}
                  </Marquee>
                  <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:40s]">
                    {testimonialsData.map((review) => (
                      <TestimonialCard key={review.username} {...review} isAr={isAr} />
                    ))}
                  </Marquee>
                  <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">
                    {testimonialsData.map((review) => (
                      <TestimonialCard key={review.username} {...review} isAr={isAr} />
                    ))}
                  </Marquee>
                  <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:40s]">
                    {testimonialsData.map((review) => (
                      <TestimonialCard key={review.username} {...review} isAr={isAr} />
                    ))}
                  </Marquee>
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#f5f5f7]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#f5f5f7]" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#f5f5f7]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#f5f5f7]" />
              </div>
            </Reveal>

            {/* Featured quotes */}
            <div className="mt-12 space-y-8 md:space-y-12">
              {[
                { name: isAr ? "محمد العشري" : "Mohamed ElAshry", result: isAr ? "-12 كجم في 3 أشهر" : "-12kg in 3 months", text: isAr ? "أحسن كوتش جربته. EVO بيرد على أسئلتي في أي وقت." : "Best coach I've tried. EVO answers my questions anytime." },
                { name: isAr ? "سارة منصور" : "Sara Mansour", result: isAr ? "-2 مقاس في 4 أشهر" : "-2 sizes in 4 months", text: isAr ? "المدربين فهموا حالتي وعملوا خطة تناسبني. التتبع خلاني ملتزمة." : "The coaches understood my situation and made a plan that fits me." },
              ].map((tm, i) => (
                <Reveal key={i} delay={i * 100}>
                  <blockquote className="text-center">
                    <p className="mx-auto max-w-2xl text-xl font-normal leading-relaxed tracking-tight md:text-3xl md:leading-relaxed">
                      "{tm.text}"
                    </p>
                    <footer className="mt-6">
                      <div className="text-sm font-semibold">{tm.name}</div>
                      <div className="mt-1 text-sm font-normal text-[#0071e3]">{tm.result}</div>
                    </footer>
                  </blockquote>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== PRICING ===================== */}
        <section id="coaching-pricing" className="scroll-mt-20 bg-white px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "استثمر في نفسك." : "Invest in yourself."}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-4 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:text-xl">
                {isAr ? "باقة كوتشينج واحدة بكل حاجة." : "One coaching plan with everything."}
              </p>
            </Reveal>
            {/* PHASE 68 (owner-approved): the legacy Starter $20 / Elite $40
                cards are REMOVED from display — they silently remapped to
                premium/pro at activation and confused pricing. The canonical
                Coaching membership (memberships.ts) is the single offer.
                Old checkout links (?tier=starter/elite) stay valid. */}
            <div className="mx-auto mt-16 max-w-xl">
              <Reveal>
                <div className="h-full rounded-3xl bg-black p-8 text-white md:p-10">
                  <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                    {isAr ? "كوتشينج" : "Coaching"}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight md:text-5xl">$39.99</span>
                    <span className="text-base font-normal opacity-60">{isAr ? "/شهر" : "/mo"}</span>
                  </div>
                  <p className="mt-1 text-sm font-normal opacity-60">{isAr ? "أو $359 سنويًا" : "or $359/yr"}</p>
                  <ul className="mt-8 space-y-3 text-base font-normal">
                    {[isAr ? "خطط تغذية وتمارين من مدرب بشري" : "Nutrition + workout plans from a human coach",
                      isAr ? "EVO: محادثة غير محدودة وذاكرة دائمة" : "EVO: unlimited chat + cross-session memory",
                      isAr ? "متابعة أسبوعية بتذكير تلقائي" : "Weekly check-in reminders",
                      isAr ? "تبديلات يدوية من المدرب" : "Manual swaps by the coach",
                      isAr ? "تذاكر دعم أولوية" : "Priority support tickets",
                      isAr ? "تواصل مباشر مع المدرب" : "Direct contact with the coach"].map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 opacity-60" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => goToCheckout("coaching")}
                    className="mt-8 w-full rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
                  >
                    {isAr ? "ابدأ الآن" : "Get Started"}
                  </button>
                  <a
                    href={isAr ? "/ar/memberships" : "/memberships"}
                    className="mt-4 block text-center text-sm font-normal opacity-60 transition-opacity hover:opacity-90"
                  >
                    {isAr ? "مقارنة كل الباقات ›" : "Compare all memberships ›"}
                  </a>
                </div>
              </Reveal>
            </div>
            <Reveal delay={400}>
              <div className="mt-12 text-center">
                <button onClick={scrollToPricing} className="font-normal text-[#0071e3] transition-opacity hover:opacity-70">
                  {isAr ? "كل التفاصيل ›" : "See all details ›"}
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section className="bg-[#f5f5f7] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "أسئلة شائعة." : "Questions?"}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <Accordion type="single" collapsible className="mt-12">
                {[
                  { q: isAr ? "ما هو الكوتشينج في Musclehubeg؟" : "What is Musclehubeg coaching?", a: isAr ? "كوتشينج أونلاين مع مدربين وأخصائيين تغذية محترفين. خطط مخصصة + EVO AI + متابعة شخصية." : "Online coaching with professional coaches and nutrition specialists. Personalized plans + EVO AI + personal follow-up." },
                  { q: isAr ? "من هو EVO؟" : "Who is EVO?", a: isAr ? "محرك الأداء الذكي. مش شات بوت — بيرد على أسئلتك، يبني لك خطط، ويقدر يحفظها في لوحة خططك مع إمكانية استبدال الوجبات والتمارين." : "The intelligent performance engine. Not a chatbot — it answers your questions, builds plans, and can save them to your plans dashboard with meal/exercise swaps." },
                  { q: isAr ? "هل الخطط مخصصة؟" : "Are plans personalized?", a: isAr ? "نعم، كل خطة بتتبني من استبياناتك على يد مدرب بشري، وتقدر تطلب استبدالات من خطتك في أي وقت." : "Yes, every plan is built from your questionnaires by a human coach, and you can request swaps anytime." },
                  { q: isAr ? "هل المدربين حقيقيين؟" : "Are the coaches real?", a: isAr ? "نعم، المدربين حقيقيين ويراجعون خططك بنفسهم." : "Yes, real coaches review your plans personally." },
                  { q: isAr ? "طرق الدفع؟" : "Payment methods?", a: isAr ? "PayPal (الطريقة الرئيسية)، InstaPay، و Vodafone Cash." : "PayPal (primary), InstaPay, and Vodafone Cash." },
                  { q: isAr ? "بياناتي آمنة؟" : "Is my data secure?", a: isAr ? "نعم، مشفرة على Supabase مع RLS." : "Yes, encrypted on Supabase with RLS." },
                ].map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-b border-[#d2d2d7]">
                    <AccordionTrigger className="py-5 text-start text-lg font-normal hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base font-normal leading-relaxed text-[#6e6e73]">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section className="bg-white px-4 py-16 text-center md:py-24">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              {isAr ? "جسمك الجديد بيستناك." : "Your new body is waiting."}
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <button
                onClick={scrollToPricing}
                className="rounded-full bg-[#0071e3] px-7 py-3 text-base font-medium text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "ابدأ تحوّلي" : "Start my transformation"}
              </button>
              {/* Owner 2026-08-30: removed the old "اعرف عن EVO ›" link —
                  EVO is part of the subscription, not a destination CTA. */}
            </div>
          </Reveal>
        </section>

        {/* ===================== SHARE ===================== */}
        <div className="mx-auto max-w-4xl px-4 pb-12">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4">
            <p className="text-sm font-medium text-[#1d1d1f]">
              {isAr ? "شارك صفحة الكوتشينج" : "Share coaching page"}
            </p>
            <ShareButtons
              title={isAr ? "كوتشينج أونلاين | Musclehubeg" : "Online Coaching | Musclehubeg"}
              text={isAr ? "مدربين وأخصائيين تغذية + EVO AI. خطط مخصصة ومتابعة شخصية." : "Coaches & nutrition specialists + EVO AI. Personalized plans and personal follow-up."}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
