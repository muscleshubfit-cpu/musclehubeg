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
import { listBlogPosts, getCategoryLabel, selectHomeBlogCarousels, type BlogPost } from "@/lib/blog";
import { EXERCISES_COUNT, EXERCISE_CATEGORY_COUNTS } from "@/lib/exercises-shared";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getFAQSchema, jsonLd } from "@/lib/seo";
import Image from "next/image";
import { ThemeImg, EngravedIcon } from "@/components/ThemeImg";
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
  // Phase 126 «Marble & Chrome» (owner directive 2026-09-06): the identity is
  // a monochrome marble + chrome system defined as CSS VARIABLES in
  // globals.css (:root + [data-theme="dark"]) — every value below resolves
  // through a var so the whole page re-themes WITHOUT re-render. --ai cyan
  // is reserved for AI-assistant surfaces only.
  surface:   "var(--card)",   // card surface (white / #141518)
  tint:      "var(--tint)",   // secondary surface / soft chips
  halo:      "var(--tint)",   // hover wash
  blue:      "var(--tint)",   // (decorative only)
  blueDeep:  "var(--muted-2)",

  textPrim:  "var(--text)",
  textSec:   "var(--muted-2)",
  textMuted: "var(--muted-foreground)",

  brand:     "var(--text)",    // solid action color (chrome CTAs use .btn-chrome)
  brandDeep: "var(--text)",
  brandSoft: "var(--tint)",

  border:    "var(--edge)",

  sectionWhite: "var(--bg)",
  sectionGray:  "var(--tint)",
  sectionDark:  "#0B0B0D",     // footer/rich band — dark in BOTH themes (mission §14)
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
  primary?: boolean;
  needsPosts?: boolean; // blog section only renders when posts exist
};

