"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listBlogPosts, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { EXERCISES } from "@/lib/exercises";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getFAQSchema } from "@/lib/seo";
import Image from "next/image";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { openEvoFloatingChat } from "@/lib/evo-chat-context";
import {
  Bot,
  BookOpen,
  Briefcase,
  Calculator,
  Check,
  CircleHelp,
  ClipboardList,
  Crown,
  Dumbbell,
  LineChart,
  Megaphone,
  Salad,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================
// Site palette — Gemini-card palette extended to all landing sections
// All tokens meet WCAG AAA (≥7:1) on their intended backgrounds
// ============================================================
const PALETTE = {
  // Card surfaces (kept from previous commit)
  surface:   "#FDFCFE", // أبيض نقي — سطح الكارت الأساسي
  tint:      "#F5F7FC", // أبيض مزرق خفيف — للكروت الثانوية
  halo:      "#E9F2FD", // هالة زرقاء خفيفة (للـ hover shadow)
  blue:      "#CAE3FA", // أزرق الزر الفاتح (decorative only)
  blueDeep:  "#C9E4FC", // أزرق التركيز الأعمق (decorative only)

  // Text colors (AAA on white/tint backgrounds)
  textPrim:  "#1D252E", // h1/h2/h3 — 15:1 on surface (AAA)
  textSec:   "#4A5260", // descriptions/body — 7.5:1 on surface (AAA)
  textMuted: "#6E6E73", // footer/legal only — 4.5:1 on #f5f5f7 (AA only — accepted for non-essential text)

  // Brand colors
  brand:     "#0071e3", // Apple blue — solid button background only
  brandDeep: "#0F5BB5", // deep blue — text links on light bg, 7.3:1 on white (AAA)
  brandSoft: "#E9F2FD", // brand tint background (badges, pills)

  // Borders
  border:    "#D2D2D7", // Apple gray border

  // Section backgrounds (unchanged — Apple-style alternating)
  sectionWhite: "#FFFFFF",
  sectionGray:  "#F5F5F7",
  sectionDark:  "#1D1D1F",
};

// Backward-compat alias (existing components reference CARD.*)
const CARD = PALETTE;

// ============================================================
// HERO quick-nav — owner directive 2026-08-30: the hero buttons
// should be section navigation for the WHOLE homepage ("ازرار تنقل
// للأقسام كلها بشكل جميل"), not product CTAs. Rationale: EVO is a
// service INSIDE the subscriptions, not a destination — advertising
// it as a hero CTA (and in the old final-CTA section) felt like
// repetition. Memberships keeps the single filled "primary" chip so
// the business CTA stays visible. Anchors target the section ids
// added below; scroll-mt-20 clears the sticky header, and
// globals.css already provides smooth scrolling.
// ============================================================
type HeroNavItem = {
  id: string;
  labelEn: string;
  labelAr: string;
  titleEn: string;
  titleAr: string;
  icon: LucideIcon;
  color: string;
  primary?: boolean;
  needsPosts?: boolean; // blog section only renders when posts exist
};

const HERO_NAV: HeroNavItem[] = [
  { id: "memberships", labelEn: "Memberships", labelAr: "العضويات", titleEn: "Musclehubeg Premium memberships", titleAr: "عضويات Musclehubeg المميزة", icon: Crown, color: "#0071e3", primary: true },
  { id: "tools", labelEn: "Free Tools", labelAr: "أدوات مجانية", titleEn: "6 free fitness & nutrition calculators", titleAr: "6 حاسبات مجانية بدون تسجيل", icon: Calculator, color: "#ff9500" },
  { id: "exercises", labelEn: "Exercises", labelAr: "التمارين", titleEn: "868+ exercise library", titleAr: "مكتبة 868+ تمرين", icon: Dumbbell, color: "#34c759" },
  { id: "programs", labelEn: "Programs", labelAr: "البرامج", titleEn: "Ready-made workout programs", titleAr: "برامج تدريب جاهزة", icon: ClipboardList, color: "#5856d6" },
  { id: "foods", labelEn: "Foods", labelAr: "الأكلات", titleEn: "8,830+ foods with calories & macros", titleAr: "8,830+ أكلة بالسعرات والماكروز", icon: Salad, color: "#ff2d55" },
  { id: "blog", labelEn: "Blog", labelAr: "المدونة", titleEn: "Scientific fitness articles", titleAr: "مقالات رياضية علمية", icon: BookOpen, color: "#00b8d9", needsPosts: true },
  { id: "coaching", labelEn: "Coaching", labelAr: "الكوتشينج", titleEn: "Online coaching with real coaches", titleAr: "كوتشينج أونلاين مع مدربين حقيقيين", icon: Users, color: "#af52de" },
  { id: "for-coaches", labelEn: "For Coaches", labelAr: "كن مدرباً", titleEn: "Run your coaching business on Musclehubeg", titleAr: "اعمل شغلك كله من مكان واحد", icon: Briefcase, color: "#1d1d1f" },
  { id: "evo", labelEn: "EVO", labelAr: "EVO", titleEn: "Smart performance engine — included in memberships", titleAr: "محرك أداء ذكي — داخل الاشتراكات", icon: Bot, color: "#0071e3" },
  { id: "affiliate", labelEn: "Affiliate", labelAr: "الأفلييت", titleEn: "Earn 20% commission as an affiliate", titleAr: "اكسب عمولة 20% كأفلييت", icon: Megaphone, color: "#ff9500" },
  { id: "faq", labelEn: "FAQ", labelAr: "أسئلة شائعة", titleEn: "Frequently asked questions", titleAr: "أسئلة شائعة", icon: CircleHelp, color: "#8e8e93" },
];

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
          className="grid h-9 w-9 place-items-center rounded-full transition-colors"
          style={{ backgroundColor: PALETTE.surface, color: PALETTE.textPrim, border: `1px solid ${PALETTE.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = PALETTE.halo; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = PALETTE.surface; }}
          aria-label={isAr ? "السابق" : "Previous"}
        >
          <svg className="h-4 w-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => scroll(isAr ? "left" : "right")}
          className="grid h-9 w-9 place-items-center rounded-full transition-colors"
          style={{ backgroundColor: PALETTE.surface, color: PALETTE.textPrim, border: `1px solid ${PALETTE.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = PALETTE.halo; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = PALETTE.surface; }}
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
            className="group block shrink-0 overflow-hidden rounded-3xl transition-all duration-300"
            style={{
              backgroundColor: isFeatured ? PALETTE.sectionDark : PALETTE.surface,
              color: isFeatured ? "#FFFFFF" : PALETTE.textPrim,
              boxShadow: "0 1px 2px rgba(29, 37, 46, 0.04)",
              width: isFeatured ? "18rem" : "20rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isFeatured
                ? "0 4px 16px rgba(29, 37, 46, 0.25)"
                : "0 4px 16px rgba(201, 228, 252, 0.45)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.04)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {post.featured_image && (
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={post.featured_image}
                  alt={post.cover_alt || post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-5">
              <p
                className="text-xs font-normal uppercase tracking-wide"
                style={{ color: isFeatured ? "rgba(255,255,255,0.6)" : PALETTE.textSec }}
              >
                {getCategoryLabel(post.category, isAr ? "ar" : "en")}
              </p>
              <h3 className="mt-2 text-base font-semibold leading-tight tracking-tight line-clamp-2">
                {post.title}
              </h3>
              {post.excerpt && (
                <p
                  className="mt-2 line-clamp-2 text-sm font-normal"
                  style={{ color: isFeatured ? "rgba(255,255,255,0.7)" : PALETTE.textSec }}
                >
                  {post.excerpt}
                </p>
              )}
              <p className="mt-3 text-sm font-semibold" style={{ color: PALETTE.brandDeep }}>
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
  const { isCoach } = useAuth();
  const isAr = lang === "ar";

  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  // 0037 «أعلن معنا» — coaches with a running ad (homepage featured strip)
  type FeaturedCoach = { slug: string | null; name: string; headline: string; photo: string | null };
  const [featuredCoaches, setFeaturedCoaches] = useState<FeaturedCoach[]>([]);

  useEffect(() => {
    // Silent fetch — the strip only renders when active ads exist, so a
    // failed/empty call must never affect the homepage.
    fetch("/api/coaches/featured")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setFeaturedCoaches(json?.coaches ?? []))
      .catch(() => setFeaturedCoaches([]));
  }, []);

  useEffect(() => {
    (async () => {
      const posts = await listBlogPosts(lang);
      // Split posts across the two carousels WITHOUT ever repeating a post.
      // (Audit 2026-08-30: the old fill-from-latest logic could show the same
      // article in BOTH "Latest" and "Featured".) Latest takes the first
      // half (up to 8); Featured takes a daily-random pick from the rest.
      const latestCount = Math.min(8, Math.ceil(posts.length / 2));
      const latest = posts.slice(0, latestCount);
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
      // Featured draws ONLY from non-latest posts → no duplicates possible.
      const latestIds = new Set(latest.map((p) => p.id));
      const featured = shuffled.filter((p) => !latestIds.has(p.id)).slice(0, 6);
      setFeaturedPosts(featured);
    })();
  }, [lang]);

  // Dead code removed: streamImages array was built but never used
  // (hero was replaced with a static image — see comment below).

  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  // FAQ schema for SEO.
  // Owner SEO content plan (2026-09-03): the 5 Arabic pairs below are the
  // owner's verbatim copy (Egyptian-dialect refresh). They feed BOTH the
  // visible accordion AND the FAQPage JSON-LD above (single source).
  const faqs = [
    { q: isAr ? "هل محتاج اشتراك علشان أستخدم الأدوات؟" : "Do I need a subscription to use the tools?", a: isAr ? "لأ، كل الحاسبات (السعرات، الكتلة، الماكروز، الدهون) متاحة مجانًا وبدون تسجيل." : "No, all six tools (calorie, BMI, macro, body fat, water tracker, meal planner) are completely free without signup." },
    { q: isAr ? "إيه الفرق بين Premium وPro؟" : "What's the difference between Premium and Pro?", a: isAr ? "Premium يديك EVO بلا حدود و4 خطط شهريًا، وPro يضيف خطط أكتر (8 شهريًا)، تبديلات أسبوعية، ونتائج محفوظة أكتر، بدون إعلانات." : "Premium ($14.99/mo): unlimited EVO, 4 plans/mo (weekly cap 1+1), 50 saved results. Pro ($29.99/mo): 8 plans/mo (weekly cap 2+2), 200 results, pattern analysis, ad-free." },
    { q: isAr ? "ما هي طرق الدفع المتاحة؟" : "Does it support PayPal?", a: isAr ? "حاليًا فودافون كاش، إنستاباي، وPayPal — وهنضيف طرق دفع تانية قريبًا." : "Yes, PayPal is the primary payment method. Manual payment via InstaPay and Vodafone Cash is also available." },
    { q: isAr ? "كام عدد التمارين والأطعمة المتاحة؟" : "How many exercises and foods are there?", a: isAr ? "أكتر من 868 تمرين و8830 نوع طعام، وبيزيد باستمرار." : "868 exercises with bilingual instructions and images, plus 8,830 foods with calories and macros per 100g." },
    { q: isAr ? "هل المنصة بتدعم اللغة العربية؟" : "Does the site support Arabic?", a: isAr ? "أيوه بالكامل — النسخة العربية موجّهة لكل الجمهور العربي مش لبلد معينة، والنسخة الإنجليزية موجّهة للعالم كله." : "Yes, fully bilingual (Arabic/English) with complete RTL support, Arabic mirror pages, and a blog with independent content per language." },
  ];
  const faqSchema = getFAQSchema(faqs);

  // Owner executive order Phase 117 (2026-09-04 — SEO/GEO audit): homepage
  // feature-comparison table vs traditional alternatives. ✅/❌ quick-scan
  // cells per the owner's directive; the "traditional personal trainer"
  // column surfaces the platform's added value. Cell values: "✅" | "❌" |
  // short AR/EN text pair for partial/nuanced cells.
  const comparisonRows: Array<{
    featureAr: string;
    featureEn: string;
    us: string;
    tradAr: string;
    tradEn: string;
    appsAr: string;
    appsEn: string;
  }> = [
    {
      featureAr: "مكتبة تمارين 868+ بشرح وافٍ",
      featureEn: "868+ exercise library with full instructions",
      us: "✅", tradAr: "❌", tradEn: "❌", appsAr: "جزئيًا", appsEn: "Partial",
    },
    {
      featureAr: "قاعدة أغذية 8830+ بالسعرات والماكروز",
      featureEn: "8,830+ food database with calories & macros",
      us: "✅", tradAr: "❌", tradEn: "❌", appsAr: "❌", appsEn: "❌",
    },
    {
      featureAr: "خطط تدريب وتغذية مخصصة",
      featureEn: "Custom workout & nutrition plans",
      us: "✅", tradAr: "✅", tradEn: "✅", appsAr: "خطط عامة فقط", appsEn: "Generic plans only",
    },
    {
      featureAr: "متابعة من مدربين معتمدين",
      featureEn: "Supervision by certified coaches",
      us: "✅", tradAr: "✅", tradEn: "✅", appsAr: "❌", appsEn: "❌",
    },
    {
      featureAr: "مساعد ذكاء اصطناعي متاح 24/7",
      featureEn: "AI coach available 24/7",
      us: "✅", tradAr: "❌", tradEn: "❌", appsAr: "❌", appsEn: "❌",
    },
    {
      featureAr: "برامج جاهزة لكل مستوى",
      featureEn: "Ready programs for every level",
      us: "✅", tradAr: "❌", tradEn: "❌", appsAr: "محدودة", appsEn: "Limited",
    },
    {
      featureAr: "دعم عربي كامل (RTL)",
      featureEn: "Full Arabic support (RTL)",
      us: "✅", tradAr: "حسب المدرب", tradEn: "Per coach", appsAr: "❌", appsEn: "❌",
    },
    {
      featureAr: "التكلفة الشهرية",
      featureEn: "Monthly cost",
      us: "مجانًا / من $14.99", tradAr: "$20–50 للجلسة", tradEn: "$20–50/session", appsAr: "مجاني بإعلانات", appsEn: "Free with ads",
    },
  ];

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
              {isAr ? "رحلتك الرياضية الكاملة.. في منصة واحدة" : "Your complete fitness platform."}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base font-normal leading-relaxed md:mx-0 md:text-lg" style={{ color: PALETTE.textSec }}>
              {isAr
                ? "منصة Musclehubeg للتدريب الرقمي مش مجرد موقع تمارين — دي منظومة رياضية متكاملة: أكثر من 868 تمرينًا بشرح وافٍ، 8830 أكلة بالقيم الغذائية، برامج جاهزة لكل مستوى، حاسبات لياقة مجانية، مدونة علمية، وكوتشينج حقيقي. احصل على خطط مخصصة من مدربين معتمدين أو ذكاء اصطناعي EVO، وتابع تقدمك خطوة بخطوة — كل ما تحتاجه في مكان واحد يوفر عليك وقتك وجهدك."
                : "Musclehubeg is more than a fitness website — it's a complete digital training platform and sports ecosystem: 868+ exercises with full instructions, 8,830+ foods with nutrition data, ready-made programs for every level, free fitness calculators, a scientific blog, and real online coaching. Get custom plans from certified coaches or the EVO AI, and track your progress step by step — everything you need in one place, saving you time and effort."}
            </p>
            {/* Owner directive 2026-08-30: hero buttons = section navigation
                for the WHOLE homepage (beautiful chips). EVO is a service
                inside subscriptions — not a hero CTA — so it's just one chip
                among all sections. Memberships keeps the single filled
                primary chip; all chips smooth-scroll to their section id. */}
            <nav aria-label={isAr ? "التنقل بين أقسام الصفحة" : "Jump to a section"} className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: PALETTE.textMuted }}>
                {isAr ? "استكشف أقسام الموقع" : "Explore the site"}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {HERO_NAV.filter((s) => !s.needsPosts || latestPosts.length > 0).map((s) => {
                  const Icon = s.icon;
                  const isPrimary = !!s.primary;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      title={isAr ? s.titleAr : s.titleEn}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-300"
                      style={
                        isPrimary
                          ? {
                              backgroundColor: PALETTE.brand,
                              color: "#FFFFFF",
                              boxShadow: "0 4px 14px rgba(0, 113, 227, 0.35)",
                            }
                          : {
                              backgroundColor: PALETTE.surface,
                              color: PALETTE.textPrim,
                              border: `1px solid ${PALETTE.border}`,
                            }
                      }
                      onMouseEnter={(e) => {
                        if (isPrimary) {
                          e.currentTarget.style.boxShadow = "0 6px 18px rgba(0, 113, 227, 0.5)";
                        } else {
                          e.currentTarget.style.backgroundColor = PALETTE.halo;
                          e.currentTarget.style.borderColor = PALETTE.blueDeep;
                        }
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        if (isPrimary) {
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 113, 227, 0.35)";
                        } else {
                          e.currentTarget.style.backgroundColor = PALETTE.surface;
                          e.currentTarget.style.borderColor = PALETTE.border;
                        }
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={isPrimary ? { color: "#FFFFFF" } : { color: s.color }}
                        aria-hidden="true"
                      />
                      {isAr ? s.labelAr : s.labelEn}
                    </a>
                  );
                })}
              </div>
            </nav>
          </div>
          {/* Image — visible on ALL screen sizes (mobile + desktop).
              On mobile: full-width below text. On desktop: right column. */}
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl shadow-2xl">
            <Image
              src="/images/hero/hero-athlete.jpg"
              alt={isAr ? "منصة رياضية شاملة - تمارين وتغذية" : "Athlete performing bicep curls"}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* (removed: "What is Musclehubeg?" section — Phase 117 correction 2026-09-04, owner directive: duplicated the hero; best phrases merged into the hero subtitle above, CenteredSection deleted as now-unused) */}

      {/* ===================== 3. EVO PREVIEW ===================== */}
      <section id="evo" className="scroll-mt-20 px-4 py-16 md:py-24" style={{ backgroundColor: PALETTE.sectionGray, color: PALETTE.textPrim }}>
        <div className="mx-auto max-w-5xl">
          {/* Text */}
          <div className="text-center">
            <h2 className="text-4xl font-semibold tracking-tight md:text-6xl" style={{ color: PALETTE.textPrim }}>
              EVO
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg font-normal md:text-xl" style={{ color: PALETTE.textSec }}>
              {isAr
                ? "مش شات بوت عادي، ده محرك أداء ذكي — اسأله في أي حاجة خاصة بالتمرين أو التغذية واحصل على إجابة فورية، متاح 24 ساعة يساعدك تاخد قرارك الصح وقت ما تحتاجه."
                : "A smart performance engine — not just a chatbot. Ask it anything fitness-related."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={openEvoFloatingChat}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: PALETTE.brand }}
              >
                {isAr ? "ابدأ المحادثة" : "Start chatting"}
              </button>
              <a
                href="/evo"
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-base font-normal transition-colors hover:bg-[#f5f5f7]"
                style={{ borderColor: PALETTE.border, backgroundColor: PALETTE.sectionWhite, color: PALETTE.textPrim }}
              >
                {isAr ? "اعرف أكثر" : "Learn more"}
              </a>
            </div>
          </div>
          {/* Image — single premium EVO visual */}
          <div className="relative mt-10 aspect-[3/2] w-full overflow-hidden rounded-3xl">
            <Image
              src="/images/hero/evo-1.jpg"
              alt={isAr ? "EVO مساعد اللياقة الذكي" : "EVO — AI interface"}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>
      {/* (removed: GradientFade gray→gray — audit 2026-08-30, purely dead strip) */}

      {/* ===================== 4. FREE TOOLS ===================== */}
      <section id="tools" className="scroll-mt-20 bg-[#f5f5f7] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "أدوات مجانية تختصر عليك الحسابات" : "Free Tools"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
                {isAr ? "حاسبات لياقة وتغذية مجانية بدون تسجيل." : "Free fitness and nutrition calculators, no signup required."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { slug: "calorie-calculator", nameAr: "حاسبة السعرات الحرارية", nameEn: "Calorie Calculator", descAr: "اعرف احتياجك اليومي بدقة بدون تسجيل.", descEn: "Daily calorie needs", emoji: "🔥", color: "#ff9500", href: "/tools/calorie-calculator", image: "/images/tools/calorie-calculator.png" },
              { slug: "bmi-calculator", nameAr: "حاسبة كتلة الجسم BMI", nameEn: "BMI Calculator", descAr: "اعرف لو وزنك في المعدل الصحي.", descEn: "Is your weight healthy?", emoji: "⚖️", color: "#0071e3", href: "/tools/bmi-calculator", image: "/images/tools/bmi-calculator.png" },
              { slug: "macro-calculator", nameAr: "حاسبة الماكروز", nameEn: "Macro Calculator", descAr: "وزّع بروتين وكارب ودهون يومك بسهولة.", descEn: "Protein, carbs, fat", emoji: "🥩", color: "#34c759", href: "/tools/macro-calculator", image: "/images/tools/macro-calculator.png" },
              { slug: "body-fat-calculator", nameAr: "حاسبة نسبة الدهون", nameEn: "Body Fat %", descAr: "تابع تقدمك بمقاييس حقيقية مش بس بالميزان.", descEn: "Your body fat %", emoji: "📊", color: "#ff3b30", href: "/tools/body-fat-calculator", image: "/images/tools/body-fat-calculator.png" },
              { slug: "water-tracker", nameAr: "متتبع الماء", nameEn: "Water Tracker", descAr: "سجل كوبساتك يومياً", descEn: "Log your daily cups", emoji: "💧", color: "#00b8d9", href: "/tools/water-tracker", image: "/images/tools/water-tracker.png" },
              { slug: "meal-planner", nameAr: "مخطط الوجبات", nameEn: "Meal Planner", descAr: "ابني وجباتك بنفسك", descEn: "Build your own meals", emoji: "🍽️", color: "#8b5cf6", href: "/meal-planner", image: "/images/tools/meal-planner.png" },
            ].map((tool, i) => (
              <Reveal key={tool.slug} delay={i * 80}>
                <LandingToolCard tool={tool} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/tools" className="text-sm font-medium transition-opacity hover:opacity-70" style={{ color: PALETTE.brandDeep }}>
              {isAr ? "كل الأدوات ›" : "View all tools ›"}
            </a>
          </div>
        </div>
      </section>

      <GradientFade from="bg-[#f5f5f7]" to="bg-white" />
      {/* ===================== 5. EXERCISE LIBRARY ===================== */}
      <section id="exercises" className="scroll-mt-20 bg-white px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "مكتبة تمارين تفوق 868 تمرين بشرح كامل" : "Exercise Library"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
                {isAr ? "من الصدر للضهر للأرجل، كل عضلة ليها تمارينها بمستويات صعوبة تناسب المبتدئ والمحترف." : "868+ exercises with full instructions and difficulty levels."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Audit 2026-08-30: the homepage showed "Cardio" (0 exercises in the
                library). Replaced by ALL 7 real muscle groups + an 8th dark
                browse-all tile (replaces the old standalone button). */}
            {[
              { emoji: "💪", labelAr: "صدر", labelEn: "Chest", slug: "chest", image: "/images/categories/exercises/chest.png" },
              { emoji: "🔙", labelAr: "ظهر", labelEn: "Back", slug: "back", image: "/images/categories/exercises/back.png" },
              { emoji: "🏆", labelAr: "أكتاف", labelEn: "Shoulders", slug: "shoulders", image: "/images/categories/exercises/shoulders.png" },
              { emoji: "🦵", labelAr: "أرجل", labelEn: "Legs", slug: "legs", image: "/images/categories/exercises/legs.png" },
              { emoji: "💪", labelAr: "بايسبس", labelEn: "Biceps", slug: "biceps", image: "/images/categories/exercises/biceps.png" },
              { emoji: "🏋️", labelAr: "ترايسبس", labelEn: "Triceps", slug: "triceps", image: "/images/categories/exercises/triceps.png" },
              { emoji: "🎯", labelAr: "بطن/كور", labelEn: "Core", slug: "core", image: "/images/categories/exercises/core.png" },
            ].map((cat) => (
              <Reveal key={cat.slug}>
                <LandingExerciseCategoryCard
                  cat={{ ...cat, count: EXERCISES.filter((e) => e.category === cat.slug).length }}
                  isAr={isAr}
                />
              </Reveal>
            ))}
            {/* 8th tile — browse-all CTA (replaces the old button below) */}
            <Reveal>
              <a
                href={isAr ? "/ar/exercises" : "/exercises"}
                className="group flex h-full flex-col items-center justify-center rounded-3xl p-4 text-center transition-all duration-300"
                style={{ backgroundColor: PALETTE.sectionDark, color: "#FFFFFF", boxShadow: "0 1px 2px rgba(29, 37, 46, 0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span className="text-3xl">🏋️</span>
                <span className="mt-2 text-base font-semibold">{isAr ? "كل التمارين" : "All Exercises"}</span>
                <span className="mt-1 text-xs font-normal" style={{ color: "#A1A1A6" }}>
                  {EXERCISES.length}+ {isAr ? "تمرين" : "exercises"}
                </span>
              </a>
            </Reveal>
          </div>
        </div>
      </section>
      <GradientFade from="bg-white" to="bg-[#f5f5f7]" />

      {/* ===================== 6. WORKOUT PROGRAMS ===================== */}
      <section id="programs" className="scroll-mt-20 bg-[#f5f5f7] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "برامج تدريب جاهزة على مستواك وهدفك" : "Ready Workout Programs"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
                {isAr ? "سواء بدون معدات في البيت، أو في الجيم بمعدات كاملة، أو برنامج حرق دهون مكثف — اختار وابدأ فورًا بدون تخطيط زيادة." : "Complete programs by level and goal — home, gym, or minimal equipment."}
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
            <a href="/programs" className="inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: PALETTE.textPrim }}>
              {isAr ? "كل البرامج ›" : "View all programs ›"}
            </a>
          </div>
        </div>
      </section>
      <GradientFade from="bg-[#f5f5f7]" to="bg-white" />

      {/* ===================== 7. FOOD LIBRARY ===================== */}
      <section id="foods" className="scroll-mt-20 bg-white px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "قاعدة بيانات أكتر من 8830 نوع طعام" : "Food Library"}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-3 max-w-md text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
                {isAr ? "اعرف السعرات والماكروز لأي أكلة قبل ما تاكلها، من البروتين للكارب للدهون والفاكهة." : "8830+ foods with calories and macros + grams calculator."}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { emoji: "🥩", titleAr: "بروتين", titleEn: "Protein", descAr: "لحم، دجاج، بيض", descEn: "Meat, chicken, eggs", slug: "protein", image: "/images/categories/foods/protein.png" },
              { emoji: "🍚", titleAr: "كارب", titleEn: "Carbs", descAr: "أرز، شوفان، بطاطس", descEn: "Rice, oats, potato", slug: "carb", image: "/images/categories/foods/carb.png" },
              { emoji: "🥑", titleAr: "دهون", titleEn: "Fats", descAr: "أفوكادو، مكسرات", descEn: "Avocado, nuts", slug: "fat", image: "/images/categories/foods/fat.png" },
              { emoji: "🍎", titleAr: "فواكه", titleEn: "Fruits", descAr: "طازجة وصحية", descEn: "Fresh and healthy", slug: "fruit", image: "/images/categories/foods/fruit.png" },
            ].map((cat, i) => (
              <Reveal key={cat.titleEn} delay={i * 80}>
                <LandingFoodCategoryCard cat={cat} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href={isAr ? "/ar/foods" : "/foods"} className="inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: PALETTE.textPrim }}>
              {isAr ? "تصفّح كل الأكلات ›" : "Browse all foods ›"}
            </a>
          </div>
        </div>
      </section>

      {/* ===================== 8. BLOG (raised higher) — Latest + Featured carousels ===================== */}
      {latestPosts.length > 0 && (
        <>
        <GradientFade from="bg-white" to="bg-[#f5f5f7]" />
        <section id="blog" className="scroll-mt-20 bg-[#f5f5f7] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            {/* Latest Posts — carousel with light cards */}
            <div>
              <Reveal>
                <div className="mb-6 flex items-end justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
                    {isAr ? "أحدث المقالات" : "Latest Articles"}
                  </h2>
                  <a href={blogHref} className="text-sm font-medium transition-opacity hover:opacity-70" style={{ color: PALETTE.brandDeep }}>
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
        </>
      )}

      {/* ===================== 9. COACHING PREVIEW ===================== */}
      {/* Improved 2026-08-30 (owner feedback): the section was only a headline
          + two buttons. Added a 4-feature grid showing WHAT you actually get
          (nutrition plan / adaptive programs / follow-up / EVO AI). */}
      <section id="coaching" className="scroll-mt-20 bg-white px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium" style={{ backgroundColor: PALETTE.brandSoft, color: PALETTE.brandDeep }}>
                {isAr ? "كوتشينج أونلاين" : "Online Coaching"}
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "كوتشينج حقيقي.. مش مجرد خطة PDF" : "Coaches & Nutrition Specialists"}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-4 max-w-2xl text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
                {isAr
                  ? "كوتش بيتابعك خطوة بخطوة، خطة تغذية وتمرين مخصصة على جسمك وهدفك، وتعديل مستمر حسب تقدمك، مع مساعد EVO شغال معاك 24 ساعة."
                  : "A real coach following you step by step, with EVO AI available 24/7."}
              </p>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(isAr
                ? [
                    { icon: Salad, t: "خطط تغذية مخصصة", d: "مبنية على جسمك وهدفك" },
                    { icon: Dumbbell, t: "برامج تمارين متكيفة", d: "بتتعدل مع تقدمك" },
                    { icon: LineChart, t: "متابعة شخصية", d: "مراجعة وتعديل مستمر" },
                    { icon: Bot, t: "EVO AI — 24/7", d: "إجابات فورية أي وقت" },
                  ]
                : [
                    { icon: Salad, t: "Custom nutrition plans", d: "Built around your body & goal" },
                    { icon: Dumbbell, t: "Adaptive workout programs", d: "They adjust as you progress" },
                    { icon: LineChart, t: "Personal follow-up", d: "Continuous review & tweaks" },
                    { icon: Bot, t: "EVO AI — 24/7", d: "Instant answers anytime" },
                  ]
              ).map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.t} className="rounded-3xl p-5 text-center" style={{ backgroundColor: PALETTE.tint }}>
                    <span
                      className="mx-auto grid h-12 w-12 place-items-center rounded-2xl"
                      style={{ backgroundColor: PALETTE.brandSoft, color: PALETTE.brandDeep }}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-semibold" style={{ color: PALETTE.textPrim }}>{f.t}</p>
                    <p className="mt-1 text-xs font-normal leading-relaxed" style={{ color: PALETTE.textSec }}>{f.d}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/coaching"
                className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: PALETTE.brand }}
              >
                {isAr ? "اعرف أكثر ›" : "Learn more ›"}
              </a>
              <a
                href={isAr ? "/ar/memberships" : "/memberships"}
                className="rounded-full px-6 py-2.5 text-sm font-normal transition-opacity hover:opacity-90"
                style={{ backgroundColor: PALETTE.sectionGray, color: PALETTE.textPrim }}
              >
                {isAr ? "الأسعار" : "Pricing"}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 9.5 FEATURED COACHES («أعلن معنا» ads) ===================== */}
      {featuredCoaches.length > 0 && (
        <section className="bg-[#f5f5f7] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: PALETTE.textPrim }}>
              {isAr ? "مدربون مميزون" : "Featured Coaches"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-base font-normal" style={{ color: PALETTE.textSec }}>
              {isAr
                ? "مدربون معتمدون على المنصة — اضغط على أي مدرب لزيارة صفحته."
                : "Certified coaches on the platform — tap any coach to visit his page."}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {featuredCoaches.map((coach, i) => {
                const href = coach.slug ? `${isAr ? "/ar" : ""}/coaches/${coach.slug}` : "/coaching";
                return (
                  <a
                    key={`${coach.slug || coach.name}-${i}`}
                    href={href}
                    className="group block rounded-3xl bg-white p-5 text-center transition-all duration-300"
                    style={{ boxShadow: "0 1px 2px rgba(29, 37, 46, 0.04)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 228, 252, 0.45)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.04)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {coach.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coach.photo}
                        alt={coach.name}
                        className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-[#f5f5f7]"
                      />
                    ) : (
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#0071e3]/10 text-xl font-semibold text-[#0071e3]">
                        {(coach.name.trim().charAt(0) || "M")}
                      </div>
                    )}
                    <p className="mt-3 truncate text-sm font-semibold" style={{ color: PALETTE.textPrim }}>
                      {coach.name}
                    </p>
                    {coach.headline && (
                      <p className="mt-1 line-clamp-2 text-xs font-normal" style={{ color: PALETTE.textSec }}>
                        {coach.headline}
                      </p>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===================== 9.7 JOIN AS A COACH (owner-approved homepage block) ===================== */}
      <section id="for-coaches" className="scroll-mt-20 px-4 py-12 md:py-20" style={{ backgroundColor: PALETTE.sectionDark }}>
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <span
              className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium"
              style={{ backgroundColor: "rgba(0, 113, 227, 0.15)", color: "#7CB8F8" }}
            >
              {isAr ? "للمدربين والأخصائيين" : "For Coaches & Specialists"}
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              {isAr ? "كوتش أو أخصائي تغذية؟ ابني بيزنسك على منصتنا" : "Are you a coach? Run your whole business from one place."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-xl text-base font-normal md:text-lg" style={{ color: "#A1A1A6" }}>
              {isAr
                ? "سعرك بقرارك انت وتحصل فلوسك على طول — المنصة بتاخد رسم ثابت بس مش نسبة من شغلك، وكل الأدوات (868+ تمرين، 8830+ أكلة، ومساعد EVO) متاحة تحت تصرفك مع صفحتك الخاصة."
                : "Your client's price is your call alone, and you collect your money yourself — the site charges a fixed fee only, never a percentage of your work."}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-start md:grid-cols-3">
              {[
                isAr
                  ? { t: "أسعارك إيدك", d: "تحدد سعر عميلك وتحصّله بنفسك — صفر٪ عمولة" }
                  : { t: "Your prices", d: "Set your price and collect directly — 0% commission" },
                isAr
                  ? { t: "عملاؤك وصلاحياتك معاهم", d: "خطط وإدارة كاملة لعملائك من لوحة الكوتش" }
                  : { t: "Your clients, your rules", d: "Full plans & management from the coach dashboard" },
                isAr
                  ? { t: "أدوات المنصة معاك", d: "EVO، ٨٦٨+ تمرين، ٨٬٨٣٠+ أكلة، وصفحة عامة لك" }
                  : { t: "Platform tools included", d: "EVO, 868+ exercises, 8,830+ foods, and your own page" },
              ].map((item) => (
                <div
                  key={item.t}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
                >
                  <p className="text-sm font-semibold text-white">{item.t}</p>
                  <p className="mt-1.5 text-xs font-normal leading-relaxed" style={{ color: "#A1A1A6" }}>
                    {item.d}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-8">
              <a
                href="/for-coaches"
                className="rounded-full px-8 py-3.5 text-base font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: PALETTE.brand }}
              >
                {isAr ? "انضم كمدرب ›" : "Join as a coach ›"}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 10. Premium Memberships ===================== */}
      <section id="memberships" className="scroll-mt-20 px-4 py-12 md:py-20" style={{ backgroundColor: PALETTE.sectionGray }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl" style={{ color: PALETTE.textPrim }}>
              {isAr ? "اشتراكات تناسب كل مستوى" : "Musclehubeg Premium memberships."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-2xl text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
              {isAr
                ? "ابدأ مجانًا بالأدوات الأساسية، أو ارقّي لـPremium أو Pro علشان تفتح كل إمكانيات EVO وخطط شخصية أكتر شهريًا."
                : "Unlock the full power of AI with a Premium or Pro membership."}
            </p>
          </Reveal>

          {/* Two-tier cards — redesigned 2026-08-30 (owner feedback): Pro is
              the visual hero (dark card + glow + big price), Premium the clean
              standard. BOTH get real full-width CTA buttons — the Pro button
              is the owner-requested standout: gradient + glow + arrow. */}
          <div className="mt-10 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6">
            {/* Premium tier — clean white card with checklist */}
            <Reveal delay={200} className="h-full">
              <a
                href={isAr ? "/ar/memberships" : "/memberships"}
                className="group flex h-full flex-col rounded-3xl p-7 transition-all duration-300"
                style={{
                  backgroundColor: PALETTE.surface,
                  border: `1px solid ${PALETTE.border}`,
                  boxShadow: "0 1px 2px rgba(29, 37, 46, 0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 228, 252, 0.45)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(29, 37, 46, 0.04)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>
                    {isAr ? "بريميوم" : "Premium"}
                  </h3>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold tracking-tight" style={{ color: PALETTE.textPrim }}>$14.99</span>
                    <span className="pb-0.5 text-xs font-normal" style={{ color: PALETTE.textSec }}>/{isAr ? "شهر" : "mo"}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-normal leading-relaxed" style={{ color: PALETTE.textSec }}>
                  {isAr ? "كل الأساسيات اللي محتاجها لتبدأ صح." : "All the essentials you need to start right."}
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {(isAr
                    ? ["EVO غير محدود", "4 خطط تغذية/تمرين شهرياً (بحد أسبوعي 1+1)", "50 نتيجة محفوظة", "تصدير مخطط الوجبات والنتائج"]
                    : ["Unlimited EVO", "4 nutrition/workout plans per month (weekly cap 1+1)", "50 saved results", "Meal-plan & results export"]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PALETTE.brand }} aria-hidden="true" />
                      <span style={{ color: PALETTE.textSec }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <span
                    className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity group-hover:opacity-90"
                    style={{ backgroundColor: PALETTE.brand }}
                  >
                    {isAr ? "اشترك الآن" : "Subscribe now"}
                    <span className="rtl:rotate-180">›</span>
                  </span>
                </div>
              </a>
            </Reveal>

            {/* Pro tier — featured dark card (the hero offer) */}
            <Reveal delay={300} className="h-full">
              <a
                href={isAr ? "/ar/memberships" : "/memberships"}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-all duration-300"
                style={{
                  backgroundColor: PALETTE.sectionDark,
                  boxShadow: "0 12px 32px rgba(29, 37, 46, 0.30)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 16px 40px rgba(0, 113, 227, 0.28)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(29, 37, 46, 0.30)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Decorative brand glow (top-end corner) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-24 end-[-15%] h-64 w-64 rounded-full opacity-40 blur-3xl"
                  style={{ background: "radial-gradient(circle, #0071e3 0%, transparent 70%)" }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight text-white">{isAr ? "برو" : "Pro"}</h3>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ background: "linear-gradient(135deg, #0071e3, #4F9CF9)" }}
                    >
                      {isAr ? "الأكثر شعبية" : "Popular"}
                    </span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold tracking-tight text-white">$29.99</span>
                    <span className="pb-1 text-xs font-normal text-[#a1a1a6]">/{isAr ? "شهر" : "mo"}</span>
                  </div>
                </div>
                <p className="relative mt-3 text-sm font-normal leading-relaxed text-[#a1a1a6]">
                  {isAr ? "للمتقدمين اللي عايزين أقصى استفادة من المنصة." : "For advanced users who want the most out of the platform."}
                </p>
                <ul className="relative mt-5 space-y-2.5 text-sm">
                  {(isAr
                    ? ["كل مميزات Premium", "8 خطط تغذية/تمرين شهرياً (بحد أسبوعي 2+2)", "6 تبديلات أسبوعياً", "200 نتيجة محفوظة", "بدون إعلانات"]
                    : ["Everything in Premium", "8 nutrition/workout plans per month (weekly cap 2+2)", "6 swaps per week", "200 saved results", "No ads"]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#4F9CF9" }} aria-hidden="true" />
                      <span className="text-[#d2d2d7]">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-auto pt-7">
                  <span
                    className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold text-white transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #0071e3 0%, #4F9CF9 100%)",
                      boxShadow: "0 8px 24px rgba(0, 113, 227, 0.45)",
                    }}
                  >
                    {isAr ? "اشترك الآن" : "Subscribe now"}
                    <span className="rtl:rotate-180">›</span>
                  </span>
                </div>
              </a>
            </Reveal>
          </div>

          {/* Free tier mention + compare link */}
          <Reveal delay={400}>
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-normal" style={{ color: PALETTE.textSec }}>
                {isAr
                  ? "أو ابدأ بالخطة المجانية — 868+ تمرين، 8,830+ أكلة، 5 حاسبات، EVO 10 رسائل/يوم."
                  : "Or start with the Free plan — 868+ exercises, 8,830+ foods, 5 calculators, EVO 10 messages/day."}
              </p>
              <a
                href={isAr ? "/ar/memberships" : "/memberships"}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300"
                style={{
                  backgroundColor: PALETTE.surface,
                  color: PALETTE.textPrim,
                  border: `1px solid ${PALETTE.border}`,
                }}
              >
                {isAr ? "قارن كل العضويات" : "Compare all plans"}
                <span className="rtl:rotate-180">›</span>
              </a>
            </div>
          </Reveal>

          {/* Phase 117 (owner executive order — SEO/GEO): feature-comparison
              table vs traditional alternatives. ✅/❌ cells per the owner's
              directive; the Musclehubeg column is visually highlighted. */}
          <Reveal delay={450}>
            <div className="mt-12">
              <h3 className="text-center text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "ليه Musclehubeg؟ مقارنة سريعة" : "Why Musclehubeg? A quick comparison"}
              </h3>
              <div className="mt-6 overflow-x-auto rounded-2xl" style={{ border: `1px solid ${PALETTE.border}` }}>
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr style={{ backgroundColor: PALETTE.sectionGray }}>
                      <th className="p-4 text-start text-xs font-medium" style={{ color: PALETTE.textSec }}>
                        {isAr ? "الميزة" : "Feature"}
                      </th>
                      <th className="p-4 text-center text-xs font-semibold" style={{ color: PALETTE.brandDeep }}>
                        Musclehubeg
                      </th>
                      <th className="p-4 text-center text-xs font-medium" style={{ color: PALETTE.textSec }}>
                        {isAr ? "مدرب شخصي تقليدي" : "Traditional personal trainer"}
                      </th>
                      <th className="p-4 text-center text-xs font-medium" style={{ color: PALETTE.textSec }}>
                        {isAr ? "تطبيقات مجانية" : "Free apps"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${PALETTE.border}99` }}>
                        <td className="p-4 text-start font-medium" style={{ color: PALETTE.textPrim }}>
                          {isAr ? row.featureAr : row.featureEn}
                        </td>
                        <td className="p-4 text-center" style={{ backgroundColor: `${PALETTE.brand}0d` }}>
                          <span className="font-semibold" style={{ color: PALETTE.brandDeep }}>{row.us}</span>
                        </td>
                        <td className="p-4 text-center" style={{ color: PALETTE.textSec }}>
                          {isAr ? row.tradAr : row.tradEn}
                        </td>
                        <td className="p-4 text-center" style={{ color: PALETTE.textSec }}>
                          {isAr ? row.appsAr : row.appsEn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 11. AFFILIATE PROGRAM ===================== */}
      {/* Audit 2026-08-30: /affiliate had ZERO homepage presence (footer/header
          only) → section added. Owner directive 2026-08-30: visible to
          EVERYONE — the old `{!isCoach}` gate hid it from admins/coaches too,
          and the owner (admin role) reported the section as missing. Facts
          match AffiliateProgramView: 20% subscription commission, 30-day
          cookie window for one-time products, $10 minimum payout. */}
      <section id="affiliate" className="scroll-mt-20 bg-white px-4 py-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium"
                style={{ backgroundColor: PALETTE.brandSoft, color: PALETTE.brandDeep }}
              >
                {isAr ? "برنامج الأفلييت" : "Affiliate Program"}
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "حوّل تأثيرك لدخل حقيقي (برنامج الأفلييت)" : "Turn your influence into income."}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-4 max-w-xl text-base font-normal md:text-lg" style={{ color: PALETTE.textSec }}>
                {isAr
                  ? "شارك رابطك الخاص واكسب عمولة 20% من كل اشتراك، مع تتبّع دقيق وحد أدنى للسحب 10 دولار بس."
                  : "Share your personal affiliate link and earn a 20% commission on every qualified subscription — real-time tracking, $10 minimum payout."}
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="mx-auto mt-8 grid max-w-2xl gap-3 md:grid-cols-3">
                {[
                  isAr
                    ? { v: "20%", d: "عمولة على الاشتراكات المؤهلة" }
                    : { v: "20%", d: "Commission on qualified subscriptions" },
                  isAr
                    ? { v: "30 يوم", d: "تتبع بالكوكيز للمنتجات لمرة واحدة" }
                    : { v: "30 days", d: "Cookie tracking for one-time products" },
                  isAr
                    ? { v: "10$", d: "الحد الأدنى للصرف" }
                    : { v: "$10", d: "Minimum payout" },
                ].map((s) => (
                  <div key={s.d} className="rounded-2xl p-5" style={{ backgroundColor: PALETTE.tint }}>
                    <p className="text-xl font-semibold" style={{ color: PALETTE.textPrim }}>{s.v}</p>
                    <p className="mt-1 text-xs font-normal leading-relaxed" style={{ color: PALETTE.textSec }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div className="mt-8">
                <a
                  href="/affiliate"
                  className="rounded-full px-8 py-3.5 text-base font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: PALETTE.brand }}
                >
                  {isAr ? "اكسب كأفلييت ›" : "Earn as an affiliate ›"}
                </a>
              </div>
            </Reveal>
          </div>
      </section>

      {/* ===================== 11.5 PRIMARY CTA (owner SEO plan 2026-09-03:
          «دعوة لاتخاذ إجراء [CTA] الرئيسية» — verbatim AR copy. The 2026-08-30
          removal objection was duplication + pushing EVO; this strip is the
          single free-start message, no EVO push, and links to memberships
          where the Free tier lives) ==== */}
      <section className="bg-white px-4 py-16 md:py-20">
        <Reveal>
          <div className="mx-auto max-w-3xl rounded-3xl px-6 py-12 text-center md:py-16" style={{ backgroundColor: PALETTE.brandSoft }}>
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl" style={{ color: PALETTE.textPrim }}>
              {isAr
                ? "ابدأ رحلتك دلوقتي مجانًا.. مالكش عذر تأجل بعد اليوم"
                : "Start your journey free today — no excuse to wait"}
            </h2>
            <a
              href={isAr ? "/ar/memberships" : "/memberships"}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-9 py-4 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
              style={{ backgroundColor: PALETTE.brand, boxShadow: "0 8px 24px rgba(0, 113, 227, 0.35)" }}
            >
              {isAr ? "جرّب المنصة مجانًا" : "Try the platform free"}
              <span className="rtl:rotate-180">›</span>
            </a>
          </div>
        </Reveal>
      </section>

      {/* ===================== 12. FAQ (now the closing section — the old
          "13. FINAL CTA / ابدأ رحلتك الرياضية" was removed 2026-08-30 per
          owner: it repeated the hero + memberships CTAs and pushed EVO,
          which is a service inside subscriptions, not a standalone CTA) ==== */}
      <section id="faq" className="scroll-mt-20 bg-[#f5f5f7] px-4 py-12 md:py-20">
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
                  <AccordionContent className="pb-5 text-base font-normal leading-relaxed" style={{ color: PALETTE.textSec }}>
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ===================== 13. NEWSLETTER — Phase 72 (owner request) ====
          Daily/weekly newsletter signup on the homepage. Saved in tool_leads
          with type="newsletter" via /api/tools/lead. Since 2026-09-03 this is
          the SINGLE newsletter surface on the homepage — the duplicate footer
          card right below was removed per owner («النشرة البريدية المجانية
          مكررة في الصفحة الرئيسية»), same dedup pattern as the 2026-08-30
          footer CTA removal. ===================== */}
      <section className="bg-white px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <NewsletterForm variant="home" />
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-[#d2d2d7] bg-[#f5f5f7] px-4 py-10 text-[#6e6e73]">
        <div className="mx-auto max-w-6xl">
          {/* Removed (owner feedback 2026-09-03): footer newsletter card —
              it duplicated section 13 directly above the footer («النشرة
              البريدية المجانية مكررة في الصفحة الرئيسية»). Section 13 is the
              single newsletter surface. Removed earlier (2026-08-30): «أنت
              مدرب؟» footer CTA strip — it duplicated section 9.7 (same
              headline + same /for-coaches link). The rich dark section is
              the single coach funnel entry. */}

          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5">
            {/* Brand */}
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">Musclehubeg</p>
              <p className="mt-2 text-xs font-normal">{isAr ? "منصة رياضية شاملة." : "Comprehensive sports platform."}</p>
              <p className="mt-3 text-[10px] font-normal text-[#8e8e93]">{isAr ? "© 2026 جميع الحقوق محفوظة" : "© 2026 All rights reserved"}</p>
            </div>

            {/* Group 1: Paid Services */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? "الخدمات المدفوعة" : "Paid Services"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/coaching" className="hover:underline">{isAr ? "الكوتشينج" : "Coaching"}</a></li>
                <li><a href={isAr ? "/ar/memberships" : "/memberships"} className="hover:underline">{isAr ? "العضويات" : "Memberships"}</a></li>
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
                <li><a href={isAr ? "/ar/exercises" : "/exercises"} className="hover:underline">{isAr ? "مكتبة التمارين" : "Exercises"}</a></li>
                <li><a href="/programs" className="hover:underline">{isAr ? "برامج التدريب" : "Programs"}</a></li>
                <li><a href={isAr ? "/ar/foods" : "/foods"} className="hover:underline">{isAr ? "مكتبة الأكلات" : "Foods"}</a></li>
                <li><a href={isAr ? "/ar/blog" : "/blog"} className="hover:underline">{isAr ? "المدونة" : "Blog"}</a></li>
              </ul>
            </div>
          </div>

          {/* Group 5: Legal + Basic — bottom row (per Owner directive 2026-08-25:
              legal/basic pages like About / Contact / Privacy / Terms / FAQ
              live in the footer only, not in the header) */}
          <div className="mt-8 border-t border-[#d2d2d7] pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3">{isAr ? "قانوني وأساسي" : "Legal & Basic"}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {/* Audit 2026-08-30: was navigate() buttons → always EN. Real links
                  now, AR-aware for pages that have Arabic mirrors. */}
              <li><a href={isAr ? "/ar/about" : "/about"} className="hover:underline">{isAr ? "من نحن" : "About"}</a></li>
              <li><a href="/contact" className="hover:underline">{isAr ? "تواصل معنا" : "Contact"}</a></li>
              <li><a href={isAr ? "/ar/faq" : "/faq"} className="hover:underline">{isAr ? "أسئلة شائعة" : "FAQ"}</a></li>
              <li><a href="/privacy" className="hover:underline">{isAr ? "الخصوصية" : "Privacy"}</a></li>
              <li><a href="/terms" className="hover:underline">{isAr ? "الشروط" : "Terms"}</a></li>
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

// ─── Helper component prop types (typed instead of legacy `any`) ───

type LandingTool = {
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  emoji: string;
  color: string;
  href: string;
  image: string;
};

type LandingExerciseCategory = {
  slug: string;
  labelAr: string;
  labelEn: string;
  emoji: string;
  image: string;
  count: number;
};

type LandingProgram = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  emoji: string;
  image: string;
};

type LandingFoodCategory = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  emoji: string;
  image: string;
};

// ─── Helper components (conditional rendering — no display:none in DOM) ───

function LandingToolCard({ tool, isAr }: { tool: LandingTool; isAr: boolean }) {
  return (
    <a
      href={tool.href}
      className="group flex items-center gap-4 rounded-3xl p-6 transition-all duration-300"
      style={{
        backgroundColor: PALETTE.surface,
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
      <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl" style={{ backgroundColor: `${tool.color}15` }}>
        <ImageWithFallback
          src={tool.image}
          alt={isAr ? tool.nameAr : tool.nameEn}
          fill
          className="object-cover"
          fallbackElement={<span>{tool.emoji}</span>}
        />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? tool.nameAr : tool.nameEn}</h3>
        <p className="mt-1 text-sm font-normal" style={{ color: PALETTE.textSec }}>{isAr ? tool.descAr : tool.descEn}</p>
      </div>
      <span className="text-2xl" style={{ color: PALETTE.textSec }}>›</span>
    </a>
  );
}

function LandingExerciseCategoryCard({ cat, isAr }: { cat: LandingExerciseCategory; isAr: boolean }) {
  return (
    <a
      href={`${isAr ? "/ar" : ""}/exercises?cat=${cat.slug}`}
      className="group block overflow-hidden rounded-3xl text-center transition-all duration-300"
      style={{
        backgroundColor: PALETTE.tint,
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
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
        <ImageWithFallback
          src={cat.image}
          alt={isAr ? cat.labelAr : cat.labelEn}
          fill
          className="object-contain"
          fallbackElement={
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-4xl">{cat.emoji}</span>
            </div>
          }
        />
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? cat.labelAr : cat.labelEn}</h3>
        <p className="mt-1 text-xs font-normal" style={{ color: PALETTE.textSec }}>{cat.count} {isAr ? "تمارين" : "exercises"}</p>
      </div>
    </a>
  );
}

function LandingProgramCard({ prog, isAr }: { prog: LandingProgram; isAr: boolean }) {
  return (
    <a
      href={`/programs/${prog.slug}`}
      className="group block overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        backgroundColor: PALETTE.surface,
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
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <ImageWithFallback
          src={prog.image}
          alt={isAr ? prog.titleAr : prog.titleEn}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallbackElement={
            <div className="flex h-full w-full items-center justify-center bg-[#f5f5f7]">
              <span className="text-4xl">{prog.emoji}</span>
            </div>
          }
        />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? prog.titleAr : prog.titleEn}</h3>
        <p className="mt-1 text-sm font-normal" style={{ color: PALETTE.textSec }}>{isAr ? prog.descAr : prog.descEn}</p>
        <p className="mt-3 text-sm font-semibold" style={{ color: PALETTE.brandDeep }}>{isAr ? "ابدأ الآن ›" : "Start now ›"}</p>
      </div>
    </a>
  );
}

function LandingFoodCategoryCard({ cat, isAr }: { cat: LandingFoodCategory; isAr: boolean }) {
  return (
    <a
      href={`${isAr ? "/ar" : ""}/foods?cat=${cat.slug}`}
      className="group block overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        backgroundColor: PALETTE.tint,
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
      <div className="relative aspect-square w-full overflow-hidden">
        <ImageWithFallback
          src={cat.image}
          alt={isAr ? cat.titleAr : cat.titleEn}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallbackElement={
            <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: PALETTE.tint }}>
              <span className="text-4xl">{cat.emoji}</span>
            </div>
          }
        />
      </div>
      <div className="p-4 text-center">
        <h3 className="text-base font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? cat.titleAr : cat.titleEn}</h3>
        <p className="mt-1 text-xs font-normal" style={{ color: PALETTE.textSec }}>{isAr ? cat.descAr : cat.descEn}</p>
      </div>
    </a>
  );
}
