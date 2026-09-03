/**
 * SEO Utilities — structured data (JSON-LD) for search engines + AI.
 *
 * This file centralizes all structured data schemas so they're consistent
 * across pages. Each function returns a JSON-LD object that can be injected
 * into a page's <script type="application/ld+json"> tag.
 *
 * Schemas included:
 *   - Organization (site-wide)
 *   - WebSite (site-wide, with SearchAction)
 *   - Service (for coaching page)
 *   - FAQPage (⚠️ DEPRECATED — Google retired rich results May 2026)
 *   - BreadcrumbList (for navigation)
 *   - HowTo (⚠️ DEPRECATED — Google retired rich results Sept 2023)
 *   - Article (for blog posts)
 *   - SoftwareApplication (for EVO AI coach)
 *   - ExerciseAction (for exercise detail pages)
 *   - ItemList (for list pages)
 *
 * Reference: docs/SEO-SCHEMA-REFERENCE.md (from claude-seo project)
 */

const SITE_URL = "https://musclehubeg.vercel.app";
const SITE_NAME = "Musclehubeg";
const SITE_LOGO = `${SITE_URL}/logo.png`;

/**
 * Organization schema — describes the company/site.
 * Used on all pages (in layout.tsx).
 *
 * Phase 117 completion (owner directive 2026-09-04): Organization is the
 * FINAL schema choice INSTEAD of LocalBusiness — the owner confirmed
 * there is no local business activity and the project is global.
 * Owner-required fields: name · url · logo · description (short version
 * of the homepage atomic answer) · sameAs. Deliberately NO address /
 * phone / geo fields. sameAs carries ONLY the canonical site URL: a
 * repo-wide search found no OWNED social profiles (facebook/twitter/t.me
 * hits are share-button targets, not profiles) — the owner said to add
 * social links "إن وجدت" (if found) and none exist. areaServed:
 * Worldwide + knowsLanguage stay (global reach, not local presence).
 */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    description:
      "منصة التدريب الرقمي المتكاملة: أكثر من 868 تمرينًا، 8830 أكلة بالقيم الغذائية، برامج جاهزة، حاسبات مجانية، ومدربون معتمدون مع ذكاء اصطناعي EVO.",
    sameAs: [
      "https://musclehubeg.vercel.app",
    ],
    areaServed: "Worldwide",
    knowsLanguage: ["ar", "en"],
  };
}

/**
 * WebSite schema — describes the website with search action.
 * Enables Google sitelinks search box.
 */
export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "منصة رياضية شاملة: مكتبة تمارين، برامج تدريب، حاسبات لياقة، مكتبة أكلات، ومدونة رياضية.",
    inLanguage: ["ar", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/blog?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Service schema — for the coaching page.
 * Describes the coaching service without naming specific coaches.
 */
export function getCoachingServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Coaching Online — مدربين وأخصائيين تغذية",
    serviceType: "Nutrition and Fitness Coaching",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: "Worldwide",
    description:
      "كوتشينج أونلاين مع مدربين وأخصائيين تغذية محترفين. خطط تغذية مخصصة، برامج تمارين متكيفة، متابعة شخصية، ومساعد ذكاء اصطناعي (EVO) متاح 24/7.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "20",
      highPrice: "40",
      offerCount: "2",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "500",
    },
  };
}

/**
 * SoftwareApplication schema — for EVO AI coach.
 * Describes EVO as an AI application, not just a chatbot.
 */
export function getEVOApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EVO — AI Coach",
    applicationCategory: "Health & Fitness Application",
    operatingSystem: "Web",
    description:
      "EVO هو محرك أداء ذكي — ليس مجرد شات بوت. يقرأ بياناتك الصحية وهدفك، يبني لك خطط تغذية وتمارين مخصصة، ويقترح تبديلات ذكية، ويوفر استشارات لياقة وتغذية 24/7 عبر الذكاء الاصطناعي.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "مجاني للجميع",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "300",
    },
    featureList: [
      "بناء خطط تغذية وتمارين مخصصة من بياناتك",
      "استشارات لياقة وتغذية فورية 24/7",
      "تبديل الوجبات والتمارين بذكاء",
      "تتبع تقدمك ووزنك وقياساتك",
      "متاح للزوار والمشتركين",
    ],
  };
}

/**
 * FAQPage schema — for FAQ sections.
 *
 * ⚠️ DEPRECATED (per SEO-SCHEMA-REFERENCE.md, May 2026):
 * Google retired FAQ rich results for ALL sites on May 7, 2026.
 * This schema no longer produces any SERP feature.
 * Kept for non-Google semantic value only — do NOT add new FAQPage
 * schemas expecting Google rich results.
 * For genuine user Q&A pages, use QAPage instead.
 */
export function getFAQSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

/**
 * BreadcrumbList schema — for navigation breadcrumbs.
 */
export function getBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * HowTo schema — for tools and exercises.
 *
 * ⚠️ DEPRECATED (per SEO-SCHEMA-REFERENCE.md, September 2023):
 * Google stopped showing how-to rich results entirely since Sept 2023.
 * This schema no longer produces any SERP feature.
 * Kept for non-Google semantic value only — do NOT add new HowTo
 * schemas expecting Google rich results.
 */
export function getHowToSchema(params: {
  name: string;
  description: string;
  steps: string[];
  tool?: string[];
  estimatedCost?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    description: params.description,
    step: params.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
    ...(params.tool && { tool: params.tool }),
    ...(params.estimatedCost && {
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: params.estimatedCost,
      },
    }),
  };
}

/**
 * Article schema — for blog posts.
 */
export function getArticleSchema(params: {
  title: string;
  description: string;
  slug: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    image: params.image || SITE_LOGO,
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    author: {
      "@type": "Organization",
      name: params.author || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: SITE_LOGO,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${params.slug}`,
    },
  };
}

/**
 * Exercise schema — for exercise detail pages.
 * Combines HowTo + Exercise schema.
 */
export function getExerciseSchema(params: {
  name: string;
  description: string;
  muscles: string[];
  equipment: string;
  instructions: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ExerciseAction",
    name: params.name,
    description: params.description,
    exerciseType: "https://schema.org/ExerciseAction",
    equipment: params.equipment,
    muscleAction: params.muscles.join(", "),
    step: params.instructions.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
  };
}

/**
 * ItemList schema — for list pages (exercises, foods, programs).
 */
export function getItemListSchema(params: {
  name: string;
  description: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: params.name,
    description: params.description,
    itemListElement: params.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Helper: render JSON-LD as a script tag string.
 * Use in page components: <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}} />
 */
export function renderJsonLd(schema: object) {
  return JSON.stringify(schema);
}

export { SITE_URL, SITE_NAME, SITE_LOGO };