const HERO_NAV: HeroNavItem[] = [
  { id: "memberships", labelEn: "Memberships", labelAr: "العضويات", titleEn: "Alkemos Premium memberships", titleAr: "عضويات Alkemos المميزة", icon: Crown, primary: true },
  { id: "tools", labelEn: "Free Tools", labelAr: "أدوات مجانية", titleEn: "6 free fitness & nutrition calculators", titleAr: "6 حاسبات مجانية بدون تسجيل", icon: Calculator },
  { id: "exercises", labelEn: "Exercises", labelAr: "التمارين", titleEn: "868+ exercise library", titleAr: "مكتبة 868+ تمرين", icon: Dumbbell },
  { id: "programs", labelEn: "Programs", labelAr: "البرامج", titleEn: "Ready-made workout programs", titleAr: "برامج تدريب جاهزة", icon: ClipboardList },
  { id: "foods", labelEn: "Foods", labelAr: "الأكلات", titleEn: "8,830+ foods with calories & macros", titleAr: "8,830+ أكلة بالسعرات والماكروز", icon: Salad },
  { id: "blog", labelEn: "Blog", labelAr: "المدونة", titleEn: "Scientific fitness articles", titleAr: "مقالات رياضية علمية", icon: BookOpen, needsPosts: true },
  { id: "coaching", labelEn: "Coaching", labelAr: "الكوتشينج", titleEn: "Online coaching with real coaches", titleAr: "كوتشينج أونلاين مع مدربين حقيقيين", icon: Users },
  { id: "for-coaches", labelEn: "For Coaches", labelAr: "كن مدرباً", titleEn: "Run your coaching business on Alkemos", titleAr: "اعمل شغلك كله من مكان واحد", icon: Briefcase },
  { id: "evo", labelEn: "EVO", labelAr: "EVO", titleEn: "Smart performance engine — included in memberships", titleAr: "محرك أداء ذكي — داخل الاشتراكات", icon: Bot },
  { id: "affiliate", labelEn: "Affiliate", labelAr: "الأفلييت", titleEn: "Earn 20% commission as an affiliate", titleAr: "اكسب عمولة 20% كأفلييت", icon: Megaphone },
  { id: "faq", labelEn: "FAQ", labelAr: "أسئلة شائعة", titleEn: "Frequently asked questions", titleAr: "أسئلة شائعة", icon: CircleHelp },
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
            className="marble-card group block shrink-0 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              color: isFeatured ? "#F5F5F7" : PALETTE.textPrim,
              width: isFeatured ? "18rem" : "20rem",
              backgroundColor: isFeatured ? "#0B0B0D" : undefined,
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
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: isFeatured ? "rgba(245,245,247,0.65)" : "var(--muted-foreground)" }}
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
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: isFeatured ? "#F5F5F7" : PALETTE.textPrim }}>
                <EngravedIcon name="scroll" alt="" size={14} className="h-3.5 w-3.5" />
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
      // Phase 118 (owner directive 2026-09-04): the old in-block "daily
      // shuffle" was seed-invariant (the daily seed added the SAME constant
      // to every post's char-code sum, so the order never changed) and the
      // featured pool was permanently locked to posts outside latest —
      // the featured carousel showed the same posts for weeks. Selection is
      // now delegated to selectHomeBlogCarousels (src/lib/blog.ts): featured
      // excludes ONLY what the latest carousel shows at this moment and
      // rotates deterministically every UTC day through the whole pool.
      const { latest, featured } = selectHomeBlogCarousels(posts);
      setLatestPosts(latest);
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
      // Phase 132 (owner feedback: «جدول المقارنة فيه كلمة عربي في وضع
      // اللغة الإنجليزية»): the Alkemos cell was hardcoded Arabic — now
      // language-aware like the trainer/apps cells.
      us: isAr ? "مجانًا / من $14.99" : "Free / from $14.99", tradAr: "$20–50 للجلسة", tradEn: "$20–50/session", appsAr: "مجاني بإعلانات", appsEn: "Free with ads",
    },
  ];

  // Phase 131 (owner feedback «جدول المقارنه حاليا يشبة الكروت، عدلة الى
  // شكل جدول»): ONE real table renders at EVERY breakpoint now, so this
  // cell renderer serves all four columns — ✅→engraved check-seal,
  // ❌→faint ×, any other string→literal text (compact sizing below md
  // so the 4-column grid stays readable on phones).
  const renderCmpValue = (raw: string, highlight: boolean) =>
    raw === "✅" ? (
      <EngravedIcon
        name="checkseal"
        alt=""
        size={22}
        className={`mx-auto h-4 w-4 md:h-5 md:w-5${highlight ? "" : " opacity-60"}`}
      />
    ) : raw === "❌" ? (
      <span style={{ color: "var(--muted-foreground)", opacity: 0.5 }} aria-label="No">×</span>
    ) : (
      <span className="leading-snug" style={{ color: highlight ? "var(--text)" : "var(--muted-foreground)" }}>{raw}</span>
    );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* FAQ Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
      />

      <SiteHeader variant="landing" />

      {/* ===================== 1. HERO — Phase 131 (owner feedback on 128) ===================== */}
      {/* Owner directives 2026-09-06 (Phase 131): (1) the stats subline
          («868+ exercises • 8,830+ foods • EVO AI coach 24/7») is REMOVED;
          (2) the chrome logo, the H1, and the seal chips are one step
          smaller; (3) they now sit INSIDE the artwork — the hero is ONE
          overlay scene: artwork = absolute cover layer (.hero-bg, theme
          pair, eager LCP; root layout <link preload> still matches), the
          content centered on top (luminance-verified: the artwork center
          is clean in both themes → full contrast, no veil). The complete-
          artwork guarantee from Phase 128 stays as a CSS min-height floor
          (natural aspect on phones/tablets, 92vh on wide screens — see
          .hero-art in globals.css). History: Phase 127 scrubbed the baked
          logo from the artwork + removed the old CTAs/eyebrow. */}
      <section className="hero-art relative w-full">
        {/* Artwork layer — absolute cover, theme-swapped pair, eager (LCP) */}
        <div className="hero-bg" aria-hidden="true">
          <ThemeImg
            light="/images/brand/hero-light.webp"
            dark="/images/brand/hero-dark.webp"
            alt=""
            width={1280}
            height={713}
            eager
          />
        </div>
        {/* Content overlay — logo + H1 + seal chips, centered in the artwork */}
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-4 text-center md:py-8">
          {/* Silver-chrome brand lockup (owner artwork, theme pair) */}
          <ThemeImg
            light="/images/brand/logo-hero-light.webp"
            dark="/images/brand/logo-hero-dark.webp"
            alt="Alkemos"
            className="w-32 object-contain md:w-52 lg:w-64"
            eager
          />
          <h1 className="font-display mt-3 text-2xl font-semibold leading-tight tracking-tight md:mt-5 md:text-5xl lg:text-6xl" style={{ color: PALETTE.textPrim }}>
            {isAr ? "منصتك الرياضية المتكاملة." : "Your complete fitness platform."}
          </h1>

          {/* Stat chips — engraved seals (mission §3), hero-scoped smaller
              (owner: «تصغير … الازرار قليلا» — .hero-seals in globals.css) */}
          <div className="hero-seals mt-4 flex flex-wrap items-center justify-center gap-2 md:mt-6 md:gap-3">
            <span className="seal-chip">
              <EngravedIcon name="dumbbell" alt="" size={14} className="h-3 w-3" />
              {isAr ? "868+ تمرين" : "868+ EXERCISES"}
            </span>
            <span className="seal-chip">
              <EngravedIcon name="hydration" alt="" size={14} className="h-3 w-3" />
              {isAr ? "8830+ أكلة" : "8,830+ FOODS"}
            </span>
            <span className="seal-chip">
              <EngravedIcon name="evo" alt="" size={14} className="h-3 w-3" />
              {isAr ? "EVO مدرب ذكي 24/7" : "EVO AI COACH 24/7"}
            </span>
          </div>

          {/* (Phase 125, owner directive: the section-navigation chips moved
              OUT of the hero into their own section directly below it —
              keeps the hero clean and the artwork clearly visible.) */}
        </div>
      </section>

      {/* Greek meander divider — mission §4 */}
      <div className="meander-divider" aria-hidden="true" />

      {/* ===================== 2. SECTION QUICK-NAV — owner directive Phase 125: hero buttons moved below the hero ===================== */}
      {/* Owner directive 2026-08-30 (rev. 2026-09-06): hero buttons = section
          navigation for the WHOLE homepage (beautiful chips). EVO is a service
          inside subscriptions — not a hero CTA — so it's just one chip among
          all sections. Memberships keeps the single filled primary chip; all
          chips smooth-scroll to their section id. */}
      <section className="px-4 pb-10 pt-2 md:pb-14" style={{ backgroundColor: PALETTE.sectionWhite }}>
        <nav aria-label={isAr ? "التنقل بين أقسام الصفحة" : "Jump to a section"} className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: PALETTE.textMuted }}>
            {isAr ? "استكشف أقسام الموقع" : "Explore the site"}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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
                              background: "var(--chrome)",
                              color: "#0B0B0D",
                              border: "1px solid var(--chrome-edge)",
                              boxShadow: "var(--shadow)",
                            }
                          : {
                              backgroundColor: "var(--card)",
                              color: PALETTE.textPrim,
                              border: "var(--border-chrome)",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isPrimary) {
                          e.currentTarget.style.backgroundColor = "var(--tint)";
                        }
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isPrimary) {
                          e.currentTarget.style.backgroundColor = "var(--card)";
                        }
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={isPrimary ? { color: "#0B0B0D" } : { color: "var(--muted-foreground)" }}
                        aria-hidden="true"
                      />
                      {isAr ? s.labelAr : s.labelEn}
                    </a>
                  );
                })}
              </div>
        </nav>
      </section>

      {/* (removed: "What is Alkemos?" section — Phase 117 correction 2026-09-04, owner directive: duplicated the hero; best phrases merged into the hero subtitle above, CenteredSection deleted as now-unused) */}

      {/* ===================== 3. EVO PREVIEW — Phase 127 card (preview-sections + 1788658797 reference) ===================== */}
      {/* Owner directive (Phase 127): «راجع صور الأمثلة … خصوصا كارت قسم
          evo» — the reference design is ONE full-width marble card: text on
          the left, the warrior artwork on the right blending into the
          marble with a soft fade (no separate image block below). The
          warrior crop (evo-hero-light/dark.webp) is generated by
          scripts/build_assets_v127.py (source x[180,1060] puts him at
          67-85% of the crop). RTL mirrors automatically: logical
          inset-inline-end + a [dir="rtl"] mask flip in globals.css
          (.evo-hero-card / .evo-hero-art).
          Phase 131 (owner feedback 2026-09-06): «قسم ايفو ازاله الازرار
          وتصغير حجم النص قليلا وتصغير ارتفاع الصورة قليلا» — the two CTAs
          are REMOVED (the global floating EVO widget stays the entry
          point), the H2 is one step smaller, and the card min-height
          shrinks with it. */}
      <section id="evo" className="scroll-mt-20 px-4 py-16 md:py-24" style={{ backgroundColor: PALETTE.sectionGray, color: PALETTE.textPrim }}>
        <div className="mx-auto max-w-5xl">
          <div className="evo-hero-card marble-card relative w-full">
            {/* Warrior artwork — right side (left in RTL), fading into the marble */}
            <div className="evo-hero-art" aria-hidden="true">
              <ThemeImg
                light="/images/brand/evo-hero-light.webp"
                dark="/images/brand/evo-hero-dark.webp"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            {/* Text column — title only (Phase 128), smaller + shorter card
                (Phase 131). CTAs removed (owner: «قسم ايفو ازاله الازرار»). */}
            <div className="relative z-10 flex min-h-[280px] flex-col justify-center gap-4 p-7 md:min-h-[340px] md:p-10 lg:max-w-[56%]">
              {/* Phase 117 H2 correction (supervisor order 2026-09-04):
                  punchy marketing headline, not a question. */}
              <h2 className="text-2xl font-semibold tracking-tight md:text-4xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "EVO: مدربك الذكي 24/7" : "EVO: Your 24/7 Smart Coach"}
              </h2>
            </div>
          </div>
        </div>
      </section>
      {/* (removed: GradientFade gray→gray — audit 2026-08-30, purely dead strip) */}

      {/* ===================== 4. FREE TOOLS ===================== */}
      <section id="tools" className="scroll-mt-20 bg-[var(--tint)] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "احسب احتياجاتك بأدوات مجانية" : "Calculate Your Needs with Free Tools"}
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
              { slug: "calorie-calculator", nameAr: "حاسبة السعرات الحرارية", nameEn: "Calorie Calculator", descAr: "اعرف احتياجك اليومي بدقة بدون تسجيل.", descEn: "Daily calorie needs", icon: "calories", href: "/tools/calorie-calculator" },
              { slug: "bmi-calculator", nameAr: "حاسبة كتلة الجسم BMI", nameEn: "BMI Calculator", descAr: "اعرف لو وزنك في المعدل الصحي.", descEn: "Is your weight healthy?", icon: "bmi", href: "/tools/bmi-calculator" },
              { slug: "macro-calculator", nameAr: "حاسبة الماكروز", nameEn: "Macro Calculator", descAr: "وزّع بروتين وكارب ودهون يومك بسهولة.", descEn: "Protein, carbs, fat", icon: "macros", href: "/tools/macro-calculator" },
              { slug: "body-fat-calculator", nameAr: "حاسبة نسبة الدهون", nameEn: "Body Fat %", descAr: "تابع تقدمك بمقاييس حقيقية مش بس بالميزان.", descEn: "Your body fat %", icon: "bodyfat", href: "/tools/body-fat-calculator" },
              { slug: "water-tracker", nameAr: "متتبع الماء", nameEn: "Water Tracker", descAr: "سجل كوبساتك يومياً", descEn: "Log your daily cups", icon: "hydration", href: "/tools/water-tracker" },
              { slug: "meal-planner", nameAr: "مخطط الوجبات", nameEn: "Meal Planner", descAr: "ابني وجباتك بنفسك", descEn: "Build your own meals", icon: "mealplanner", href: "/meal-planner" },
            ].map((tool, i) => (
              <Reveal key={tool.slug} delay={i * 80}>
                <LandingToolCard tool={tool} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/tools" className="text-sm font-semibold underline decoration-[var(--edge)] underline-offset-4 transition-opacity hover:opacity-70" style={{ color: PALETTE.textPrim }}>
              {isAr ? "كل الأدوات ›" : "View all tools ›"}
            </a>
          </div>
        </div>
      </section>

      {/* Greek meander divider — mission §4 */}
      <div className="meander-divider" aria-hidden="true" />
      {/* ===================== 5. EXERCISE LIBRARY ===================== */}
      <section id="exercises" className="scroll-mt-20 bg-[var(--bg)] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "أكثر من 868 تمرين بانتظارك" : "Over 868 Exercises Await You"}
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
              { labelAr: "صدر", labelEn: "Chest", slug: "chest" },
              { labelAr: "ظهر", labelEn: "Back", slug: "back" },
              { labelAr: "أكتاف", labelEn: "Shoulders", slug: "shoulders" },
              { labelAr: "أرجل", labelEn: "Legs", slug: "legs" },
              { labelAr: "بايسبس", labelEn: "Biceps", slug: "biceps" },
              { labelAr: "ترايسبس", labelEn: "Triceps", slug: "triceps" },
              { labelAr: "بطن/كور", labelEn: "Core", slug: "core" },
            ].map((cat) => (
              <Reveal key={cat.slug}>
                <LandingExerciseCategoryCard
                  cat={{ ...cat, count: EXERCISE_CATEGORY_COUNTS[cat.slug] ?? 0 }}
                  isAr={isAr}
                />
              </Reveal>
            ))}
            {/* 8th tile — browse-all CTA (replaces the old button below) */}
            <Reveal>
              <a
                href={isAr ? "/ar/exercises" : "/exercises"}
                className="group flex h-full flex-col items-center justify-center rounded-3xl p-4 text-center transition-transform duration-300 hover:-translate-y-0.5"
                style={{ background: "var(--chrome)", border: "1px solid var(--chrome-edge)", color: "#0B0B0D", boxShadow: "var(--shadow)" }}
              >
                <EngravedIcon name="dumbbell" alt="" size={40} className="h-10 w-10" />
                <span className="mt-2 text-base font-semibold">{isAr ? "كل التمارين" : "All Exercises"}</span>
                <span className="mt-1 text-xs font-medium" style={{ color: "#3F444A" }}>
                  {EXERCISES_COUNT.toLocaleString()}+ {isAr ? "تمرين" : "exercises"}
                </span>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Greek meander divider — mission §4 */}
      <div className="meander-divider" aria-hidden="true" />

      {/* ===================== 6. WORKOUT PROGRAMS ===================== */}
      <section id="programs" className="scroll-mt-20 bg-[var(--tint)] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "برامج تدريب جاهزة لكل الأهداف" : "Ready-Made Programs for Every Goal"}
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
              { icon: "house", levelAr: "مبتدئ", levelEn: "Beginner", titleAr: "منزلي بدون معدات", titleEn: "Home (No Equipment)", descAr: "تمارين بالوزن فقط", descEn: "Bodyweight only", slug: "home-beginner-fullbody", image: "/images/programs/home-workout.png" },
              { icon: "rack", levelAr: "متوسط", levelEn: "Intermediate", titleAr: "جيم كامل", titleEn: "Full Gym", descAr: "بمعدات كاملة", descEn: "Full equipment", slug: "gym-ppl-intermediate", image: "/images/programs/full-gym.png" },
              { icon: "runner", levelAr: "متقدم", levelEn: "Advanced", titleAr: "حرق دهون HIIT", titleEn: "Fat Loss HIIT", descAr: "حارب الدهون بسرعة", descEn: "Burn fat fast", slug: "home-fat-loss-hiit", image: "/images/programs/hiit.png" },
            ].map((prog, i) => (
              <Reveal key={prog.slug} delay={i * 100}>
                <LandingProgramCard prog={prog} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/programs" className="btn-chrome px-6 py-2.5 text-sm">
              {isAr ? "كل البرامج ›" : "View all programs ›"}
            </a>
          </div>
        </div>
      </section>

      {/* Greek meander divider — mission §4 */}
      <div className="meander-divider" aria-hidden="true" />

      {/* ===================== 7. FOOD LIBRARY ===================== */}
      <section id="foods" className="scroll-mt-20 bg-[var(--bg)] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {isAr ? "أكثر من 8830 صنفاً غذائياً" : "Over 8,830 Food Items"}
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
              { icon: "protein", titleAr: "بروتين", titleEn: "Protein", descAr: "لحم، دجاج، بيض", descEn: "Meat, chicken, eggs", slug: "protein", image: "/images/categories/foods/protein.png" },
              { icon: "carbs", titleAr: "كارب", titleEn: "Carbs", descAr: "أرز، شوفان، بطاطس", descEn: "Rice, oats, potato", slug: "carb", image: "/images/categories/foods/carb.png" },
              { icon: "fats", titleAr: "دهون", titleEn: "Fats", descAr: "أفوكادو، مكسرات", descEn: "Avocado, nuts", slug: "fat", image: "/images/categories/foods/fat.png" },
              { icon: "fruits", titleAr: "فواكه", titleEn: "Fruits", descAr: "طازجة وصحية", descEn: "Fresh and healthy", slug: "fruit", image: "/images/categories/foods/fruit.png" },
            ].map((cat, i) => (
              <Reveal key={cat.titleEn} delay={i * 80}>
                <LandingFoodCategoryCard cat={cat} isAr={isAr} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href={isAr ? "/ar/foods" : "/foods"} className="btn-chrome px-6 py-2.5 text-sm">
              {isAr ? "تصفّح كل الأكلات ›" : "Browse all foods ›"}
            </a>
          </div>
        </div>
      </section>

      {/* ===================== 8. BLOG (raised higher) — Latest + Featured carousels ===================== */}
      {latestPosts.length > 0 && (
        <>

      {/* Greek meander divider — mission §4 */}
      <div className="meander-divider" aria-hidden="true" />
        <section id="blog" className="scroll-mt-20 bg-[var(--tint)] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            {/* Latest Posts — carousel with light cards */}
            <div>
              <Reveal>
                <div className="mb-6 flex items-end justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
                    {isAr ? "اقرأ أحدث المقالات العلمية" : "Read the Latest Scientific Articles"}
                  </h2>
                  <a href={blogHref} className="text-sm font-semibold underline decoration-[var(--edge)] underline-offset-4 transition-opacity hover:opacity-70" style={{ color: PALETTE.textPrim }}>
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
      <section id="coaching" className="scroll-mt-20 bg-[var(--bg)] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Reveal>
              <span className="seal-chip">{isAr ? "كوتشينج أونلاين" : "ONLINE COACHING"}</span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "كوتشينج حقيقي، مش مجرد PDF" : "Real Coaching, Not Just a PDF"}
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
                      style={{ backgroundColor: "var(--tint)", color: "var(--text)" }}
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
              <a href="/coaching" className="btn-chrome px-6 py-2.5 text-sm">
                {isAr ? "اعرف أكثر ›" : "Learn more ›"}
              </a>
              <a href={isAr ? "/ar/memberships" : "/memberships"} className="btn-outline px-6 py-2.5 text-sm font-normal">
                {isAr ? "الأسعار" : "Pricing"}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 9.5 FEATURED COACHES («أعلن معنا» ads) ===================== */}
      {featuredCoaches.length > 0 && (
        <section className="bg-[var(--tint)] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: PALETTE.textPrim }}>
              {isAr ? "تعرّف على مدربينا المعتمدين" : "Meet Our Certified Coaches"}
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
                        className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-[var(--tint)]"
                      />
                    ) : (
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--edge)] bg-[var(--tint)] text-xl font-semibold text-[var(--text)]">
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
                className="btn-chrome px-8 py-3.5 text-base"
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
              {isAr ? "اختر الباقة المناسبة لك" : "Choose the Right Plan for You"}
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
                className="marble-card group flex h-full flex-col p-7 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>
                    {isAr ? "بريميوم" : "Premium"}
                  </h3>
                  <div className="flex items-end gap-1">
                    <span className="chrome-text text-2xl font-bold tracking-tight">$14.99</span>
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--text)" }} aria-hidden="true" />
                      <span style={{ color: PALETTE.textSec }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <span
                    className="btn-chrome flex w-full items-center justify-center gap-2 px-6 py-3 text-sm"
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
                className="marble-card group relative flex h-full flex-col p-7 transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  backgroundColor: "#0B0B0D",
                  color: "#F5F5F7",
                  border: "2px solid transparent",
                  backgroundImage:
                    "linear-gradient(#0B0B0D, #0B0B0D), linear-gradient(145deg, #FDFDFD 0%, #C9CED3 35%, #878E94 50%, #E6E9EC 70%, #9AA0A6 100%)",
                  backgroundOrigin: "border-box",
                  backgroundClip: "padding-box, border-box",
                }}
              >
                {/* 2px chrome ring (mission §12) — implemented as the gradient
                    border above; the old blue glow removed */}
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight text-white">{isAr ? "برو" : "Pro"}</h3>
                    <span className="seal-chip" style={{ color: "#F5F5F7", borderColor: "#3A3F45" }}>
                      <EngravedIcon name="laurel" alt="" size={12} className="h-3 w-3" />
                      {isAr ? "الأكثر شعبية" : "Popular"}
                    </span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="chrome-text text-3xl font-bold tracking-tight">$29.99</span>
                    <span className="pb-1 text-xs font-normal text-[#9BA0A6]">/{isAr ? "شهر" : "mo"}</span>
                  </div>
                </div>
                <p className="relative mt-3 text-sm font-normal leading-relaxed text-[#9BA0A6]">
                  {isAr ? "للمتقدمين اللي عايزين أقصى استفادة من المنصة." : "For advanced users who want the most out of the platform."}
                </p>
                <ul className="relative mt-5 space-y-2.5 text-sm">
                  {(isAr
                    ? ["كل مميزات Premium", "8 خطط تغذية/تمرين شهرياً (بحد أسبوعي 2+2)", "6 تبديلات أسبوعياً", "200 نتيجة محفوظة", "بدون إعلانات"]
                    : ["Everything in Premium", "8 nutrition/workout plans per month (weekly cap 2+2)", "6 swaps per week", "200 saved results", "No ads"]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#C9CED3" }} aria-hidden="true" />
                      <span className="text-[#B9BEC4]">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-auto pt-7">
                  <span
                    className="btn-chrome flex w-full items-center justify-center gap-2 px-6 py-3.5 text-base"
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
              directive; the Alkemos column is visually highlighted. */}
          <Reveal delay={450}>
            <div className="mt-12">
              <h3 className="text-center text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "ليه Alkemos؟ مقارنة سريعة" : "Why Alkemos? A quick comparison"}
              </h3>
              {/* Phase 131 (owner feedback «جدول المقارنه حاليا يشبة الكروت،
                  عدلة الى شكل جدول»): ONE real <table> at EVERY
                  breakpoint — the Phase 128 mobile card stack is GONE.
                  Compact cells below md (text-xs + tighter padding) and
                  wrapped text keep the 4-column grid readable on phones
                  with zero cutoff; md+ keeps the roomy original sizing.
                  The Alkemos column keeps the tint + chrome inline
                  borders; the trainer header uses a short label below md
                  so the header row stays one line. */}
              <div className="marble-card mt-6 overflow-x-auto" style={{ borderRadius: "var(--radius-chrome)" }}>
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr style={{ backgroundColor: PALETTE.sectionGray }}>
                      <th className="p-2.5 text-start font-medium md:p-4" style={{ color: PALETTE.textSec }}>
                        {isAr ? "الميزة" : "Feature"}
                      </th>
                      <th className="p-2.5 text-center font-semibold md:p-4" style={{ color: "var(--text)" }}>
                        <span className="inline-flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local fixed asset (helmet mark, 16px decorative) */}
                          <img
                            src="/images/brand/mark-helmet.png"
                            alt=""
                            width={16}
                            height={16}
                            className="h-4 w-4 object-contain"
                            aria-hidden="true"
                          />
                          Alkemos
                        </span>
                      </th>
                      <th className="p-2.5 text-center font-medium md:p-4" style={{ color: PALETTE.textSec }}>
                        {/* Short label below md so the header stays one line */}
                        <span className="md:hidden">{isAr ? "مدرب تقليدي" : "Trainer"}</span>
                        <span className="hidden md:inline">{isAr ? "مدرب شخصي تقليدي" : "Traditional personal trainer"}</span>
                      </th>
                      <th className="p-2.5 text-center font-medium md:p-4" style={{ color: PALETTE.textSec }}>
                        {isAr ? "تطبيقات مجانية" : "Free apps"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${PALETTE.border}99` }}>
                        <td className="p-2.5 text-start font-medium md:p-4" style={{ color: PALETTE.textPrim }}>
                          {isAr ? row.featureAr : row.featureEn}
                        </td>
                        <td
                          className="p-2.5 text-center align-middle md:p-4"
                          style={{ backgroundColor: "var(--tint)", borderInline: "var(--border-chrome)" }}
                        >
                          {renderCmpValue(row.us, true)}
                        </td>
                        <td className="p-2.5 text-center align-middle md:p-4">
                          {renderCmpValue(isAr ? row.tradAr : row.tradEn, false)}
                        </td>
                        <td className="p-2.5 text-center align-middle md:p-4">
                          {renderCmpValue(isAr ? row.appsAr : row.appsEn, false)}
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
      <section id="affiliate" className="scroll-mt-20 bg-[var(--bg)] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span className="seal-chip">{isAr ? "برنامج الأفلييت" : "AFFILIATE PROGRAM"}</span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl" style={{ color: PALETTE.textPrim }}>
                {isAr ? "حوّل تأثيرك إلى دخل حقيقي" : "Turn Your Influence into Real Income"}
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
                  <div key={s.d} className="marble-card flex flex-col items-center gap-1 p-6 text-center">
                    {/* Engraved seal chip stat (mission §13) */}
                    <span className="seal-chip">{s.v}</span>
                    <p className="mt-2 text-xs font-normal leading-relaxed" style={{ color: PALETTE.textSec }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div className="mt-8">
                <a
                  href="/affiliate"
                  className="btn-chrome px-8 py-3.5 text-base"
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
      <section className="bg-[var(--bg)] px-4 py-16 md:py-20">
        <Reveal>
          <div className="marble-card mx-auto max-w-3xl px-6 py-12 text-center md:py-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl" style={{ color: PALETTE.textPrim }}>
              {isAr
                ? "ابدأ رحلتك دلوقتي مجانًا.. مالكش عذر تأجل بعد اليوم"
                : "Start your journey free today — no excuse to wait"}
            </h2>
            <a
              href={isAr ? "/ar/memberships" : "/memberships"}
              className="btn-chrome mt-8 px-9 py-4 text-base"
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
      <section id="faq" className="scroll-mt-20 bg-[var(--tint)] px-4 py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "أسئلة شائعة وإجاباتها" : "Frequently Asked Questions"}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <Accordion type="single" collapsible className="mt-12">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-[var(--edge)]">
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
      <section className="bg-[var(--bg)] px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <NewsletterForm variant="home" />
        </div>
      </section>

      {/* ===================== FOOTER — Phase 132 (owner feedback
          2026-09-06: «الفوتر محتاج تعديل الخلفية ولون الكتابة — لايت مود
          خلفية الرخام الفاتح وكتابة سوداء، دارك مود خلفية رخام أسود
          وكتابة أبيض»): the marble slab, meander divider, lockup and
          text are now THEME-AWARE (light = light marble + black lockup +
          black text; dark = black marble + white lockup + white text) via
          the marble/meander CSS vars — no re-render needed on toggle.
          Phase 131 (owner feedback 2026-09-06: «تعديل الفوتر الى قوائم
          بدلاً من صف واحد»): the link groups are menu-style LISTS in a
          responsive grid — 2 columns on phones, 3 on tablets, 6 columns
          (brand + 5 lists) on desktop. The Legal & Basic links moved OUT
          of the old single horizontal bottom row INTO the list grid as
          the 5th menu, so every footer link now lives in a vertical
          list. ===================== */}
      <footer className="footer-marble relative px-4 pb-10 pt-12 text-[var(--muted-foreground)]">
        {/* Meander divider on the top edge (mission §14) */}
        <div className="footer-meander-top absolute inset-x-0 top-0" aria-hidden="true" />
        <div className="mx-auto max-w-6xl">
          {/* Removed (owner feedback 2026-09-03): footer newsletter card —
              it duplicated section 13 directly above the footer («النشرة
              البريدية المجانية مكررة في الصفحة الرئيسية»). Section 13 is the
              single newsletter surface. Removed earlier (2026-08-30): «أنت
              مدرب؟» footer CTA strip — it duplicated section 9.7 (same
              headline + same /for-coaches link). The rich dark section is
              the single coach funnel entry. */}

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-x-8">
            {/* Brand — theme-aware lockup (Phase 132): the black footer
                lockup on light marble / the white one on black marble,
                rendered as a ThemeImg pair so CSS swaps it with zero
                hydration flicker. Spans the full row below lg so the
                lists pair up cleanly. */}
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <ThemeImg
                light="/images/brand/logo-footer-black.png"
                dark="/images/brand/logo-footer-white.png"
                alt="Alkemos"
                width={140}
                height={110}
                className="h-10 w-auto object-contain"
              />
              <p className="mt-3 text-xs font-normal">{isAr ? "اصنع قوّتك الأسطورية." : "Forge Your Legendary Strength."}</p>
              <p className="mt-3 text-[10px] font-normal text-[var(--muted-foreground)]">{isAr ? "© 2026 جميع الحقوق محفوظة" : "© 2026 All rights reserved"}</p>
            </div>

            {/* List 1: Paid Services */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text)]">{isAr ? "الخدمات المدفوعة" : "Paid Services"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/coaching" className="hover:underline">{isAr ? "الكوتشينج" : "Coaching"}</a></li>
                <li><a href={isAr ? "/ar/memberships" : "/memberships"} className="hover:underline">{isAr ? "العضويات" : "Memberships"}</a></li>
                <li><a href="/evo" className="hover:underline">EVO AI Coach</a></li>
              </ul>
            </div>

            {/* List 2: Affiliate & Referral */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text)]">{isAr ? "الأفلييت والإحالات" : "Affiliate & Referral"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/affiliate" className="hover:underline">{isAr ? "برنامج الأفلييت" : "Affiliate Program"}</a></li>
                <li><a href="/referral" className="hover:underline">{isAr ? "لوحة الإحالات" : "Referral Dashboard"}</a></li>
              </ul>
            </div>

            {/* List 3: Tools */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text)]">{isAr ? "الأدوات" : "Tools"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="/tools/bmi-calculator" className="hover:underline">{isAr ? "حاسبة BMI" : "BMI Calculator"}</a></li>
                <li><a href="/tools/body-fat-calculator" className="hover:underline">{isAr ? "حاسبة الدهون" : "Body Fat Calculator"}</a></li>
                <li><a href="/tools/calorie-calculator" className="hover:underline">{isAr ? "حاسبة السعرات" : "Calorie Calculator"}</a></li>
                <li><a href="/tools/macro-calculator" className="hover:underline">{isAr ? "حاسبة الماكروز" : "Macro Calculator"}</a></li>
                <li><a href="/tools/water-tracker" className="hover:underline">{isAr ? "متتبع الماء" : "Water Tracker"}</a></li>
                <li><a href="/meal-planner" className="hover:underline">{isAr ? "مخطط الوجبات" : "Meal Planner"}</a></li>
              </ul>
            </div>

            {/* List 4: Resources */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text)]">{isAr ? "المحتوى" : "Resources"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href={isAr ? "/ar/exercises" : "/exercises"} className="hover:underline">{isAr ? "مكتبة التمارين" : "Exercises"}</a></li>
                <li><a href="/programs" className="hover:underline">{isAr ? "برامج التدريب" : "Programs"}</a></li>
                <li><a href={isAr ? "/ar/foods" : "/foods"} className="hover:underline">{isAr ? "مكتبة الأكلات" : "Foods"}</a></li>
                <li><a href={isAr ? "/ar/blog" : "/blog"} className="hover:underline">{isAr ? "المدونة" : "Blog"}</a></li>
              </ul>
            </div>

            {/* List 5: Legal & Basic — moved from the old single horizontal
                bottom row into the list grid (Phase 131; per Owner directive
                2026-08-25 these pages live in the footer only, not in the
                header) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text)]">{isAr ? "قانوني وأساسي" : "Legal & Basic"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                {/* Audit 2026-08-30: was navigate() buttons → always EN. Real links
                    now, AR-aware for pages that have Arabic mirrors. */}
                <li><a href={isAr ? "/ar/about" : "/about"} className="hover:underline">{isAr ? "من نحن" : "About"}</a></li>
                <li><a href="/contact" className="hover:underline">{isAr ? "تواصل معنا" : "Contact"}</a></li>
                <li><a href={isAr ? "/ar/faq" : "/faq"} className="hover:underline">{isAr ? "أسئلة شائعة" : "FAQ"}</a></li>
                <li><a href="/privacy" className="hover:underline">{isAr ? "الخصوصية" : "Privacy"}</a></li>
                <li><a href="/terms" className="hover:underline">{isAr ? "الشروط" : "Terms"}</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--edge)] pt-4 text-center text-[10px] text-[var(--muted-foreground)]">
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
  icon: string; // engraved icon pair name (mission §6)
  href: string;
};

type LandingExerciseCategory = {
  slug: string;
  labelAr: string;
  labelEn: string;
  count: number;
};

type LandingProgram = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: string;     // engraved icon pair (house / rack / runner — mission §8)
  levelAr: string;  // level → laurel badge (mission §8)
  levelEn: string;
};

type LandingFoodCategory = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: string; // engraved icon pair (protein / carbs / fats / fruits — mission §9)
};

// ─── Helper components (conditional rendering — no display:none in DOM) ───

function LandingToolCard({ tool, isAr }: { tool: LandingTool; isAr: boolean }) {
  return (
    <a
      href={tool.href}
      className="marble-card group flex items-center gap-4 p-6 transition-transform duration-300 hover:-translate-y-0.5"
    >
      {/* Engraved icon pair (mission §6: flame / scale / pie / silhouette+% / cup / plate) */}
      <EngravedIcon
        name={tool.icon}
        alt={isAr ? tool.nameAr : tool.nameEn}
        size={56}
        className="h-14 w-14 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? tool.nameAr : tool.nameEn}</h3>
        <p className="mt-1 text-sm font-normal" style={{ color: PALETTE.textSec }}>{isAr ? tool.descAr : tool.descEn}</p>
      </div>
      {/* Arrow "›" in chrome (mission §6) */}
      <span className="chrome-text shrink-0 text-2xl font-semibold" aria-hidden="true">›</span>
    </a>
  );
}

function LandingExerciseCategoryCard({ cat, isAr }: { cat: LandingExerciseCategory; isAr: boolean }) {
  return (
    <a
      href={`${isAr ? "/ar" : ""}/exercises?cat=${cat.slug}`}
      className="marble-card group flex flex-col items-center justify-center gap-1.5 p-5 text-center transition-transform duration-300 hover:-translate-y-0.5"
    >
      {/* Small doric-column icon per category (mission §7) */}
      <EngravedIcon name="doric" alt="" size={34} className="h-8 w-8 opacity-90" />
      <h3 className="text-base font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? cat.labelAr : cat.labelEn}</h3>
      {/* Category number in chrome-gradient text (mission §7) */}
      <p className="chrome-text text-2xl font-bold tracking-tight">{cat.count}</p>
    </a>
  );
}

function LandingProgramCard({ prog, isAr }: { prog: LandingProgram; isAr: boolean }) {
  return (
    <a
      href={`/programs/${prog.slug}`}
      className="marble-card group relative flex flex-col p-6 transition-transform duration-300 hover:-translate-y-0.5"
    >
      {/* Faded stadium backdrop — evo-card artwork blurred at 12% opacity
          (mission §8). Theme-swapped CSS background; purely decorative. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] blur-[2px]"
        aria-hidden="true"
        style={{
          backgroundImage: "var(--prog-backdrop)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        {/* Engraved icon (house / rack / runner — mission §8) */}
        <EngravedIcon name={prog.icon} alt="" size={56} className="h-14 w-14 shrink-0" />
        {/* Laurel badge for the level (mission §8) */}
        <span className="seal-chip shrink-0">
          <EngravedIcon name="laurel" alt="" size={14} className="h-3.5 w-3.5" />
          {isAr ? prog.levelAr : prog.levelEn}
        </span>
      </div>
      <h3 className="relative mt-4 text-lg font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? prog.titleAr : prog.titleEn}</h3>
      <p className="relative mt-1 text-sm font-normal" style={{ color: PALETTE.textSec }}>{isAr ? prog.descAr : prog.descEn}</p>
      <p className="chrome-text relative mt-4 text-sm font-semibold">{isAr ? "ابدأ الآن ›" : "Start now ›"}</p>
    </a>
  );
}

function LandingFoodCategoryCard({ cat, isAr }: { cat: LandingFoodCategory; isAr: boolean }) {
  return (
    <a
      href={`${isAr ? "/ar" : ""}/foods?cat=${cat.slug}`}
      className="marble-card group flex flex-col items-center justify-center gap-2 p-6 text-center transition-transform duration-300 hover:-translate-y-0.5"
    >
      {/* Engraved icon pair (mission §9: protein=steak / carbs=wheat / fats=avocado / fruits=olive branch) */}
      <EngravedIcon
        name={cat.icon}
        alt={isAr ? cat.titleAr : cat.titleEn}
        size={64}
        className="h-16 w-16"
      />
      <h3 className="text-base font-semibold tracking-tight" style={{ color: PALETTE.textPrim }}>{isAr ? cat.titleAr : cat.titleEn}</h3>
      <p className="mt-0.5 text-xs font-normal" style={{ color: PALETTE.textSec }}>{isAr ? cat.descAr : cat.descEn}</p>
    </a>
  );
}
