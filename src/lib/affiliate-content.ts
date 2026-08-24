/**
 * Affiliate helpers — content templates, banner definitions, link builder.
 *
 * DESIGN:
 *   - All HTML embed code is generated server-side-style from TRUSTED
 *     templates (string templates in code). We NEVER accept arbitrary
 *     user HTML.
 *   - Dynamic values (affiliate URL, banner URL) are escaped before
 *     insertion to prevent XSS.
 *   - The brand name "MuscleHubEG" is intentionally never translated.
 *
 * SECURITY:
 *   - escapeHtml() is applied to all dynamic strings before they are
 *     placed into HTML attributes or text content.
 *   - The generated HTML always uses target="_blank" and
 *     rel="noopener noreferrer" to prevent tab-nabbing.
 *   - The user's affiliate code is included in the URL only — never in
 *     HTML attributes or script.
 */

import { COMMISSION_RATE, COOKIE_DURATION_DAYS } from "@/lib/referral";

// ─────────────────────────────────────────────────────────────────────────
// Canonical URL resolution
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve the canonical site origin (no trailing slash).
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL env (Vercel injects this — always the production
 *      URL on Vercel deployments)
 *   2. NEXT_PUBLIC_SITE_URL env
 *   3. https://musclehubeg.vercel.app (production fallback)
 *
 * IMPORTANT: Affiliate/referral links MUST always point to the production
 * domain (musclehubeg.vercel.app), NOT to the current window.location.origin.
 * If we used window.location.origin in a preview/dev environment, the
 * shared affiliate link would point to localhost:3000 or a preview URL —
 * breaking attribution (the ?ref=CODE cookie would be set on the wrong
 * domain) and confusing the recipient (they'd see a different site than
 * the marketed musclehubeg.vercel.app).
 *
 * The banner SVG URLs (getBannerUrl) also use this origin so that HTML
 * embed codes pasted on external websites load the banner from the
 * production CDN.
 */
export function getSiteOrigin(): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://musclehubeg.vercel.app";
  return env.replace(/\/$/, "");
}

/**
 * Build the user's personal Affiliate URL.
 *
 * Uses the project's existing ?ref=CODE attribution (30-day cookie).
 * The ?ref param is read by trackReferral() in src/lib/referral.ts
 * on signup and stored in the referrals table.
 */
