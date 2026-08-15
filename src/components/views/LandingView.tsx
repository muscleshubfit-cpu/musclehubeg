"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listBlogPosts, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { SiteHeader } from "@/components/SiteHeader";
import { Marquee } from "@/components/ui/3d-testimonials";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

// 3D Testimonials data — MuscleHub clients
const testimonialsData = [
  { name: "Mohamed ElAshry", username: "@mohamed", body: "Lost 12kg in 3 months. EVO AI answers my questions anytime!", img: "https://randomuser.me/api/portraits/men/32.jpg", country: "🇪🇬 Egypt" },
  { name: "Sara Mansour", username: "@sara", body: "Ahmed understood my situation and made a plan that fits me perfectly.", img: "https://randomuser.me/api/portraits/women/44.jpg", country: "🇪🇬 Egypt" },
  { name: "Ahmed Fouad", username: "@ahmedf", body: "Gained 6kg muscle. The workout program is very professional.", img: "https://randomuser.me/api/portraits/men/52.jpg", country: "🇪🇬 Egypt" },
  { name: "Omar Hassan", username: "@omar", body: "The swap feature is a game changer. Quick and accurate!", img: "https://randomuser.me/api/portraits/men/22.jpg", country: "🇸🇦 KSA" },
  { name: "Layla Ahmed", username: "@layla", body: "Weekly tracking kept me committed. Down 2 sizes in 4 months!", img: "https://randomuser.me/api/portraits/women/68.jpg", country: "🇦🇪 UAE" },
  { name: "Khaled Ibrahim", username: "@khaled", body: "Best coaching platform in Egypt. The AI + human combo is unbeatable.", img: "https://randomuser.me/api/portraits/men/85.jpg", country: "🇪🇬 Egypt" },
  { name: "Nour Adel", username: "@nour", body: "EVO adjusts my plan automatically. I never hit a plateau!", img: "https://randomuser.me/api/portraits/women/45.jpg", country: "🇰🇼 Kuwait" },
  { name: "Youssef Tarek", username: "@youssef", body: "The meal plans are personalized to the gram. Incredible attention to detail.", img: "https://randomuser.me/api/portraits/men/33.jpg", country: "🇪🇬 Egypt" },
  { name: "Mariam Sherif", username: "@mariam", body: "Lost 8kg and gained confidence. Coach Ahmed is the real deal.", img: "https://randomuser.me/api/portraits/women/53.jpg", country: "🇪🇬 Egypt" },
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

// Apple-style gentle reveal
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${isVisible ? "animate-fade-in" : "scroll-hidden"} ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// Apple-style product card (rounded, hover scale)
function ProductCard({
  title,
  subtitle,
  image,
  cta,
  isDark = false,
}: {
  title: string;
  subtitle: string;
  image: string;
  cta?: { label: string; onClick: () => void };
  isDark?: boolean;
}) {
  const bg = isDark ? "bg-black" : "bg-[#f5f5f7]";
  const text = isDark ? "text-white" : "text-[#1d1d1f]";
  const subText = isDark ? "text-gray-400" : "text-[#6e6e73]";
  return (
    <div className={`overflow-hidden rounded-3xl ${bg} ${text}`}>
      <div className="px-6 pt-10 text-center md:px-10 md:pt-16">
        <h3 className="text-2xl font-semibold tracking-tight md:text-4xl">{title}</h3>
        <p className={`mt-2 text-sm font-normal md:text-lg ${subText}`}>{subtitle}</p>
        {cta && (
          <button
            onClick={cta.onClick}
            className="mt-4 inline-flex items-center gap-1 text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70 md:text-base"
          >
            {cta.label} <span aria-hidden>›</span>
          </button>
        )}
      </div>
      <div className="mt-6 px-6 pb-6 md:px-10 md:pb-10">
        <img
          src={image}
          alt={title}
          className="aspect-[4/3] w-full rounded-2xl object-contain"
          loading="lazy"
        />
      </div>
    </div>
  );
}

// Apple-style centered section — simple, no sticky.
// Apple uses sticky scroll-jacking sparingly; for most sections they use
// clean vertical rhythm with generous padding. This keeps the scroll fast
// and predictable.
function CenteredSection({
  children,
  bg = "bg-white",
}: {
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <section className={`${bg} px-4 py-24 md:py-40`}>
      <div className="mx-auto max-w-4xl text-center">{children}</div>
    </section>
  );
}

// Premium images — MuscleHub Studio Style (clean white, photorealistic)
const IMAGES = {
  hero: "/images/hero-ahmed.png",
  coach: "/images/coach-portrait.png",
  evo: "/images/evo-standalone.png",
  together: "/images/ahmed-evo-together.png",
  meal: "/images/meal-nutrition.png",
  workout: "/images/ahmed-workout.png",
  progress: "/images/ahmed-progress-tablet.png",
  running: "/images/ahmed-running.png",
  data: "/images/evo-data.png",
  accessories: "/images/accessories.png",
};

export function LandingView() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach } = useAuth();
  const isLoggedIn = !!profile;
  const isAr = lang === "ar";

  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  useEffect(() => {
    (async () => {
      const posts = await listBlogPosts(lang);
      setLatestPosts(posts.slice(0, 3));
    })();
  }, [lang]);

  // Hero carousel — auto-rotates through all studio images
  const heroImages = [
    { src: IMAGES.hero, alt: isAr ? "أحمد زكي" : "Ahmed Zake" },
    { src: IMAGES.coach, alt: isAr ? "أحمد زكي — الكوتش" : "Ahmed Zake — Coach" },
    { src: IMAGES.together, alt: isAr ? "أحمد زكي و EVO" : "Ahmed Zake and EVO" },
    { src: IMAGES.workout, alt: isAr ? "تمارين القوة" : "Strength Training" },
    { src: IMAGES.meal, alt: isAr ? "تغذية صحية" : "Healthy Nutrition" },
    { src: IMAGES.progress, alt: isAr ? "تتبع التقدم" : "Progress Tracking" },
    { src: IMAGES.running, alt: isAr ? "كارديو" : "Cardio" },
    { src: IMAGES.evo, alt: "EVO" },
  ];
  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000); // 4 seconds per slide
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      {/* ===================== 1. HERO — with image carousel ===================== */}
      <section className="flex min-h-[85vh] flex-col items-center justify-center bg-white px-4 pt-16 text-center md:pt-20">
        <Reveal>
          <p className="mb-3 text-sm font-normal text-[#6e6e73] md:text-base">
            {isAr ? "منصة MuscleHub" : "MuscleHub"}
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-[80px]">
            {isAr ? "أقوى نسخة منك." : "A stronger you."}
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-4 max-w-xl text-xl font-normal leading-snug text-[#1d1d1f] md:text-2xl">
            {isAr ? "كوتشينج حقيقي. ذكاء اصطناعي. نتائج حقيقية." : "Real coaching. Real AI. Real results."}
          </p>
        </Reveal>

        {/* Image Carousel */}
        <Reveal delay={300}>
          <div className="relative mt-10 w-full max-w-md md:max-w-lg">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#f5f5f7]">
              {heroImages.map((img, i) => (
                <img
                  key={i}
                  src={img.src}
                  alt={img.alt}
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${
                    i === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ))}
            </div>

            {/* Carousel dots */}
            <div className="mt-6 flex justify-center gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === currentSlide
                      ? "w-8 bg-[#0071e3]"
                      : "w-2 bg-[#d2d2d7] hover:bg-[#6e6e73]"
                  }`}
                />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={500}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-base md:gap-6">
            <button
              onClick={() => navigate("auth", { mode: "signup" })}
              className="rounded-full bg-[#0071e3] px-6 py-2.5 font-normal text-white transition-opacity hover:opacity-90 md:px-7 md:py-3"
            >
              {isAr ? "ابدأ تحوّلك" : "Start your transformation"}
            </button>
            <button
              onClick={() => navigate("pricing")}
              className="font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "الأسعار ›" : "Pricing ›"}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ===================== 3. STICKY SCROLL — "Not just fitness" ===================== */}
      <CenteredSection bg="bg-white">
        <div className="px-4 text-center">
          <p className="text-sm font-normal text-[#6e6e73] md:text-base">
            {isAr ? "ما هي MuscleHub؟" : "What is MuscleHub?"}
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? (
              <>
                ليست منصة لياقة.
                <br />
                بل نظام تحسين بشري.
              </>
            ) : (
              <>
                Not a fitness platform.
                <br />
                A human optimization system.
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-[#6e6e73] md:text-xl">
            {isAr
              ? "نجمع بين خبرة الكوتش أحمد زكي وعلم الرياضة والتغذية والذكاء الاصطناعي في نظام بيئي واحد."
              : "Combining Coach Ahmed Zake's expertise with sports science, nutrition, and AI in one ecosystem."}
          </p>
        </div>
      </CenteredSection>

      {/* ===================== 4. MEET THE TEAM — Apple-style cards ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight md:mb-6 md:text-5xl">
              {isAr ? "إنسان + ذكاء اصطناعي." : "Human + AI."}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mb-12 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:mb-16 md:text-xl">
              {isAr ? "الكوتش أحمد زكي ومحرك EVO — معاً." : "Coach Ahmed Zake and the EVO engine — together."}
            </p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            <Reveal>
              <ProductCard
                title={isAr ? "أحمد زكي" : "Ahmed Zake"}
                subtitle={isAr ? "الكوتش البشري" : "The Human Coach"}
                image={IMAGES.coach}
                cta={{ label: isAr ? "اعرف أكثر" : "Learn more", onClick: () => navigate("about") }}
              />
            </Reveal>
            <Reveal delay={100}>
              <ProductCard
                title="EVO"
                subtitle={isAr ? "محرك الأداء الذكي" : "AI Performance Engine"}
                image={IMAGES.evo}
                isDark
                cta={{ label: isAr ? "اعرف أكثر" : "Learn more", onClick: () => navigate("auth", { mode: "signup" }) }}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== 5. EVO spotlight ===================== */}
      <CenteredSection bg="bg-black">
        <div className="px-4 text-center text-white">
          <p className="text-sm font-normal text-gray-400 md:text-base">
            {isAr ? "تعرّف على" : "Meet"}
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-[80px]">
            EVO.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-gray-300 md:text-xl">
            {isAr
              ? "ليس شات بوت. محرك أداء ذكي يحلل بياناتك، يتنبأ بنتائجك، ويحدّث خططك تلقائياً — 24/7."
              : "Not a chatbot. An intelligent engine that analyzes your data, predicts outcomes, and updates your plans automatically — 24/7."}
          </p>
          <div className="mt-8 flex justify-center">
            <img
              src={IMAGES.evo}
              alt="EVO"
              className="aspect-[4/5] w-full max-w-xs rounded-2xl object-contain md:max-w-sm"
              loading="lazy"
            />
          </div>
        </div>
      </CenteredSection>

      {/* ===================== 6. STATS — Apple-style large numbers ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-4 md:gap-8">
            {[
              { v: "+500", l: isAr ? "عميل نجح" : "clients" },
              { v: "95%", l: isAr ? "نسبة رضا" : "satisfaction" },
              { v: "-8.5kg", l: isAr ? "متوسط الفقد" : "avg. loss" },
              { v: "12", l: isAr ? "أسبوع" : "weeks" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 100} className="text-center">
                <div className="text-4xl font-semibold tracking-tight text-[#1d1d1f] md:text-6xl">
                  {s.v}
                </div>
                <div className="mt-2 text-sm font-normal text-[#6e6e73] md:text-base">
                  {s.l}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 7. HUMAN + AI TOGETHER ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "الذكاء البشري الاصطناعي." : "Artificial Human Intelligence."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-[#6e6e73] md:text-xl">
              {isAr
                ? "الكوتش أحمد زكي + محرك EVO. خبرة الإنسان وسرعة البيانات في نظام واحد."
                : "Coach Ahmed Zake + the EVO engine. Human wisdom and data speed in one system."}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-12">
              <img
                src={IMAGES.together}
                alt={isAr ? "أحمد زكي و EVO" : "Ahmed Zake and EVO"}
                className="mx-auto aspect-[4/5] w-full max-w-md rounded-3xl object-contain md:max-w-lg"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 7.5. FEATURE SHOWCASE — Nutrition + Workout + Progress ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight md:mb-6 md:text-5xl">
              {isAr ? "كل أداة محتاجها." : "Every tool you need."}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mb-16 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:text-xl">
              {isAr ? "تغذية مخصصة. تمارين احترافية. تتبع دقيق." : "Personalized nutrition. Professional workouts. Precise tracking."}
            </p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {/* Nutrition */}
            <Reveal>
              <div className="overflow-hidden rounded-3xl bg-white">
                <img src={IMAGES.meal} alt={isAr ? "تغذية" : "Nutrition"} className="aspect-[4/3] w-full object-contain" loading="lazy" />
                <div className="p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{isAr ? "خطط تغذية" : "Nutrition Plans"}</h3>
                  <p className="mt-2 text-sm font-normal text-[#6e6e73]">{isAr ? "مخصصة بالجرام والسعرات والماكروز." : "Personalized to the gram, calories, and macros."}</p>
                </div>
              </div>
            </Reveal>
            {/* Workout */}
            <Reveal delay={100}>
              <div className="overflow-hidden rounded-3xl bg-white">
                <img src={IMAGES.workout} alt={isAr ? "تمارين" : "Workout"} className="aspect-[4/3] w-full object-contain" loading="lazy" />
                <div className="p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{isAr ? "برامج تمارين" : "Workout Programs"}</h3>
                  <p className="mt-2 text-sm font-normal text-[#6e6e73]">{isAr ? "تتكيف مع تقدمك ومستواك." : "Adapt to your progress and level."}</p>
                </div>
              </div>
            </Reveal>
            {/* Progress */}
            <Reveal delay={200}>
              <div className="overflow-hidden rounded-3xl bg-white">
                <img src={IMAGES.progress} alt={isAr ? "تتبع" : "Progress"} className="aspect-[4/3] w-full object-contain" loading="lazy" />
                <div className="p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{isAr ? "تتبع التقدم" : "Progress Tracking"}</h3>
                  <p className="mt-2 text-sm font-normal text-[#6e6e73]">{isAr ? "صور، قياسات، أرقام — كل حاجة في مكان واحد." : "Photos, measurements, data — all in one place."}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== 7.6. RUNNING — full-bleed image ===================== */}
      <section className="relative h-[50vh] w-full overflow-hidden bg-white md:h-[65vh]">
        <img
          src={IMAGES.running}
          alt={isAr ? "كارديو" : "Cardio"}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </section>

      {/* ===================== 8. HOW IT WORKS — Apple-style numbered steps ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "رحلتك في ٤ خطوات." : "Your journey in 4 steps."}
            </h2>
          </Reveal>
          <div className="mt-16 space-y-12 md:mt-20 md:space-y-16">
            {[
              { n: "01", title: isAr ? "أنشئ حسابك" : "Create your account", desc: isAr ? "في ثوانٍ. بالإيميل أو Google." : "In seconds. Email or Google." },
              { n: "02", title: isAr ? "أكمل الاستبيانات" : "Complete questionnaires", desc: isAr ? "أخبرنا عن هدفك، وزنك، عاداتك." : "Tell us your goal, weight, habits." },
              { n: "03", title: isAr ? "EVO يحلل ويخطط" : "EVO analyzes & plans", desc: isAr ? "الكوتش + EVO يولّدون خططك." : "Coach + EVO generate your plans." },
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

      {/* ===================== 9. TESTIMONIALS — 3D Marquee + Apple quotes ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "نتائج حقيقية." : "Real results."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:text-xl">
              {isAr ? "+500 عميل غيّروا حياتهم مع MuscleHub." : "500+ clients transformed their lives with MuscleHub."}
            </p>
          </Reveal>

          {/* 3D Marquee Testimonials */}
          <Reveal delay={300}>
            <div className="relative mt-16 flex h-[500px] w-full items-center justify-center overflow-hidden [perspective:300px]">
              <div
                className="flex flex-row items-center gap-4"
                style={{
                  transform: 'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
                }}
              >
                {/* Column 1 — down */}
                <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">
                  {testimonialsData.map((review) => (
                    <TestimonialCard key={review.username} {...review} isAr={isAr} />
                  ))}
                </Marquee>
                {/* Column 2 — up */}
                <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:40s]">
                  {testimonialsData.map((review) => (
                    <TestimonialCard key={review.username} {...review} isAr={isAr} />
                  ))}
                </Marquee>
                {/* Column 3 — down */}
                <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">
                  {testimonialsData.map((review) => (
                    <TestimonialCard key={review.username} {...review} isAr={isAr} />
                  ))}
                </Marquee>
                {/* Column 4 — up */}
                <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:40s]">
                  {testimonialsData.map((review) => (
                    <TestimonialCard key={review.username} {...review} isAr={isAr} />
                  ))}
                </Marquee>
              </div>

              {/* Gradient overlays */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#f5f5f7]"></div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#f5f5f7]"></div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#f5f5f7]"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#f5f5f7]"></div>
            </div>
          </Reveal>

          {/* Featured large quotes (kept for impact) */}
          <div className="mt-20 space-y-16 md:space-y-20">
            {[
              { name: isAr ? "محمد العشري" : "Mohamed ElAshry", result: isAr ? "-12 كجم في 3 أشهر" : "-12kg in 3 months", text: isAr ? "أحسن كوتش جربته. EVO بيرد على أسئلتي في أي وقت." : "Best coach I've tried. EVO answers my questions anytime." },
              { name: isAr ? "سارة منصور" : "Sara Mansour", result: isAr ? "-2 مقاس في 4 أشهر" : "-2 sizes in 4 months", text: isAr ? "أحمد فهم حالتي وعمللي خطة تناسبني. التتبع خلاني ملتزمة." : "Ahmed understood my situation and made a plan that fits me." },
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

      {/* ===================== 10. PRICING — Apple-style simple ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "استثمر في نفسك." : "Invest in yourself."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:text-xl">
              {isAr ? "باقتين تناسب كل هدف." : "Two plans for every goal."}
            </p>
          </Reveal>
          <div className="mt-16 grid gap-5 md:grid-cols-2 md:gap-6">
            {[
              { name: "Starter", price: "$20", period: isAr ? "/شهر" : "/mo", egp: "≈ 1000 ج.م", features: [isAr ? "2 تبديل يومي" : "2 daily swaps", isAr ? "خطة تغذية + تمارين" : "Nutrition + workout", isAr ? "مساعد EVO" : "EVO AI coach", isAr ? "تتبع تقدم" : "Progress tracking"], highlight: false },
              { name: "Elite", price: "$40", period: isAr ? "/شهر" : "/mo", egp: "≈ 2000 ج.م", features: [isAr ? "تبديلات غير محدودة" : "Unlimited swaps", isAr ? "كوتشينج VIP" : "VIP coaching", isAr ? "استجابة فورية" : "Instant response", isAr ? "أقصى مساءلة" : "Max accountability"], highlight: true },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className={`h-full rounded-3xl p-8 md:p-10 ${p.highlight ? "bg-black text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
                  <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight md:text-5xl">{p.price}</span>
                    <span className="text-base font-normal opacity-60">{p.period}</span>
                  </div>
                  <p className="mt-1 text-sm font-normal opacity-60">{p.egp}{p.period}</p>
                  <ul className="mt-8 space-y-3 text-base font-normal">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("pricing")}
                    className={`mt-8 w-full rounded-full px-6 py-3 text-base font-normal transition-opacity hover:opacity-90 ${p.highlight ? "bg-white text-black" : "bg-[#0071e3] text-white"}`}
                  >
                    {isAr ? "ابدأ الآن" : "Get Started"}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <div className="mt-12 text-center">
              <button onClick={() => navigate("pricing")} className="font-normal text-[#0071e3] transition-opacity hover:opacity-70">
                {isAr ? "كل التفاصيل ›" : "See all details ›"}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 11. FAQ — Apple-style ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "أسئلة شائعة." : "Questions?"}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <Accordion type="single" collapsible className="mt-12">
              {[
                { q: isAr ? "ما هو MuscleHub؟" : "What is MuscleHub?", a: isAr ? "منصة تحسين أداء بشري تجمع بين خبرة الكوتش أحمد زكي ومحرك EVO." : "A human optimization platform combining Coach Ahmed Zake with the EVO AI engine." },
                { q: isAr ? "من هو EVO؟" : "Who is EVO?", a: isAr ? "محرك الأداء الذكي. يحلل بياناتك ويحدّث خططك تلقائياً." : "The intelligent engine. Analyzes your data and updates plans automatically." },
                { q: isAr ? "هل الخطط مخصصة؟" : "Are plans personalized?", a: isAr ? "نعم، كل خطة تُبنى من استبياناتك وتتحدث أسبوعياً." : "Yes, built from your questionnaires, updated weekly." },
                { q: isAr ? "هل الكوتش حقيقي؟" : "Is the coach real?", a: isAr ? "نعم، الكوتش أحمد زكي حقيقي ويراجع خططك بنفسه." : "Yes, Coach Ahmed Zake is real and reviews your plans personally." },
                { q: isAr ? "طرق الدفع؟" : "Payment methods?", a: isAr ? "InstaPay و Vodafone Cash." : "InstaPay and Vodafone Cash." },
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

      {/* ===================== 12. BLOG — Apple-style minimal grid ===================== */}
      {latestPosts.length > 0 && (
        <section className="bg-white px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:mb-16 md:text-5xl">
                {isAr ? "من المدونة." : "From the blog."}
              </h2>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3 md:gap-6">
              {latestPosts.map((post, i) => (
                <Reveal key={post.id} delay={i * 100}>
                  <a
                    href={`${isAr ? "/ar" : ""}/blog/${encodeURIComponent(post.slug)}`}
                    className="group block overflow-hidden rounded-2xl bg-[#f5f5f7]"
                  >
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.cover_alt || post.title}
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-6">
                      <p className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                        {getCategoryLabel(post.category, lang)}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold leading-tight tracking-tight">{post.title}</h3>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm font-normal text-[#6e6e73]">{post.excerpt}</p>
                      )}
                      <p className="mt-4 text-sm font-normal text-[#0071e3]">{isAr ? "اقرأ ›" : "Read ›"}</p>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
            <Reveal delay={400}>
              <div className="mt-12 text-center">
                <a href={blogHref} className="font-normal text-[#0071e3] transition-opacity hover:opacity-70">
                  {isAr ? "كل المقالات ›" : "View all ›"}
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ===================== 12.5. REFERRAL PROGRAM — Earn 20% ===================== */}
      <section className="bg-[#1d1d1f] px-4 py-28 text-white md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
              {isAr ? "اكسب مع MuscleHub." : "Earn with MuscleHub."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-gray-300 md:text-xl">
              {isAr
                ? "ادعي أصدقاؤك واكسب 20% عمولة من كل اشتراك. العمولة تُضاف لرصيدك فور تأكيد الدفع. اسحبها لمحفظتك أو خصمها من اشتراكك."
                : "Invite your friends and earn 20% commission on every subscription. Commission is added to your balance when payment is confirmed. Withdraw to your wallet or apply as subscription discount."}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div>
                <p className="text-4xl font-semibold tracking-tight text-[#0071e3] md:text-5xl">20%</p>
                <p className="mt-2 text-sm font-normal text-gray-400">{isAr ? "عمولة" : "Commission"}</p>
              </div>
              <div>
                <p className="text-4xl font-semibold tracking-tight md:text-5xl">30</p>
                <p className="mt-2 text-sm font-normal text-gray-400">{isAr ? "يوم كوكيز" : "Day cookie"}</p>
              </div>
              <div>
                <p className="text-4xl font-semibold tracking-tight md:text-5xl">$10</p>
                <p className="mt-2 text-sm font-normal text-gray-400">{isAr ? "حد أدنى للسحب" : "Min payout"}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-12">
              <button
                onClick={() => navigate("auth", { mode: "signup" })}
                className="rounded-full bg-[#0071e3] px-8 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "ابدأ الربح الآن" : "Start earning now"}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 13. FINAL CTA — Apple-style ===================== */}
      <section className="bg-white px-4 py-28 text-center md:py-40">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? "جسمك الجديد بيستناك." : "Your new body is waiting."}
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <button
              onClick={() => navigate("auth", { mode: "signup" })}
              className="rounded-full bg-[#0071e3] px-7 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "ابدأ تحوّلي" : "Start my transformation"}
            </button>
            <button
              onClick={() => navigate("pricing")}
              className="font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "الأسعار ›" : "Pricing ›"}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ===================== FOOTER — Apple-style ===================== */}
      <footer className="border-t border-[#d2d2d7] bg-[#f5f5f7] px-4 py-10 text-[#6e6e73]">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">MuscleHub</p>
              <p className="mt-2 text-xs font-normal">{isAr ? "منصة تحسين أداء بشري." : "Human optimization platform."}</p>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "روابط" : "Links"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><button onClick={() => navigate("pricing")} className="hover:underline">{isAr ? "الأسعار" : "Pricing"}</button></li>
                <li><button onClick={() => navigate("about")} className="hover:underline">{isAr ? "من نحن" : "About"}</button></li>
                <li><button onClick={() => navigate("blog")} className="hover:underline">{isAr ? "المدونة" : "Blog"}</button></li>
                <li><button onClick={() => navigate("faq")} className="hover:underline">{isAr ? "أسئلة شائعة" : "FAQ"}</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "قانوني" : "Legal"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><button onClick={() => navigate("privacy")} className="hover:underline">{isAr ? "الخصوصية" : "Privacy"}</button></li>
                <li><button onClick={() => navigate("terms")} className="hover:underline">{isAr ? "الشروط" : "Terms"}</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "تواصل" : "Contact"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li>WhatsApp</li>
                <li>Instagram</li>
                <li>{isAr ? "دعم 24/7" : "24/7 support"}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-[#d2d2d7] pt-6 text-center text-xs">
            © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  );
}
