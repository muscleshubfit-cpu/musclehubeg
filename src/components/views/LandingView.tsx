"use client";

import { useState, useEffect, useRef } from "react";
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
import { ImageStreamHero, type StreamImage } from "@/components/ui/image-stream-hero";
import { getFAQSchema } from "@/lib/seo";

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
};

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

  // Image stream corridor
  const streamImages: StreamImage[] = [
    { src: IMAGES.gym, alt: isAr ? "صالة ألعاب" : "Gym" },
    { src: IMAGES.meal, alt: isAr ? "تغذية" : "Nutrition" },
    { src: IMAGES.dumbbell, alt: isAr ? "قوة" : "Strength" },
    { src: IMAGES.running, alt: isAr ? "كارديو" : "Cardio" },
    { src: IMAGES.tracker, alt: isAr ? "تتبع" : "Tracking" },
    { src: IMAGES.fitnessDark, alt: isAr ? "لياقة" : "Fitness" },
    { src: IMAGES.fitnessPortrait, alt: isAr ? "تمرين" : "Workout" },
    { src: IMAGES.mealDark, alt: isAr ? "طعام صحي" : "Healthy food" },
    { src: IMAGES.mealBowl, alt: isAr ? "وجبة" : "Meal" },
    { src: IMAGES.yoga, alt: isAr ? "يوجا" : "Yoga" },
  ];

  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  // FAQ schema for SEO
  const faqs = [
    { q: isAr ? "ما هي MuscleHub؟" : "What is MuscleHub?", a: isAr ? "منصة رياضية شاملة تقدم مكتبة تمارين، برامج تدريب، حاسبات لياقة، مكتبة أكلات، ومدونة رياضية." : "A comprehensive sports platform offering exercise library, workout programs, fitness calculators, food database, and a sports blog." },
    { q: isAr ? "هل الأدوات مجانية؟" : "Are the tools free?", a: isAr ? "نعم، كل الأدوات (حاسبة سعرات، BMI، ماكروز، دهون) مجانية بدون تسجيل." : "Yes, all tools (calorie, BMI, macro, body fat calculators) are free without signup." },
    { q: isAr ? "ما هو EVO؟" : "What is EVO?", a: isAr ? "EVO محرك أداء ذكي — مش مجرد شات بوت. يحلل بياناتك ويوجّهك للمحتوى المناسب." : "EVO is a smart performance engine — not just a chatbot. It analyzes your data and guides you to relevant content." },
    { q: isAr ? "هل الكوتشينج متاح؟" : "Is coaching available?", a: isAr ? "نعم، عندنا كوتشينج أونلاين مع مدربين وأخصائيين تغذية محترفين." : "Yes, we offer online coaching with professional coaches and nutrition specialists." },
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

      {/* ===================== 1. HERO — Image Stream Corridor ===================== */}
      <ImageStreamHero
        images={streamImages}
        cards={9}
        speed={18}
        axis={55}
        path={{ cardWidth: 22, cardHeight: 30, cardRadius: 0.6 }}
        className="h-[70vh] w-full bg-white"
      >
        <div className="relative z-10 flex flex-col items-center justify-start px-4 pt-20 text-center md:pt-24">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? "منصتك الرياضية الشاملة." : "Your complete fitness platform."}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg font-normal leading-snug text-[#1d1d1f] md:text-xl">
            {isAr
              ? "تمارين، برامج تدريب، حاسبات، أكلات، ومدونة — في مكان واحد."
              : "Exercises, programs, calculators, foods, and blog — all in one place."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm md:gap-5">
            <a
              href="/tools"
              className="rounded-full bg-[#0071e3] px-5 py-2 font-normal text-white transition-opacity hover:opacity-90 md:px-6 md:py-2.5 md:text-base"
            >
              {isAr ? "ابدأ مجاناً" : "Start for free"}
            </a>
            <a
              href="/evo"
              className="rounded-full bg-white/90 px-5 py-2 font-normal text-[#1d1d1f] backdrop-blur transition-opacity hover:opacity-90 md:px-6 md:py-2.5 md:text-base"
            >
              {isAr ? "جرّب EVO" : "Try EVO"}
            </a>
            <a
              href="/coaching"
              className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70 md:text-base"
            >
              {isAr ? "الكوتشينج ›" : "Coaching ›"}
            </a>
          </div>
        </div>
      </ImageStreamHero>

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
      <section className="bg-[#1d1d1f] px-4 py-16 text-white md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <img
            src="/images/evo-standalone.jpg"
            alt="EVO"
            className="mx-auto h-20 w-20 rounded-2xl object-cover"
          />
          <h2 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
            EVO
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lg font-normal text-gray-400 md:text-xl">
            {isAr
              ? "محرك أداء ذكي — مش مجرد شات بوت. اسأله أي حاجة رياضية وهو يوجّهك."
              : "A smart performance engine — not just a chatbot. Ask it anything fitness-related."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
            >
              <img src="/images/evo-standalone.jpg" alt="EVO" className="h-6 w-6 rounded-full object-cover" />
              {isAr ? "ابدأ المحادثة" : "Start chatting"}
            </a>
            <a
              href="/evo"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-normal text-white transition-colors hover:bg-white/10"
            >
              {isAr ? "اعرف أكثر" : "Learn more"}
            </a>
          </div>
        </div>
      </section>

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
              { slug: "calorie-calculator", nameAr: "حاسبة السعرات", nameEn: "Calorie Calculator", descAr: "احسب احتياجك اليومي", descEn: "Daily calorie needs", emoji: "🔥", color: "#ff9500" },
              { slug: "bmi-calculator", nameAr: "حاسبة BMI", nameEn: "BMI Calculator", descAr: "هل وزنك مثالي؟", descEn: "Is your weight healthy?", emoji: "⚖️", color: "#0071e3" },
              { slug: "macro-calculator", nameAr: "حاسبة الماكروز", nameEn: "Macro Calculator", descAr: "بروتين وكارب ودهون", descEn: "Protein, carbs, fat", emoji: "🥩", color: "#34c759" },
              { slug: "body-fat-calculator", nameAr: "حاسبة الدهون", nameEn: "Body Fat %", descAr: "نسبة دهون جسمك", descEn: "Your body fat %", emoji: "📊", color: "#ff3b30" },
            ].map((tool, i) => (
              <Reveal key={tool.slug} delay={i * 80}>
                <a
                  href={`/tools/${tool.slug}`}
                  className="group flex items-center gap-4 rounded-3xl bg-white p-6 transition-opacity hover:opacity-90"
                >
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: `${tool.color}15` }}>
                    {tool.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold tracking-tight">{isAr ? tool.nameAr : tool.nameEn}</h3>
                    <p className="mt-1 text-sm font-normal text-[#6e6e73]">{isAr ? tool.descAr : tool.descEn}</p>
                  </div>
                  <span className="text-2xl text-[#6e6e73]">›</span>
                </a>
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
                {isAr ? "55+ تمرين بشرح كامل ومستوى الصعوبة." : "55+ exercises with full instructions and difficulty levels."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { emoji: "💪", labelAr: "صدر", labelEn: "Chest", slug: "chest", count: 6 },
              { emoji: "🦵", labelAr: "أرجل", labelEn: "Legs", slug: "legs", count: 12 },
              { emoji: "🎯", labelAr: "كور", labelEn: "Core", slug: "core", count: 9 },
              { emoji: "❤️", labelAr: "كارديو", labelEn: "Cardio", slug: "cardio", count: 6 },
            ].map((cat, i) => (
              <Reveal key={cat.slug} delay={i * 80}>
                <a
                  href={`/exercises?cat=${cat.slug}`}
                  className="group block rounded-3xl bg-[#f5f5f7] p-6 text-center transition-opacity hover:opacity-90"
                >
                  <span className="text-4xl">{cat.emoji}</span>
                  <h3 className="mt-3 text-base font-semibold tracking-tight">{isAr ? cat.labelAr : cat.labelEn}</h3>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">{cat.count} {isAr ? "تمارين" : "exercises"}</p>
                </a>
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
              { emoji: "🏠", titleAr: "منزلي بدون معدات", titleEn: "Home (No Equipment)", descAr: "تمارين بالوزن فقط", descEn: "Bodyweight only", slug: "home-beginner-fullbody" },
              { emoji: "🏋️", titleAr: "جيم كامل", titleEn: "Full Gym", descAr: "بمعدات كاملة", descEn: "Full equipment", slug: "gym-ppl-intermediate" },
              { emoji: "🔥", titleAr: "حرق دهون HIIT", titleEn: "Fat Loss HIIT", descAr: "حارب الدهون بسرعة", descEn: "Burn fat fast", slug: "home-fat-loss-hiit" },
            ].map((prog, i) => (
              <Reveal key={prog.slug} delay={i * 100}>
                <a
                  href={`/programs/${prog.slug}`}
                  className="group block rounded-3xl bg-white p-6 transition-opacity hover:opacity-90"
                >
                  <span className="text-4xl">{prog.emoji}</span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">{isAr ? prog.titleAr : prog.titleEn}</h3>
                  <p className="mt-1 text-sm font-normal text-[#6e6e73]">{isAr ? prog.descAr : prog.descEn}</p>
                  <p className="mt-3 text-sm font-normal text-[#0071e3]">{isAr ? "ابدأ الآن ›" : "Start now ›"}</p>
                </a>
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
                {isAr ? "80+ أكلة بالسعرات والماكروز + حاسبة جرامات." : "80+ foods with calories and macros + grams calculator."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { emoji: "🥩", titleAr: "بروتين", titleEn: "Protein", descAr: "لحم، دجاج، بيض", descEn: "Meat, chicken, eggs" },
              { emoji: "🍚", titleAr: "كارب", titleEn: "Carbs", descAr: "أرز، شوفان، بطاطس", descEn: "Rice, oats, potato" },
              { emoji: "🥑", titleAr: "دهون", titleEn: "Fats", descAr: "أفوكادو، مكسرات", descEn: "Avocado, nuts" },
              { emoji: "🍎", titleAr: "فواكه وخضار", titleEn: "Fruits & Veg", descAr: "طازجة وصحية", descEn: "Fresh and healthy" },
            ].map((cat, i) => (
              <Reveal key={cat.titleEn} delay={i * 80}>
                <a
                  href="/foods"
                  className="group block rounded-3xl bg-[#f5f5f7] p-6 text-center transition-opacity hover:opacity-90"
                >
                  <span className="text-4xl">{cat.emoji}</span>
                  <h3 className="mt-3 text-base font-semibold tracking-tight">{isAr ? cat.titleAr : cat.titleEn}</h3>
                  <p className="mt-1 text-xs font-normal text-[#6e6e73]">{isAr ? cat.descAr : cat.descEn}</p>
                </a>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/foods" className="inline-block rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90">
              {isAr ? "تصفّح كل الأكلات ›" : "Browse all foods ›"}
            </a>
          </div>
        </div>
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
                  href="/pricing"
                  className="rounded-full bg-[#f5f5f7] px-6 py-2.5 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
                >
                  {isAr ? "الأسعار" : "Pricing"}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== 10. FAQ ===================== */}
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
              href="/tools"
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
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">MuscleHub</p>
              <p className="mt-2 text-xs font-normal">{isAr ? "منصة رياضية شاملة." : "Comprehensive sports platform."}</p>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "روابط" : "Links"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/exercises" className="hover:underline">{isAr ? "التمارين" : "Exercises"}</a></li>
                <li><a href="/programs" className="hover:underline">{isAr ? "البرامج" : "Programs"}</a></li>
                <li><a href="/foods" className="hover:underline">{isAr ? "الأكلات" : "Foods"}</a></li>
                <li><a href="/tools" className="hover:underline">{isAr ? "الأدوات" : "Tools"}</a></li>
                <li><a href="/evo" className="hover:underline">EVO</a></li>
                <li><a href="/blog" className="hover:underline">{isAr ? "المدونة" : "Blog"}</a></li>
                <li><a href="/coaching" className="hover:underline">{isAr ? "الكوتشينج" : "Coaching"}</a></li>
                <li><a href="/pricing" className="hover:underline">{isAr ? "الأسعار" : "Pricing"}</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "قانوني" : "Legal"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><button onClick={() => navigate("privacy")} className="hover:underline">{isAr ? "الخصوصية" : "Privacy"}</button></li>
                <li><button onClick={() => navigate("terms")} className="hover:underline">{isAr ? "الشروط" : "Terms"}</button></li>
                <li><button onClick={() => navigate("about")} className="hover:underline">{isAr ? "من نحن" : "About"}</button></li>
                <li><button onClick={() => navigate("faq")} className="hover:underline">{isAr ? "أسئلة شائعة" : "FAQ"}</button></li>
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