export function buildAffiliateUrl(referralCode: string): string {
  const origin = getSiteOrigin();
  return `${origin}/?ref=${encodeURIComponent(referralCode)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// HTML escape
// ─────────────────────────────────────────────────────────────────────────

/**
 * Escape a string for safe insertion into HTML attribute values or text
 * content. Prevents XSS even if the value contains quotes, angle brackets,
 * or ampersands.
 *
 * Examples:
 *   escapeHtml(`a"b`) → "a&quot;b"
 *   escapeHtml(`a<b>&c`) → "a&lt;b&gt;&amp;c"
 */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────────────────────────────────
// Banner definitions
// ─────────────────────────────────────────────────────────────────────────

export type BannerFormat = {
  /** Stable ID, used as React key + analytics payload. */
  id: "horizontal" | "medium_rectangle" | "square" | "mobile";
  /** Localised display label (rendered in the UI). */
  label_en: string;
  label_ar: string;
  /** Recommended platform note (informational only). */
  platformHint_en: string;
  platformHint_ar: string;
  /** Banner width in pixels (IAB standard). */
  width: number;
  height: number;
  /** Path under /public/ to the static SVG asset. */
  assetPath: string;
};

export const BANNER_FORMATS: BannerFormat[] = [
  {
    id: "horizontal",
    label_en: "Horizontal Banner (728×90 — Leaderboard)",
    label_ar: "بانر أفقي (728×90 — Leaderboard)",
    platformHint_en: "Best for website headers, blog tops, desktop layouts.",
    platformHint_ar: "مثالي لرأس الموقع وأعلى المدونة وتخطيطات الديسكتوب.",
    width: 728,
    height: 90,
    assetPath: "/affiliate/banner-horizontal.svg",
  },
  {
    id: "medium_rectangle",
    label_en: "Medium Rectangle (300×250)",
    label_ar: "مستطيل متوسط (300×250)",
    platformHint_en: "Best for in-content placements, sidebars, and email.",
    platformHint_ar: "مثالي للوضع داخل المحتوى والشريط الجانبي والبريد الإلكتروني.",
    width: 300,
    height: 250,
    assetPath: "/affiliate/banner-medium-rectangle.svg",
  },
  {
    id: "square",
    label_en: "Square (250×250)",
    label_ar: "مربع (250×250)",
    platformHint_en: "Best for compact sidebars and social embeds.",
    platformHint_ar: "مثالي للشريط الجانبي المدمج ووسائل التواصل الاجتماعي.",
    width: 250,
    height: 250,
    assetPath: "/affiliate/banner-square.svg",
  },
  {
    id: "mobile",
    label_en: "Mobile Banner (320×50)",
    label_ar: "بانر موبايل (320×50)",
    platformHint_en: "Best for mobile websites and in-app placements.",
    platformHint_ar: "مثالي لمواقع الموبايل والإعلانات داخل التطبيقات.",
    width: 320,
    height: 50,
    assetPath: "/affiliate/banner-mobile.svg",
  },
];

/**
 * Build the FULL URL (origin + path) to a banner SVG asset.
 * This is the URL that gets embedded in the HTML embed code for external
 * websites to load.
 */
export function getBannerUrl(format: BannerFormat): string {
  return `${getSiteOrigin()}${format.assetPath}`;
}

// ─────────────────────────────────────────────────────────────────────────
// HTML embed code generation (TRUSTED TEMPLATES ONLY)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a paste-ready HTML embed code for an affiliate banner.
 *
 * Output is a small, validated HTML snippet:
 *   <a href="AFFILIATE_URL" target="_blank" rel="noopener noreferrer">
 *     <img src="BANNER_URL" alt="MuscleHubEG — Train smarter, eat better" width="W" height="H" style="..." />
 *   </a>
 *
 * Security:
 *   - affiliateUrl and bannerUrl are passed through escapeHtml() before
 *     insertion.
 *   - The user never sees or controls any HTML structure.
 *   - The anchor always uses target="_blank" and rel="noopener noreferrer"
 *     to prevent tab-nabbing attacks.
 *   - The <img> has a meaningful alt text for accessibility.
 */
export function buildBannerEmbedHtml(
  format: BannerFormat,
  affiliateUrl: string,
): string {
  const safeHref = escapeHtml(affiliateUrl);
  const safeSrc = escapeHtml(getBannerUrl(format));
  const alt = "MuscleHubEG — Train smarter, eat better, transform faster";

  return [
    `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`,
    `  <img`,
    `    src="${safeSrc}"`,
    `    alt="${escapeHtml(alt)}"`,
    `    width="${format.width}"`,
    `    height="${format.height}"`,
    `    style="display:block;border:0;max-width:100%;height:auto;"`,
    `    loading="lazy"`,
    `  />`,
    `</a>`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
// Ready-to-publish content templates
// ─────────────────────────────────────────────────────────────────────────

export type PromoTemplate = {
  /** Stable ID. */
  id: "instagram_facebook" | "whatsapp" | "short_social" | "long_social" | "story_caption";
  /** Localised platform label. */
  label_en: string;
  label_ar: string;
  /** Recommended platform description. */
  recommendedPlatform_en: string;
  recommendedPlatform_ar: string;
  /** Character count target (informational). */
  charLimit: number;
};

export const PROMO_TEMPLATES: PromoTemplate[] = [
  {
    id: "instagram_facebook",
    label_en: "Instagram / Facebook Post",
    label_ar: "منشور إنستجرام / فيسبوك",
    recommendedPlatform_en: "Instagram feed, Facebook page or group.",
    recommendedPlatform_ar: "فيد إنستجرام، صفحة فيسبوك أو مجموعة.",
    charLimit: 2200,
  },
  {
    id: "whatsapp",
    label_en: "WhatsApp Message",
    label_ar: "رسالة واتساب",
    recommendedPlatform_en: "WhatsApp broadcast lists and direct messages.",
    recommendedPlatform_ar: "قوائم البرودكاست والرسائل المباشرة على واتساب.",
    charLimit: 1000,
  },
  {
    id: "short_social",
    label_en: "Short Social Post",
    label_ar: "منشور قصير",
    recommendedPlatform_en: "X (Twitter), Threads, Mastodon, Telegram channel.",
    recommendedPlatform_ar: "إكس (تويتر)، ثريدز، ماستودون، قناة تيليجرام.",
    charLimit: 280,
  },
  {
    id: "long_social",
    label_en: "Long Social Post",
    label_ar: "منشور طويل",
    recommendedPlatform_en: "LinkedIn article, Facebook note, Substack, blog.",
    recommendedPlatform_ar: "مقال لينكدإن، ملاحظة فيسبوك، سبستاك، مدونة.",
    charLimit: 4000,
  },
  {
    id: "story_caption",
    label_en: "Story / Short Caption",
    label_ar: "ستوري / تعليق قصير",
    recommendedPlatform_en: "Instagram / Facebook / WhatsApp Story, Reels caption.",
    recommendedPlatform_ar: "ستوري إنستجرام / فيسبوك / واتساب، تعليق ريلز.",
    charLimit: 200,
  },
];

/**
 * Build a localised, ready-to-publish promotional copy string for the
 * given template, with the user's affiliate URL injected at the end.
 *
 * Honesty rules (enforced in copy):
 *   - No fake testimonials.
 *   - No guaranteed results.
 *   - No guaranteed income claims.
 *   - Always discloses the affiliate relationship.
 */
export function buildPromoCopy(
  template: PromoTemplate,
  affiliateUrl: string,
  isAr: boolean,
): string {
  const url = affiliateUrl;

  if (isAr) {
    switch (template.id) {
      case "instagram_facebook":
        return [
          "🎯 لو بتدور على طريقة أذكى للتدريب والتغذية، MuscleHubEG هي المنصة اللي هتدعمك فيها خطوة بخطوة.",
          "",
          "✅ خطة أكلك وتمارينك مخصصة لهدفك",
          "✅ تتبع تقدمك أسبوعيًا بالصور والمقاسات",
          "✅ كوتش ذكاء اصطناعي يرد على أسئلتك في أي وقت",
          "✅ قاعدة بيانات ضخمة لتمارين وأكلات صحية",
          "",
          "جربها بنفسك من خلال رابطي 👇",
          url,
          "",
          "#لياقة #تغذية #تدريب #كوتشينج #MuscleHubEG",
          "",
          "(إفصاح: الرابط ده affiliate link — أقدر أكسب عمولة من عمليات الشراء المؤهلة.)",
        ].join("\n");

      case "whatsapp":
        return [
          "إيه الأخبار؟ 👋",
          "",
          "حابب أشاركك MuscleHubEG — منصة لياقة وتغذية بذكاء اصطناعي.",
          "بتديك خطط أكل وتمارين حسب هدفك + كوتش AI يرد عليك في أي وقت + تتبع تقدم أسبوعي.",
          "",
          "لو مهتم، سجل من رابطي:",
          url,
          "",
          "(إفصاح: ده رابط affiliate، وممكن أكسب عمولة من اشتراكات أهل لها.)",
        ].join("\n");

      case "short_social":
        return [
          "بتدور على طريقة أذكى للتغذية والتدريب؟ 💪",
          "",
          "MuscleHubEG بتعطيك خطط مخصصة + كوتش AI + تتبع تقدم. جرّب:",
          url,
          "",
          "#لياقة #تغذية #MuscleHubEG",
          "(رابط affiliate — ممكن أكسب عمولة من الشراء المؤهل.)",
        ].join("\n");

      case "long_social":
        return [
          "بناء عادات صحية حقيقية مش موضوع ساعة في الجيم. ده موضوع استمرارية، وعقلانية في الأكل، وتتبع صادق للتقدم.",
          "",
          "عرفت MuscleHubEG من فترة وقررت أجربها. إليك ليه حسّيت إنها مختلفة:",
          "",
          "1️⃣ خطط مخصصة فعلاً: مش PDF عام. الخطط بتتعمل حسب وزنك، هدفك، equipment اللي عندك، وأكلاتك المفضلة.",
          "2️⃣ كوتش AI متاح 24/7: مفيش انتظار لرد. اسأل في أي وقت عن بديل أكل، طريقة تمرين، أو تعديل خطتك.",
          "3️⃣ تتبع أسبوعي حقيقي: صور، مقاسات، وزن، ومخططات بتوريك تقدمك بصريًا — ده اللي بيحمّسك تستمر.",
          "4️⃣ محتوى علمي: مش اسكتشات. معلومات مدروسة، ومراجع، وطريقة شرح واضحة.",
          "",
          "مفيش وعود بأرقام معينة. النتائج بتعتمد على التزامك. بس الأدوات هناك، والتجربة مريحة جدًا.",
          "",
          "لو حابب تجربها، سجل من هنا:",
          url,
          "",
          "(إفصاح كامل: الرابط ده affiliate link — لو سجلت عن طريقه واشتريت، ممكن أكسب عمولة. ده ما بيأثرش في سعر اشتراكك.)",
        ].join("\n");

      case "story_caption":
        return [
          "بتدور على كوتش لياقة وتغذية ذكي؟ 💪",
          "MuscleHubEG — خطط مخصصة + كوتش AI + تتبع تقدم.",
          "جرّب:",
          url,
          "(رابط affiliate)",
        ].join("\n");
    }
  }

  // English copy
  switch (template.id) {
    case "instagram_facebook":
      return [
        "🎯 If you've been looking for a smarter way to train and eat, MuscleHubEG is the platform that supports you every step of the way.",
        "",
        "✅ Personalized meal and training plans for your goal",
        "✅ Weekly progress tracking with photos and measurements",
        "✅ An AI coach that answers your questions anytime",
        "✅ A massive library of exercises and healthy foods",
        "",
        "Try it for yourself through my link 👇",
        url,
        "",
        "#fitness #nutrition #training #coaching #MuscleHubEG",
        "",
        "(Disclosure: This is an affiliate link — I may earn a commission from qualifying purchases.)",
      ].join("\n");

    case "whatsapp":
      return [
        "Hey 👋",
        "",
        "Wanted to share MuscleHubEG with you — an AI-powered fitness and nutrition platform.",
        "It gives you personalized meal + training plans, a 24/7 AI coach, and weekly progress tracking.",
        "",
        "If you're interested, sign up through my link:",
        url,
        "",
        "(Disclosure: this is an affiliate link — I may earn a commission on qualifying subscriptions.)",
      ].join("\n");

    case "short_social":
      return [
        "Looking for a smarter way to train and eat? 💪",
        "",
        "MuscleHubEG gives you personalized plans + an AI coach + progress tracking. Try it:",
        url,
        "",
        "#fitness #nutrition #MuscleHubEG",
        "(Affiliate link — I may earn a commission on qualifying purchases.)",
      ].join("\n");

    case "long_social":
      return [
        "Building real healthy habits isn't about an hour in the gym. It's about consistency, sane eating, and honest progress tracking.",
        "",
        "I discovered MuscleHubEG a while ago and decided to give it a try. Here's why it felt different:",
        "",
        "1️⃣ Truly personalized plans: not a generic PDF. Plans are built around your weight, your goal, your equipment, and the foods you actually like.",
        "2️⃣ A 24/7 AI coach: no waiting for a reply. Ask anytime about food swaps, exercise form, or plan adjustments.",
        "3️⃣ Honest weekly tracking: photos, measurements, weight, and charts that show your progress visually — that's what keeps you going.",
        "4️⃣ Science-backed content: not random tips. Studied information, with references, and clear explanations.",
        "",
        "No guaranteed results — that depends on your commitment. But the tools are there, and the experience is genuinely comfortable.",
        "",
        "If you'd like to try it, sign up here:",
        url,
        "",
        "(Full disclosure: this is an affiliate link — if you sign up through it and purchase, I may earn a commission. This does not affect your subscription price.)",
      ].join("\n");

    case "story_caption":
      return [
        "Looking for a smart fitness + nutrition coach? 💪",
        "MuscleHubEG — personalized plans + AI coach + progress tracking.",
        "Try it:",
        url,
        "(Affiliate link)",
      ].join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Public program facts (used by the public Affiliate Program page)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Static, language-neutral facts about the Affiliate Program.
 * Used by both the public Affiliate Program page (EN + AR copy) and
 * the authenticated Affiliate dashboard.
 */
export const AFFILIATE_PROGRAM_FACTS = {
  commissionRate: COMMISSION_RATE, // 0.20
  cookieDurationDays: COOKIE_DURATION_DAYS, // 30
  minimumPayoutUsd: 10,
} as const;
