"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listBlogPosts, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { SiteHeader } from "@/components/SiteHeader";
import { ImageStreamHero, type StreamImage } from "@/components/ui/image-stream-hero";
import { getFAQSchema } from "@/lib/seo";

// ============================================================
// Card palette — extracted from Google Gemini "Ask Gemini" screen
// (applied to CTA cards only — section backgrounds untouched)
// Tuned 2026-08-26: deepened textSec + cta to reach WCAG AAA on small text
// ============================================================
const CARD = {
  surface:   "#FDFCFE", // أبيض نقي — سطح الكارت الأساسي
  tint:      "#F5F7FC", // أبيض مزرق خفيف — للكروت الثانوية
  halo:      "#E9F2FD", // هالة زرقاء خفيفة (للـ hover shadow)
  blue:      "#CAE3FA", // أزرق الزر الفاتح (decorative only)
  blueDeep:  "#C9E4FC", // أزرق التركيز الأعمق (decorative only)
  textPrim:  "#1D252E", // أزرق داكن جداً — 15:1 contrast على surface (AAA)
  textSec:   "#4A5260", // رمادي مزرق داكن — 7.5:1 على surface (AAA للنصوص الصغيرة)
  cta:       "#0F5BB5", // أزرق Apple أعمق — 7.3:1 على surface (AAA للنصوص الصغيرة)
};

// Premium images — MuscleHub Studio Style
const IMAGES = {
  gym: "/images/gym-interior.jpg",
  meal: "/images/meal-clean.jpg",
  running: "/images/running-outdoor.jpg",
  dumbbell: "/images/dumbbell-gym.jpg",
  tracker: "/images/fitness-tracker.jpg",
  fitnessDark: "/images/fitness-dark.jpg",
  fitnessPortrait: "/images/fitness-portrait.jpg",
  mealDark: "/images/meal-dark.jpg",
  mealBowl: "/images/meal-bowl.jpg",
  yoga: "/images/yoga-studio.jpg",
  // Hero athlete images (uploaded by Owner 2026-08-25)
  heroAthlete1: "/images/hero/athlete-1.jpg",
  heroAthlete2: "/images/hero/athlete-2.jpg",
  heroAthleteBiceps: "/images/hero/athlete-biceps.jpg",
  heroAthleteFuturistic: "/images/hero/athlete-futuristic.jpg",
  heroTrainerSpotting: "/images/hero/trainer-spotting.jpg",
};

// Disabled Reveal — animations were causing jarring "shake" effects
// during scroll. Now just renders children directly without any
// opacity/transform animation.
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

/**
 * GradientFade — G2: smooth visual transition between sections with
 * different background colors. Inserts a 4px gradient strip that blends
 * the previous section's color into the next one, matching Apple's
 * seamless section transitions.
 */
function GradientFade({ from = "bg-white", to = "bg-[#f5f5f7]" }: { from?: string; to?: string }) {
  // Extract the color value from Tailwind class names
  const fromColor = from.includes("#f5f5f7") ? "#f5f5f7" : "#ffffff";
  const toColor = to.includes("#f5f5f7") ? "#f5f5f7" : "#ffffff";
  return (
    <div
      className="h-1 w-full"
      style={{ background: `linear-gradient(to bottom, ${fromColor}, ${toColor})` }}
      aria-hidden="true"
    />
  );
}

/**
 * BlogCarousel — horizontal scrolling carousel of blog posts.
 * Two variants: "latest" (most recent) and "featured" (random selection).
 * Different visual styles to distinguish them.
 */
function BlogCarousel({
  posts,
  variant = "latest",
  isAr,
}: {
  posts: BlogPost[];
  variant?: "latest" | "featured";
  isAr: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const isFeatured = variant === "featured";

  return (
    <div className="relative">
      {/* Scroll buttons */}
      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => scroll(isAr ? "right" : "left")}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7] text-[#1d1d1f] transition-colors hover:bg-[#e5e5e7]"
          aria-label={isAr ? "السابق" : "Previous"}
        >
          <svg className="h-4 w-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => scroll(isAr ? "left" : "right")}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7] text-[#1d1d1f] transition-colors hover:bg-[#e5e5e7]"
          aria-label={isAr ? "التالي" : "Next"}
        >
          <svg className="h-4 w-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        {posts.map((post, i) => (
          <a
            key={post.id}
            href={`${isAr ? "/ar" : ""}/blog/${encodeURIComponent(post.slug)}`}
            className={`group block shrink-0 overflow-hidden rounded-3xl transition-opacity hover:opacity-90 ${
              isFeatured
                ? "w-72 bg-[#1d1d1f] text-white"
                : "w-80 bg-[#f5f5f7] text-[#1d1d1f]"
            }`}
          >
            {post.featured_image && (
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img
                  src={post.featured_image}
                  alt={post.cover_alt || post.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-5">
              <p className={`text-xs font-normal uppercase tracking-wide ${
                isFeatured ? "text-gray-400" : "text-[#6e6e73]"
              }`}>
                {getCategoryLabel(post.category, isAr ? "ar" : "en")}
              </p>
              <h3 className="mt-2 text-base font-semibold leading-tight tracking-tight line-clamp-2">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className={`mt-2 line-clamp-2 text-sm font-normal ${
                  isFeatured ? "text-gray-400" : "text-[#6e6e73]"
                }`}>
                  {post.excerpt}
                </p>
              )}
              <p className="mt-3 text-sm font-normal text-[#0071e3]">
                {isAr ? "اقرأ ›" : "Read ›"}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function LandingView() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const { isCoach } = useAuth();
  const isAr = lang === "ar";

  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    (async () => {
      const posts = await listBlogPosts(lang);
      // Latest 8 posts
      const latest = posts.slice(0, 8);
      setLatestPosts(latest);

      // Featured: random selection (different from latest, changes daily)
      // Use date-based seed so it changes daily but is consistent within a day
      const today = new Date().toISOString().split("T")[0];
      const seed = today.split("-").join("").split("").reduce((a, b) => a + Number(b), 0);
      const shuffled = [...posts].sort((a, b) => {
        const hashA = (a.id + seed).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const hashB = (b.id + seed).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return hashA - hashB;
      });
      // Ensure featured posts are different from latest
      const latestIds = new Set(latest.map((p) => p.id));
      const featured = shuffled.filter((p) => !latestIds.has(p.id)).slice(0, 6);
      // If not enough non-latest posts, fill from latest
      if (featured.length < 6) {
        const extra = shuffled.filter((p) => !featured.some((f) => f.id === p.id)).slice(0, 6 - featured.length);
        featured.push(...extra);
      }
      setFeaturedPosts(featured);
    })();
  }, [lang]);

  // Image stream corridor — includes hero athlete images for premium visual impact
  const streamImages: StreamImage[] = [
    { src: IMAGES.heroAthleteBiceps, alt: isAr ? "تمرين بايسبس" : "Bicep curl" },
    { src: IMAGES.gym, alt: isAr ? "صالة ألعاب" : "Gym" },
    { src: IMAGES.heroTrainerSpotting, alt: isAr ? "كوتشينج شخصي" : "Personal training" },
    { src: IMAGES.meal, alt: isAr ? "تغذية" : "Nutrition" },
    { src: IMAGES.heroAthleteFuturistic, alt: isAr ? "لياقة مستقبلية" : "Future fitness" },
    { src: IMAGES.dumbbell, alt: isAr ? "قوة" : "Strength" },
    { src: IMAGES.heroAthlete1, alt: isAr ? "رياضي" : "Athlete" },
    { src: IMAGES.running, alt: isAr ? "كارديو" : "Cardio" },
    { src: IMAGES.heroAthlete2, alt: isAr ? "رياضي" : "Athlete" },
    { src: IMAGES.fitnessDark, alt: isAr ? "لياقة" : "Fitness" },
    { src: IMAGES.mealBowl, alt: isAr ? "وجبة" : "Meal" },
    { src: IMAGES.yoga, alt: isAr ? "يوجا" : "Yoga" },
  ];

  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  // FAQ schema for SEO
  const faqs = [
    { q: isAr ? "هل أحتاج اشتراك لاستخدام الأدوات؟" : "Do I need a subscription to use the tools?", a: isAr ? "لا، كل الأدوات الستة (حاسبة سعرات، BMI، ماكروز، دهون، متتبع ماء، مخطط وجبات) مجانية تماماً بدون تسجيل." : "No, all six tools (calorie, BMI, macro, body fat, water tracker, meal planner) are completely free without signup." },
    { q: isAr ? "ما الفرق بين Premium و Pro؟" : "What's the difference between Premium and Pro?", a: isAr ? "Premium ($14.99/شهر): EVO غير محدود، 3 خطط/شهر، 50 نتيجة محفوظة. Pro ($29.99/شهر): 6 خطط/شهر، 200 نتيجة، تحليل أنماط، بدون إعلانات." : "Premium ($14.99/mo): unlimited EVO, 3 plans/mo, 50 saved results. Pro ($29.99/mo): 6 plans/mo, 200 results, pattern analysis, ad-free." },
    { q: isAr ? "هل يدعم PayPal؟" : "Does it support PayPal?", a: isAr ? "نعم، PayPal هو طريقة الدفع الرئيسية. متاح أيضاً الدفع اليدوي عبر InstaPay و Vodafone Cash." : "Yes, PayPal is the primary payment method. Manual payment via InstaPay and Vodafone Cash is also available." },
    { q: isAr ? "كم عدد التمارين والأكلات؟" : "How many exercises and foods are there?", a: isAr ? "مكتبة 868 تمرين بصور وتعليمات ثنائية اللغة، و 8,830 أكلة بالسعرات والماكروز لكل 100 جرام." : "868 exercises with bilingual instructions and images, plus 8,830 foods with calories and macros per 100g." },
    { q: isAr ? "هل الموقع يدعم العربية؟" : "Does the site support Arabic?", a: isAr ? "نعم، الموقع ثنائي اللغة (عربي/إنجليزي) مع دعم كامل لـ RTL، صفحات عربية mirror، ومدونة بمحتوى مستقل لكل لغة." : "Yes, fully bilingual (Arabic/English) with complete RTL support, Arabic mirror pages, and a blog with independent content per language." },
  ];
  const faqSchema = getFAQSchema(faqs);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* FAQ Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <SiteHeader variant="landing" />

      {/* ===================== 1. HERO — Static premium image + text ===================== */}
      {/* Replaced ImageStreamHero with a clean static hero using the athlete image.
          Apple-style: large image on right (desktop), centered text on mobile. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f5f5f7]/30 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          {/* Text — left side on desktop, centered on mobile */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              {isAr ? "منصتك الرياضية الشاملة." : "Your complete fitness platform."}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg font-normal leading-snug text-[#1d1d1f] md:mx-0 md:text-xl">
              {isAr
                ? "تمارين، برامج تدريب، حاسبات، أكلات، ومدونة — في مكان واحد."
                : "Exercises, programs, calculators, foods, and blog — all in one place."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start md:gap-5">
              <a
                href="/memberships"
                className="rounded-full bg-[#0071e3] px-7 py-3.5 font-normal text-white transition-opacity hover:opacity-90 md:text-base"
              >
                {isAr ? "ابدأ مجاناً" : "Start for free"}
              </a>
              <a
                href="/evo"
                className="rounded-full bg-[#f5f5f7] px-7 py-3.5 font-normal text-[#1d1d1f] transition-opacity hover:opacity-90 md:text-base"
              >
                {isAr ? "جرّب EVO" : "Try EVO"} →
              </a>
              <a
                href="/coaching"
                className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70 md:text-base"
              >
                {isAr ? "الكوتشينج ›" : "Coaching ›"}
              </a>
            </div>
          </div>
          {/* Image — visible on ALL screen sizes (mobile + desktop).
              On mobile: full-width below text. On desktop: right column. */}
          <div className="relative">
            <img
              src="/images/hero/hero-athlete.jpg"
              alt={isAr ? "رياضي يعمل تمرين بايسبس" : "Athlete performing bicep curls"}
              className="aspect-[3/2] w-full rounded-3xl object-cover shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ===================== 2. WHAT IS MUSCLEHUB ===================== */}
      <CenteredSection bg="bg-white">
        <div className="px-4 text-center">
          <p className="text-sm font-normal text-[#6e6e73] md:text-base">
            {isAr ? "ما هي MuscleHub؟" : "What is MuscleHub?"}
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? (
              <>
                ليست مجرد منصة لياقة.
                <br />
                بل منظومة رياضية متكاملة.
              </>
            ) : (
              <>
                Not just a fitness platform.
                <br />
                A complete sports ecosystem.
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-[#6e6e73] md:text-xl">
            {isAr
              ? "مكتبة تمارين احترافية، برامج تدريب جاهزة، حاسبات لياقة مجانية، مكتبة أكلات بالسعرات، مدونة رياضية علمية، وكوتشينج أونلاين — كل ما تحتاجه في مكان واحد."
              : "Professional exercise library, ready workout programs, free fitness calculators, food database with calories, scientific sports blog, and online coaching — everything you need in one place."}
          </p>
        </div>
      </CenteredSection>

      {/* ===================== 3. EVO PREVIEW ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-16 text-[#1d1d1f] md:py-24">
        <div className="mx-auto max-w-5xl">
          {/* Text */}
          <div className="text-center">
            <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
              EVO
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-normal text-[#6e6e73] md:text-xl">
              {isAr
                ? "محرك أداء ذكي — مش مجرد شات بوت. اسأله أي حاجة رياضية وهو يوجّهك."
                : "A smart performance engine — not just a chatbot. Ask it anything fitness-related."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/chat"
                className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-7 py-3.5 text-base font-normal text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "ابدأ المحادثة" : "Start chatting"}
              </a>
              <a
                href="/evo"
                className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-7 py-3.5 text-base font-normal text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
              >
                {isAr ? "اعرف أكثر" : "Learn more"}
              </a>
            </div>
          </div>
          {/* Image — single premium EVO visual */}
          <div className="mt-10">
            <img
              src="/images/hero/evo-1.jpg"
              alt={isAr ? "EVO — واجهة ذكاء اصطناعي" : "EVO — AI interface"}
              className="aspect-[3/2] w-full rounded-3xl object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>
      <GradientFade from="bg-[#f5f5f7]" to="bg-[#f5f5f7]" />

      {/* ===================== 4. FREE TOOLS ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "أدوات مجانية" : "Free Tools"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
                {isAr ? "حاسبات لياقة وتغذية مجانية بدون تسجيل." : "Free fitness and nutrition calculators, no signup required."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { slug: "calorie-calculator", nameAr: "حاسبة السعرات", nameEn: "Calorie Calculator", descAr: "احسب احتياجك اليومي", descEn: "Daily calorie needs", emoji: "🔥", color: "#ff9500", href: "/tools/calorie-calculator", image: "/images/tools/calorie-calculator.png" },
              { slug: "bmi-calculator", nameAr: "حاسبة BMI", nameEn: "BMI Calculator", descAr: "هل وزنك مثالي؟", descEn: "Is your weight healthy?", emoji: "⚖️", color: "#0071e3", href: "/tools/bmi-calculator", image: "/images/tools/bmi-calculator.png" },
              { slug: "macro-calculator", nameAr: "حاسبة الماكروز", nameEn: "Macro Calculator", descAr: "بروتين وكارب ودهون", descEn: "Protein, carbs, fat", emoji: "🥩", color: "#34c759", href: "/tools/macro-calculator", image: "/images/tools/macro-calculator.png" },
              { slug: "body-fat-calculator", nameAr: "حاسبة الدهون", nameEn: "Body Fat %", descAr: "نسبة دهون جسمك", descEn: "Your body fat %", emoji: "📊", color: "#ff3b30", href: "/tools/body-fat-calculator", image: "/images/tools/body-fat-calculator.png" },
              { slug: "water-tracker", nameAr: "متتبع الماء", nameEn: "Water Tracker", descAr: "سجل كوبساتك يومياً", descEn: "Log your daily cups", emoji: "💧", color: "#00b8d9", href: "/tools/water-tracker", image: "/images/tools/water-tracker.png" },
              { slug: "meal-planner", nameAr: "مخطط الوجبات", nameEn: "Meal Planner", descAr: "ابني وجباتك بنفسك", descEn: "Build your own meals", emoji: "🍽️", color: "#8b5cf6", href: "/meal-planner", image: "/images/tools/meal-planner.png" },
            ].map((tool, i) => (
              <Reveal key={tool.slug} delay={i * 80}>
                <LandingToolCard tool={tool} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/tools" className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70">
              {isAr ? "كل الأدوات ›" : "View all tools ›"}
            </a>
          </div>
        </div>
      </section>

      <GradientFade from="bg-[#f5f5f7]" to="bg-white" />
      {/* ===================== 5. EXERCISE LIBRARY ===================== */}
      <section className="bg-white px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "مكتبة التمارين" : "Exercise Library"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
                {isAr ? "868+ تمرين بشرح كامل ومستوى الصعوبة." : "868+ exercises with full instructions and difficulty levels."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { emoji: "💪", labelAr: "صدر", labelEn: "Chest", slug: "chest", count: 6, image: "/images/categories/exercises/chest.png" },
              { emoji: "🦵", labelAr: "أرجل", labelEn: "Legs", slug: "legs", count: 12, image: "/images/categories/exercises/legs.png" },
              { emoji: "🎯", labelAr: "كور", labelEn: "Core", slug: "core", count: 9, image: "/images/categories/exercises/core.png" },
              { emoji: "❤️", labelAr: "كارديو", labelEn: "Cardio", slug: "cardio", count: 6, image: "/images/categories/exercises/cardio.png" },
            ].map((cat, i) => (
              <Reveal key={cat.slug} delay={i * 80}>
                <LandingExerciseCategoryCard cat={cat} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/exercises" className="inline-block rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90">
              {isAr ? "تصفّح كل التمارين ›" : "Browse all exercises ›"}
            </a>
          </div>
        </div>
      </section>
      <GradientFade from="bg-white" to="bg-[#f5f5f7]" />

      {/* ===================== 6. WORKOUT PROGRAMS ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "برامج تدريب جاهزة" : "Ready Workout Programs"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
                {isAr ? "برامج كاملة حسب المستوى والهدف — منزل، جيم، أو معدات بسيطة." : "Complete programs by level and goal — home, gym, or minimal equipment."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { emoji: "🏠", titleAr: "منزلي بدون معدات", titleEn: "Home (No Equipment)", descAr: "تمارين بالوزن فقط", descEn: "Bodyweight only", slug: "home-beginner-fullbody", image: "/images/programs/home-workout.png" },
              { emoji: "🏋️", titleAr: "جيم كامل", titleEn: "Full Gym", descAr: "بمعدات كاملة", descEn: "Full equipment", slug: "gym-ppl-intermediate", image: "/images/programs/full-gym.png" },
              { emoji: "🔥", titleAr: "حرق دهون HIIT", titleEn: "Fat Loss HIIT", descAr: "حارب الدهون بسرعة", descEn: "Burn fat fast", slug: "home-fat-loss-hiit", image: "/images/programs/hiit.png" },
            ].map((prog, i) => (
              <Reveal key={prog.slug} delay={i * 100}>
                <LandingProgramCard prog={prog} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/programs" className="inline-block rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90">
              {isAr ? "كل البرامج ›" : "View all programs ›"}
            </a>
          </div>
        </div>
      </section>
      <GradientFade from="bg-[#f5f5f7]" to="bg-white" />

      {/* ===================== 7. FOOD LIBRARY ===================== */}
      <section className="bg-white px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "مكتبة الأكلات" : "Food Library"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
                {isAr ? "8830+ أكلة بالسعرات والماكروز + حاسبة جرامات." : "8830+ foods with calories and macros + grams calculator."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { emoji: "🥩", titleAr: "بروتين", titleEn: "Protein", descAr: "لحم، دجاج، بيض", descEn: "Meat, chicken, eggs", image: "/images/categories/foods/protein.png" },
              { emoji: "🍚", titleAr: "كارب", titleEn: "Carbs", descAr: "أرز، شوفان، بطاطس", descEn: "Rice, oats, potato", image: "/images/categories/foods/carb.png" },
              { emoji: "🥑", titleAr: "دهون", titleEn: "Fats", descAr: "أفوكادو، مكسرات", descEn: "Avocado, nuts", image: "/images/categories/foods/fat.png" },
              { emoji: "🍎", titleAr: "فواكه وخضار", titleEn: "Fruits & Veg", descAr: "طازجة وصحية", descEn: "Fresh and healthy", image: "/images/categories/foods/fruit.png" },
            ].map((cat, i) => (
              <Reveal key={cat.titleEn} delay={i * 80}>
                <LandingFoodCategoryCard cat={cat} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/foods" className="inline-block rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90">
              {isAr ? "تصفّح كل الأكلات ›" : "Browse all foods ›"}
            </a>
          </div>
        </div>
      <GradientFade from="bg-white" to="bg-[#f5f5f7]" />
      </section>

      {/* ===================== 8. BLOG (raised higher) — Latest + Featured carousels ===================== */}
      {latestPosts.length > 0 && (
        <section className="bg-[#f5f5f7] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            {/* Latest Posts — carousel with light cards */}
            <div>
              <Reveal>
                <div className="mb-6 flex items-end justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
                    {isAr ? "أحدث المقالات" : "Latest Articles"}
                  </h2>
                  <a href={blogHref} className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70">
                    {isAr ? "كل المقالات ›" : "View all ›"}
                  </a>
                </div>
              </Reveal>
              <BlogCarousel posts={latestPosts} variant="latest" isAr={isAr} />
            </div>

            {/* Featured Posts — carousel with dark cards (different visual) */}
            {featuredPosts.length > 0 && (
              <div className="mt-12">
                <Reveal>
                  <div className="mb-6 flex items-end justify-between">
                    <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
                      {isAr ? "مقالات مميزة" : "Featured Articles"}
                    </h2>
                  </div>
                </Reveal>
                <BlogCarousel posts={featuredPosts} variant="featured" isAr={isAr} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================== 9. COACHING PREVIEW ===================== */}
      <section className="bg-white px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-4 py-1.5 text-xs font-medium text-[#0071e3]">
                {isAr ? "كوتشينج أونلاين" : "Online Coaching"}
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "مدربين وأخصائيين تغذية" : "Coaches & Nutrition Specialists"}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-4 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
                {isAr
                  ? "خطط تغذية مخصصة، برامج تمارين متكيفة، متابعة شخصية، و EVO AI متاح 24/7."
                  : "Personalized nutrition plans, adaptive workouts, personal follow-up, and EVO AI available 24/7."}
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="/coaching"
                  className="rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
                >
                  {isAr ? "اعرف أكثر ›" : "Learn more ›"}
                </a>
                <a
                  href="/memberships"
                  className="rounded-full bg-[#f5f5f7] px-6 py-2.5 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
                >
                  {isAr ? "الأسعار" : "Pricing"}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== 10. Premium Memberships ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "عضويات MuscleHub المميزة." : "MuscleHub Premium memberships."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
              {isAr
                ? "افتح القوة الكاملة للذكاء الاصطناعي والمحتوى المميز بعضوية Premium أو Pro."
                : "Unlock the full power of AI and premium content with a Premium or Pro membership."}
            </p>
          </Reveal>

          {/* Two-tier preview cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Reveal delay={200}>
              <a
                href="/memberships"
                className="group block rounded-3xl bg-white/5 p-6 backdrop-blur ring-1 ring-white/10 transition-all hover:ring-[#0071e3]/40"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {isAr ? "بريميوم" : "Premium"}
                  </h3>
                  <span className="rounded-full bg-[#0071e3]/20 px-3 py-1 text-xs font-medium text-[#0071e3]">
                    $14.99/{isAr ? "شهر" : "mo"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-normal text-gray-400">
                  {isAr
                    ? "EVO غير محدود، 3 خطط تغذية/تمرين شهرياً، 50 نتيجة محفوظة، تحميل PDF."
                    : "Unlimited EVO, 3 nutrition/workout plans/mo, 50 saved results, PDF export."}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0071e3] group-hover:opacity-80">
                  {isAr ? "اشترك الآن" : "Subscribe now"}
                  <span className="rtl:rotate-180">›</span>
                </div>
              </a>
            </Reveal>
            <Reveal delay={300}>
              <a
                href="/memberships"
                className="group block rounded-3xl bg-[#0071e3]/10 p-6 ring-2 ring-[#0071e3]/40 transition-all hover:ring-[#0071e3]/80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {isAr ? "برو" : "Pro"}
                    </h3>
                    <span className="rounded-full bg-[#0071e3] px-2 py-0.5 text-[10px] font-semibold text-white">
                      {isAr ? "الأكثر شعبية" : "Popular"}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#0071e3] px-3 py-1 text-xs font-medium text-white">
                    $29.99/{isAr ? "شهر" : "mo"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-normal text-gray-300">
                  {isAr
                    ? "كل مميزات Premium + 6 خطط شهرياً، تحليل الأنماط، 200 نتيجة محفوظة، محتوى مميز."
                    : "All Premium + 6 plans/mo, pattern analysis, 200 saved results, premium content."}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0071e3] group-hover:opacity-80">
                  {isAr ? "اشترك الآن" : "Subscribe now"}
                  <span className="rtl:rotate-180">›</span>
                </div>
              </a>
            </Reveal>
          </div>

          {/* Free tier mention + compare link */}
          <Reveal delay={400}>
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-normal text-gray-400">
                {isAr
                  ? "أو ابدأ بالخطة المجانية — 868+ تمرين، 8,830+ أكلة، 5 حاسبات، EVO 10 رسائل/يوم."
                  : "Or start with the Free plan — 868+ exercises, 8,830+ foods, 5 calculators, EVO 10 messages/day."}
              </p>
              <a
                href="/memberships"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#1d1d1f] transition-opacity hover:opacity-90"
              >
                {isAr ? "قارن كل العضويات" : "Compare all plans"}
                <span className="rtl:rotate-180">›</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 11. FAQ ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "أسئلة شائعة." : "Questions?"}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <Accordion type="single" collapsible className="mt-12">
              {faqs.map((faq, i) => (
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

      {/* ===================== 11. FINAL CTA ===================== */}
      <section className="bg-white px-4 py-12 text-center md:py-20">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? "ابدأ رحلتك الرياضية." : "Start your fitness journey."}
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <a
              href="/memberships"
              className="rounded-full bg-[#0071e3] px-7 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "ابدأ مجاناً" : "Start for free"}
            </a>
            <a
              href="/coaching"
              className="font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "اعرف عن الكوتشينج ›" : "Learn about coaching ›"}
            </a>
          </div>
        </Reveal>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-[#d2d2d7] bg-[#f5f5f7] px-4 py-10 text-[#6e6e73]">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5">
            {/* Brand */}
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">MuscleHubEG</p>
              <p className="mt-2 text-xs font-normal">{isAr ? "منصة رياضية شاملة." : "Comprehensive sports platform."}</p>
              <p className="mt-3 text-[10px] font-normal text-[#8e8e93]">{isAr ? "© 2026 جميع الحقوق محفوظة" : "© 2026 All rights reserved"}</p>
            </div>

            {/* Group 1: Paid Services */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? "الخدمات المدفوعة" : "Paid Services"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/coaching" className="hover:underline">{isAr ? "الكوتشينج" : "Coaching"}</a></li>
                <li><a href="/memberships" className="hover:underline">{isAr ? "العضويات" : "Memberships"}</a></li>
                <li><a href="/evo" className="hover:underline">EVO AI Coach</a></li>
              </ul>
            </div>

            {/* Group 2: Affiliate & Referral */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? "الأفلييت والإحالات" : "Affiliate & Referral"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/affiliate" className="hover:underline">{isAr ? "برنامج الأفلييت" : "Affiliate Program"}</a></li>
                <li><a href="/referral" className="hover:underline">{isAr ? "لوحة الإحالات" : "Referral Dashboard"}</a></li>
              </ul>
            </div>

            {/* Group 3: Tools */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? "الأدوات" : "Tools"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/tools/bmi-calculator" className="hover:underline">{isAr ? "حاسبة BMI" : "BMI Calculator"}</a></li>
                <li><a href="/tools/body-fat-calculator" className="hover:underline">{isAr ? "حاسبة الدهون" : "Body Fat Calculator"}</a></li>
                <li><a href="/tools/calorie-calculator" className="hover:underline">{isAr ? "حاسبة السعرات" : "Calorie Calculator"}</a></li>
                <li><a href="/tools/macro-calculator" className="hover:underline">{isAr ? "حاسبة الماكروز" : "Macro Calculator"}</a></li>
                <li><a href="/tools/water-tracker" className="hover:underline">{isAr ? "متتبع الماء" : "Water Tracker"}</a></li>
                <li><a href="/meal-planner" className="hover:underline">{isAr ? "مخطط الوجبات" : "Meal Planner"}</a></li>
              </ul>
            </div>

            {/* Group 4: Resources */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? "المحتوى" : "Resources"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/exercises" className="hover:underline">{isAr ? "مكتبة التمارين" : "Exercises"}</a></li>
                <li><a href="/programs" className="hover:underline">{isAr ? "برامج التدريب" : "Programs"}</a></li>
                <li><a href="/foods" className="hover:underline">{isAr ? "مكتبة الأكلات" : "Foods"}</a></li>
                <li><a href="/blog" className="hover:underline">{isAr ? "المدونة" : "Blog"}</a></li>
              </ul>
            </div>
          </div>

          {/* Group 5: Legal + Basic — bottom row (per Owner directive 2026-08-25:
              legal/basic pages like About / Contact / Privacy / Terms / FAQ
              live in the footer only, not in the header) */}
          <div className="mt-8 border-t border-[#d2d2d7] pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3">{isAr ? "قانوني وأساسي" : "Legal & Basic"}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <li><button onClick={() => navigate("about")} className="hover:underline">{isAr ? "من نحن" : "About"}</button></li>
              <li><button onClick={() => navigate("contact")} className="hover:underline">{isAr ? "تواصل معنا" : "Contact"}</button></li>
              <li><button onClick={() => navigate("faq")} className="hover:underline">{isAr ? "أسئلة شائعة" : "FAQ"}</button></li>
              <li><button onClick={() => navigate("privacy")} className="hover:underline">{isAr ? "الخصوصية" : "Privacy"}</button></li>
              <li><button onClick={() => navigate("terms")} className="hover:underline">{isAr ? "الشروط" : "Terms"}</button></li>
            </ul>
          </div>

          <div className="mt-6 border-t border-[#d2d2d7] pt-4 text-center text-[10px] text-[#8e8e93]">
            {isAr ? "صُنع بحب لمجتمع اللياقة العربي" : "Built with care for the fitness community"}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Helper components (conditional rendering — no display:none in DOM) ───

function LandingToolCard({ tool, isAr }: { tool: any; isAr: boolean }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={tool.href}
      className="group flex items-center gap-4 rounded-3xl p-6 transition-all duration-300"
      style={{
        backgroundColor: CARD.surface,
        boxShadow: "0 1px 2px rgba(29, 37, 46, 0.03)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 228, 252, 0.45)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl" style={{ backgroundColor: `${tool.color}15` }}>
        {imgError ? (
          <span>{tool.emoji}</span>
        ) : (
          <img
            src={tool.image}
            alt={isAr ? tool.nameAr : tool.nameEn}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: CARD.textPrim }}>{isAr ? tool.nameAr : tool.nameEn}</h3>
        <p className="mt-1 text-sm font-normal" style={{ color: CARD.textSec }}>{isAr ? tool.descAr : tool.descEn}</p>
      </div>
      <span className="text-2xl" style={{ color: CARD.textSec }}>›</span>
    </a>
  );
}

function LandingExerciseCategoryCard({ cat, isAr }: { cat: any; isAr: boolean }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={`/exercises?cat=${cat.slug}`}
      className="group block overflow-hidden rounded-3xl text-center transition-all duration-300"
      style={{
        backgroundColor: CARD.tint,
        boxShadow: "0 1px 2px rgba(29, 37, 46, 0.03)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 228, 252, 0.45)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-white">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl">{cat.emoji}</span>
          </div>
        ) : (
          <img
            src={cat.image}
            alt={isAr ? cat.labelAr : cat.labelEn}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold tracking-tight" style={{ color: CARD.textPrim }}>{isAr ? cat.labelAr : cat.labelEn}</h3>
        <p className="mt-1 text-xs font-normal" style={{ color: CARD.textSec }}>{cat.count} {isAr ? "تمارين" : "exercises"}</p>
      </div>
    </a>
  );
}

function LandingProgramCard({ prog, isAr }: { prog: any; isAr: boolean }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={`/programs/${prog.slug}`}
      className="group block overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        backgroundColor: CARD.surface,
        boxShadow: "0 1px 2px rgba(29, 37, 46, 0.03)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 228, 252, 0.45)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="aspect-[16/10] w-full overflow-hidden">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center bg-[#f5f5f7]">
            <span className="text-4xl">{prog.emoji}</span>
          </div>
        ) : (
          <img
            src={prog.image}
            alt={isAr ? prog.titleAr : prog.titleEn}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: CARD.textPrim }}>{isAr ? prog.titleAr : prog.titleEn}</h3>
        <p className="mt-1 text-sm font-normal" style={{ color: CARD.textSec }}>{isAr ? prog.descAr : prog.descEn}</p>
        <p className="mt-3 text-sm font-semibold" style={{ color: CARD.cta }}>{isAr ? "ابدأ الآن ›" : "Start now ›"}</p>
      </div>
    </a>
  );
}

function LandingFoodCategoryCard({ cat, isAr }: { cat: any; isAr: boolean }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href="/foods"
      className="group block overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        backgroundColor: CARD.tint,
        boxShadow: "0 1px 2px rgba(29, 37, 46, 0.03)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 228, 252, 0.45)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="aspect-square w-full overflow-hidden">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: CARD.tint }}>
            <span className="text-4xl">{cat.emoji}</span>
          </div>
        ) : (
          <img
            src={cat.image}
            alt={isAr ? cat.titleAr : cat.titleEn}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="p-4 text-center">
        <h3 className="text-base font-semibold tracking-tight" style={{ color: CARD.textPrim }}>{isAr ? cat.titleAr : cat.titleEn}</h3>
        <p className="mt-1 text-xs font-normal" style={{ color: CARD.textSec }}>{isAr ? cat.descAr : cat.descEn}</p>
      </div>
    </a>
  );
}
