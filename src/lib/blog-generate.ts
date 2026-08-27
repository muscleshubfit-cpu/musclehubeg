/**
 * Shared article-bundle generator.
 *
 * Originally extracted for the retired manual editor endpoint; since the
 * 2026-08-27 consolidation it serves ONLY the native GitHub Actions
 * pipeline (.github/workflows/generate-blog-post.yml → p0…p5 via
 * scripts/blog-runner) — Vercel routes must never import model-calling
 * code (AGENTS.md §8 topology law; EVO chat is the sole exception).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SPEED OPTIMIZATION (Phase 6, 2026-08-19):
 * The previous single-call approach (50s timeout, 4000 tokens) was timing
 * out on Vercel Hobby plan (60s function limit) and producing truncated
 * articles because the 550B nemotron model is slow.
 *
 * New approach: SEQUENTIAL CHUNKED GENERATION
 *   - Chunk 1 (40s): SEO + Research + English article (2000 tokens)
 *   - Chunk 2 (40s): Arabic article + FAQ (2000 tokens)
 *   - Chunk 3 (20s): Internal/external links + image prompts + social posts (1500 tokens)
 *
 * Total: ~100 seconds, well within Vercel Hobby 60s per call × 3 calls.
 * Each chunk fits within the 60s function timeout, AND each is small enough
 * that the AI model has time to complete without truncation.
 *
 * Fallback: if any chunk fails, we use what we have + local defaults for the rest.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { callFreeAIFallbackChain, parseJSON } from "@/lib/ai-provider";
import { externalSearch } from "@/lib/external-search";

export const ARTICLE_SYSTEM_PROMPT = `You are the MuscleHubEG AI Content Assistant — an expert SEO content strategist and copywriter for a premium online nutrition & fitness coaching platform (MuscleHubEG, musclehubeg.vercel.app).

Your job: produce publication-ready blog content optimized for:
 - Google Search (E-E-A-T, helpful content, semantic SEO)
 - GEO (Generative Engine Optimization — answers AI assistants can cite)
 - AEO (Answer Engine Optimization — concise, quotable, structured)
 - AI Search (clear factual answers, definitions, comparisons)

Style:
 - Tone: authoritative yet approachable, science-backed, motivating.
 - Voice: second person ("you"), active voice, short paragraphs.
 - Structure: H1 + H2/H3 hierarchy, bullet lists, comparison tables where useful.
 - Always include a clear answer to the title question in the first 100 words (AEO).
 - Cite reputable sources (NIH, WHO, ISSN, ACE, Mayo Clinic, Examine.com) by name.
 - The COACHING CTA must invite readers to subscribe to a MuscleHubEG membership plan (Free / Premium / Pro) or book a coaching session via /memberships.
 - Do NOT mention any individual coach name. The platform brand is "MuscleHubEG".
 - Do NOT include a newsletter subscription CTA. The site no longer has one.
 - Do NOT write a CTA section inside the article body. The CTA is rendered
   automatically by the blog article page component (BlogMembershipCard).
   Instead, end the article with a "Key Takeaways" section only.

Output: STRICT JSON only. No prose outside the JSON, no markdown fences.`;

/**
 * Arabic-specific system prompt — explicitly instructs the model to:
 * 1. Write ALL content in Arabic (100% Arabic, no English sentences)
 * 2. Use Arabic SEO structure (H2/H3, tables, key takeaways)
 * 3. Return STRICT JSON with Arabic content
 * 4. Scientific terms: transliterate + English abbreviation in parentheses
 */
export const AR_ARTICLE_SYSTEM_PROMPT = `You are the MuscleHub AI Content Assistant — writing in ARABIC for an Egyptian/Gulf Arabic-speaking audience.

CRITICAL: You MUST write ALL content in Arabic. This includes:
- Article body: 100% Arabic text
- Headings (H2, H3): Arabic ONLY
- Table content: Arabic ONLY
- FAQ questions and answers: Arabic ONLY
- Social media posts: Arabic
- The ONLY exception: scientific abbreviations in parentheses (e.g., "BMR", "DNA")

Scientific terms: write the Arabic term first, then the English abbreviation in parentheses.
Example: "معدل الأيض الأساسي (BMR)" — correct.
Example: "BMR" alone — WRONG.

Do NOT write English sentences or paragraphs. Do NOT translate — write fresh Arabic content.

Style:
- Modern Standard Arabic (فصحى) with a friendly, motivating tone.
- Use Egyptian/Gulf cultural examples (Egyptian foods, local gym culture, prayer-time scheduling).
- Structure: H2/H3 hierarchy, bullet lists, comparison tables.
- Cite sources in Arabic: "وفقاً لدراسة في المجلة الدولية للتغذية الرياضية"

Output: STRICT JSON only. No prose outside the JSON, no markdown fences.`;

// ─────────────────────────────────────────────────────────────────────────
// CHUNK 1: SEO + Research + English Article
// ─────────────────────────────────────────────────────────────────────────
const chunk1Prompt = (input: {
  topic?: string;
  focusKeyword?: string;
  category?: string;
}, research?: any) => {
  const researchBlock = research ? `

STEP 0 — RESEARCH DATA (from external web search — use this to inform your article):
Top-ranking articles on this topic:
${(research.topArticles || []).slice(0, 5).map((a: any, i: number) => `  ${i + 1}. "${a.title}" (${a.host || a.url || "?"})\n     ${a.snippet || ""}`).join("\n")}

Related questions people are asking (address these in your article + FAQ):
${(research.relatedQuestions || []).slice(0, 8).map((q: string, i: number) => `  ${i + 1}. ${q}`).join("\n")}

Trending keywords related to this topic:
${(research.trendingAngles || research.trendingKeywords || []).slice(0, 8).join(", ")}

Use this research data to:
- Match the search intent revealed by the top-ranking articles
- Answer the related questions in your article body and FAQ section
- Include the trending keywords naturally in your content
- Find a unique angle that differentiates from competitors` : "";

  return `Generate a complete ENGLISH blog article bundle for MuscleHubEG.

INPUT:
 - Topic: ${input.topic || "(none — derive from focus keyword)"}
 - Focus Keyword: ${input.focusKeyword || "(none — derive from topic)"}
 - Category: ${input.category || "nutrition"}
${researchBlock}

STEP 1 — ENGLISH SEO DATA (English only — do NOT generate Arabic SEO):
 - focusKeyword: the single primary English keyword.
 - secondaryKeywords: array of 5-8 related English keywords.
 - seoTitle: ≤ 60 chars, English, includes focus keyword near the front.
 - metaTitle: ≤ 60 chars, English, may equal seoTitle.
 - metaDescription: 120-160 chars, English, includes focus keyword + a CTA verb.
 - slug: kebab-case, English, 3-6 words, includes focus keyword.

STEP 2 — ENGLISH ARTICLE (Markdown, 700-900 words):
 - Start with a clear 2-3 sentence answer to the title (AEO).
 - Use H2/H3 hierarchy, bullet lists, at least one comparison table.
 - Cite sources inline as "(Source: NIH, 2024)" style.
 - End with a "Key Takeaways" section (3-5 bullets).
 - DO NOT write a CTA section or coaching pitch inside the article. The CTA is
   rendered automatically by the blog page component after the article body.
 - Insert the focus keyword in the first paragraph, in at least one H2, and 2-3 times in body.
 - Each section MUST include at least 2 specific actionable examples (numbers, exercises, timeframes, food lists).
 - DO NOT insert internal or external links — they will be added separately.

STEP 3 — ENGLISH FAQ (3-5 Q&As, English only):
 - Questions people ask on Google + AI assistants about this topic.
 - Answers 40-80 words each, concise and quotable.

STEP 4 — ENGLISH IMAGE PROMPTS (for AI image generators):
 - featuredImage, facebookImage, openGraphImage
 - CRITICAL: Each image prompt MUST be directly related to the specific article topic "${input.focusKeyword || input.topic}".
   - Do NOT generate generic "fitness gym" images that could apply to any article.
   - The image should visually represent the SPECIFIC subject matter of this article.
 - Each prompt: ultra-realistic, premium fitness editorial style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.
 - Vary composition between the three (different angles / subjects, all related to the SAME topic).

STEP 5 — ENGLISH SOCIAL MEDIA POSTS:
 - facebook, linkedin, instagram, x
 - Each post: strong hook (first line), 2-3 supporting lines, engagement question, CTA, 3-6 hashtags.
 - Add a final line: "Registration link in the first comment "
 - X post must be ≤ 280 chars.

STEP 6 — estimatedReadingTime (integer minutes, based on English article word count @ 200 wpm).

Return STRICT JSON with this shape:
{
  "research": {
    "angle": "string — one sentence describing the chosen angle",
    "searchIntent": "informational | commercial | transactional",
    "rationale": "string — 1-2 sentences why this angle wins on Google + AI search"
  },
  "seo": {
    "focusKeyword": "string",
    "secondaryKeywords": ["string", "..."],
    "en": { "seoTitle": "string", "metaTitle": "string", "metaDescription": "string", "slug": "string" }
  },
  "englishArticle": "markdown string",
  "faq": [{ "question": "string", "answer": "string" }],
  "imagePrompts": {
    "featuredImage": "string",
    "facebookImage": "string",
    "openGraphImage": "string"
  },
  "socialPosts": {
    "facebook": "string",
    "linkedin": "string",
    "instagram": "string",
    "x": "string"
  },
  "estimatedReadingTime": 7
}

Return ONLY the JSON. No commentary, no markdown fences.`;
};

// ─────────────────────────────────────────────────────────────────────────
// CHUNK 2: Arabic Article + AR FAQ + AR Image Prompts + AR Social + AR Reading Time
// EN/AR SEPARATION: produces Arabic content ONLY. Does NOT produce EN FAQ
// or any English content.
// ─────────────────────────────────────────────────────────────────────────
const chunk2Prompt = (input: {
  topic?: string;
  focusKeyword?: string;
  category?: string;
}, _seo?: any) => {
  // EN/AR SEPARATION: The AR writer receives ONLY the Arabic topic + focus
  // keyword (from the AR topic pool, NOT the EN topic). It generates ALL
  // Arabic SEO (title, meta, slug, keywords) from scratch.
  // The `_seo` param is ignored (kept for signature compat) — the AR writer
  // does NOT inherit any EN SEO context. This prevents English topics/keywords
  // from leaking into the Arabic article.
  const arTopic = input.topic || "";
  const arFocusKw = input.focusKeyword || "";

  return `Generate a complete ARABIC blog article bundle for MuscleHubEG.

CONTEXT:
 - Topic (Arabic): ${arTopic || "(none — derive from focus keyword)"}
 - Focus Keyword (Arabic): ${arFocusKw || "(none — derive from topic)"}

STEP 0 — ARABIC SEO DATA (Arabic only — do NOT generate English SEO):
 - focusKeyword: الكلمة المفتاحية الرئيسية بالعربية (أو ما يقابلها).
 - secondaryKeywords: array of 5-8 related Arabic keywords.
 - seoTitle: ≤ 60 حرف، عنوان عربي طبيعي وجذاب.
 - metaTitle: ≤ 60 حرف، عربي، قد يساوي seoTitle.
 - metaDescription: 120-160 حرف، عربي، بصياغة عربية طبيعية + فعل CTA.
 - slug: must be Latin characters ONLY. Generate a clean English kebab-case
   slug from the TOPIC (not the Arabic focus keyword). For example:
   - If topic is about "التعرض للبرد" → slug: "cold-exposure-therapy-ar"
   - If topic is about "تغير معدل ضربات القلب" → slug: "heart-rate-variability-ar"
   - If topic is about "النوم وخسارة الوزن" → slug: "sleep-and-weight-loss-ar"
   Always append "-ar" suffix. NEVER use Arabic characters in the slug.
   NEVER transliterate Arabic directly (e.g. "al-taarud-lil-bard" is WRONG).
   Instead, translate the concept to English, then kebab-case it.

STEP 1 — ARABIC ARTICLE (LOCALIZED, NOT TRANSLATED, Markdown, 600-800 words):
 - Adapt the angle for an Egyptian / Gulf Arabic-speaking audience.
 - Use culturally relevant examples:
   * Egyptian foods: فول مدمس، طعمية، كشري، مكرونة بشاميل، رز بسمتي، دجاج مشوي
   * Local gym culture: جيمز القاهرة والإسكندرية، جيم الناصر، جيم بلاتينيوم
   * Prayer-time scheduling: جدول التمرين حول الصلوات، تمرين قبل الفجر، إفطار رمضان
   * Ramadan-specific: الصيام المتقطع، توقيت الإفطار، الترطيب في رمضان
   * Egyptian supplements brands available locally
 - Write in Modern Standard Arabic with a friendly, motivating tone.
 - Do NOT translate idioms literally — rewrite for Arabic readers.
 - Same SEO structure (H2/H3, table, key takeaways).
 - Do NOT write a CTA section inside the article. The CTA is rendered
   automatically by the blog page component. End with "Key Takeaways" only.
 - Each section MUST include at least 2 specific actionable examples (numbers, foods, exercises, timeframes).
 - Include the focus keyword (transliterated or Arabic equivalent) naturally.
 - DO NOT insert internal or external links — they will be added separately.

CRITICAL ARABIC-ONLY RULES (VIOLATION = REJECTED ARTICLE):
 1. The ENTIRE Arabic article MUST be 100% Arabic text.
 2. ALL headings (H2, H3) — Arabic ONLY. No English words in any heading.
 3. ALL paragraphs — Arabic ONLY. No English sentences or phrases.
 4. ALL table headers and cell content — Arabic ONLY.
 5. The "Key Takeaways" section — Arabic ONLY.
 6. Source citations — write in Arabic format: "وفقاً لدراسة في المجلة الدولية للتغذية الرياضية"
 7. Scientific terms — transliterate to Arabic with original in parentheses: "معدل الأيض الأساسي (BMR)"
 8. The article must be a genuinely localized piece — not a translation.
 9. Do NOT write a CTA section inside the article body. The CTA is rendered
    automatically by the blog page component. End with "Key Takeaways" only.

STEP 2 — ARABIC FAQ (3-5 Q&As, Arabic only — no English words):
 - Questions people ask on Google + AI assistants about this topic.
 - Answers 40-80 words each, concise and quotable.
 - All questions and answers must be in Arabic.

STEP 3 — ARABIC IMAGE PROMPTS (for AI image generators — write prompts in English for image AI compatibility, but describe ARABIC-relevant imagery):
 - featuredImage, facebookImage, openGraphImage
 - CRITICAL: Each image prompt MUST be directly related to the specific article topic.
 - Consider Arabic/Egyptian cultural context where relevant.
 - Each prompt: ultra-realistic, premium fitness editorial style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.

STEP 4 — ARABIC SOCIAL MEDIA POSTS (write in Arabic):
 - facebook, linkedin, instagram, x
 - Each post: strong hook (first line in Arabic), 2-3 supporting lines, engagement question, CTA, 3-6 hashtags.
 - Add a final line: "رابط التسجيل في أول تعليق "
 - X post must be ≤ 280 chars.

STEP 5 — estimatedReadingTimeAr (integer minutes, based on Arabic article word count @ 200 wpm).

Return STRICT JSON with this shape:
{
  "seo": {
    "focusKeyword": "string (Arabic)",
    "secondaryKeywords": ["string (Arabic)", "..."],
    "ar": {
      "seoTitle": "string (Arabic, ≤ 60 chars)",
      "metaTitle": "string (Arabic)",
      "metaDescription": "string (Arabic, 120-160 chars)",
      "slug": "string (Latin — English slug + '-ar' suffix)"
    }
  },
  "arabicArticle": "markdown string (Arabic only, 800-1100 words)",
  "faq_ar": [{ "question": "string (Arabic)", "answer": "string (Arabic)" }],
  "imagePromptsAr": {
    "featuredImage": "string",
    "facebookImage": "string",
    "openGraphImage": "string"
  },
  "socialPostsAr": {
    "facebook": "string (Arabic)",
    "linkedin": "string (Arabic)",
    "instagram": "string (Arabic)",
    "x": "string (Arabic)"
  },
  "estimatedReadingTimeAr": 5
}

Return ONLY the JSON. No commentary, no markdown fences.`;
};

// ─────────────────────────────────────────────────────────────────────────
// CHUNK 3: Links + Image Prompts + Social Posts
// ─────────────────────────────────────────────────────────────────────────
const chunk3Prompt = (input: {
  topic?: string;
  focusKeyword?: string;
}, seo: any) => {
  const enTitle = seo?.en?.seoTitle || input.topic || "";
  const arTitle = seo?.ar?.seoTitle || "";
  const focusKw = seo?.focusKeyword || input.focusKeyword || "";

  return `Generate PART 3 of a blog article bundle for MuscleHubEG.

CONTEXT:
 - English title: "${enTitle}"
 - Arabic title: "${arTitle}"
 - Focus keyword: "${focusKw}"

STEP 6 — LINK SUGGESTIONS (MUST be included in both articles):
 - internalLinks: 3-5 suggested internal links to other MuscleHubEG blog posts.
   Each: { slug, anchorText, reason, anchorTextAr }
   The anchorText is English; anchorTextAr is the Arabic version of the anchor text.
 - externalLinks: 3-5 authoritative external references (NIH, WHO, Examine.com, ACE, ISSN, Mayo Clinic).
   Each: { url, anchorText, reason, anchorTextAr }

STEP 7 — IMAGE PROMPTS (English, for AI image generators):
 - featuredImage, facebookImage, openGraphImage
 - CRITICAL: Each image prompt MUST be directly related to the specific article topic "${focusKw}" and title "${enTitle}".
   - Do NOT generate generic "fitness gym" images that could apply to any article.
   - The image should visually represent the SPECIFIC subject matter of this article.
   - Example: If the article is about "creatine loading", show creatine supplement containers — NOT a generic gym scene.
   - Example: If the article is about "sleep and muscle recovery", show a person sleeping with athletic recovery imagery — NOT a gym workout.
 - Each prompt: ultra-realistic, premium fitness editorial style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.
 - Vary composition between the three (different angles / subjects, all related to the SAME topic).
 - Include the article's main subject in each prompt description.

STEP 8 — SOCIAL MEDIA POSTS:
 - facebook, linkedin, instagram, x
 - Each post: strong hook (first line), 2-3 supporting lines, engagement question, CTA, 3-6 hashtags.
 - Add a final line: "Registration link in the first comment " (English) or "رابط التسجيل في أول تعليق " (Arabic).
 - X post must be ≤ 280 chars.

STEP 9 — estimatedReadingTime (integer minutes, based on English article word count @ 200 wpm).

Return STRICT JSON with this shape:
{
  "internalLinks": [{ "slug": "string", "anchorText": "string", "reason": "string" }],
  "externalLinks": [{ "url": "string", "anchorText": "string", "reason": "string" }],
  "imagePrompts": {
    "featuredImage": "string",
    "facebookImage": "string",
    "openGraphImage": "string"
  },
  "socialPosts": {
    "facebook": "string",
    "linkedin": "string",
    "instagram": "string",
    "x": "string"
  },
  "estimatedReadingTime": 7
}

Return ONLY the JSON. No commentary, no markdown fences.`;
};

export type SeoBlock = {
  seoTitle: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  // Per-language focusKeyword and secondaryKeywords (NEW — optional for
  // backward compat with old bundles that had shared seo.focusKeyword).
  focusKeyword?: string;
  secondaryKeywords?: string[];
};

export type ArticleBundle = {
  research: { angle: string; searchIntent: string; rationale: string } | null;
  seo: {
    // Shared fields (backward compat — old bundles use these for both EN and AR).
    // New bundles populate these from seo.en.* for backward compat with legacy consumers.
    focusKeyword: string;
    secondaryKeywords: string[];
    en: SeoBlock;
    ar: SeoBlock;
  };
  englishArticle: string;
  arabicArticle: string;
  faq: { question: string; answer: string }[];
  faqAr: { question: string; answer: string }[];
  internalLinks: { slug: string; anchorText: string; anchorTextAr?: string; reason: string }[];
  externalLinks: { url: string; anchorText: string; anchorTextAr?: string; reason: string }[];
  // EN image/social/readingTime (backward compat name — same as before)
  imagePrompts: { featuredImage: string; facebookImage: string; openGraphImage: string };
  socialPosts: { facebook: string; linkedin: string; instagram: string; x: string };
  estimatedReadingTime: number;
  // AR image/social/readingTime (NEW — optional for backward compat with old bundles)
  imagePromptsAr?: { featuredImage: string; facebookImage: string; openGraphImage: string };
  socialPostsAr?: { facebook: string; linkedin: string; instagram: string; x: string };
  estimatedReadingTimeAr?: number;
  // AR links (NEW — optional for backward compat with old bundles that had
  // combined internalLinks/externalLinks with both anchorText + anchorTextAr)
  internalLinksAr?: { slug: string; anchorText: string; reason: string }[];
  externalLinksAr?: { url: string; anchorText: string; reason: string }[];
  source: string;
};

// Helper: insert links into article markdown after generation
function insertLinksIntoArticle(
  article: string,
  internalLinks: Array<{ slug: string; anchorText: string; anchorTextAr?: string }>,
  externalLinks: Array<{ url: string; anchorText: string; anchorTextAr?: string }>,
  isArabic: boolean,
): string {
  if (!article) return article;
  let result = article;

  // Insert internal links — find first occurrence of the anchor text and wrap it
  for (const link of internalLinks) {
    const anchor = isArabic ? (link.anchorTextAr || link.anchorText) : link.anchorText;
    if (anchor && result.includes(anchor)) {
      const url = `/blog/${link.slug}`;
      // Wrap only the FIRST occurrence to avoid duplicate links
      result = result.replace(anchor, `[${anchor}](${isArabic ? "/ar" : ""}${url})`);
    }
  }

  // Insert external links
  for (const link of externalLinks) {
    const anchor = isArabic ? (link.anchorTextAr || link.anchorText) : link.anchorText;
    if (anchor && result.includes(anchor)) {
      result = result.replace(anchor, `[${anchor}](${link.url})`);
    }
  }

  return result;
}

export function generateLocalArticleBundle(input: {
  topic?: string;
  focusKeyword?: string;
  category?: string;
  research?: any;
}): ArticleBundle {
  const rawTopic = input.topic || input.focusKeyword || "Evidence-Based Fitness and Nutrition Strategy";
  const focusKw = input.focusKeyword || input.topic || "fitness and nutrition guide";
  const cat = input.category || "nutrition";
  const slug = rawTopic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const enTitle = rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1);
  const arTitle = `الدليل الشامل: ${rawTopic} لتحقيق أفضل النتائج`;

  const enMetaDesc = `Discover science-backed strategies for ${focusKw}. Learn actionable steps, practical nutrition, and training methods to reach your fitness goals.`;
  const arMetaDesc = `اكتشف أفضل النصائح العلمية والمثبتة حول ${focusKw}. دليلك العملي لتحسين اللياقة البدنية والوصول إلى أهدافك مع MuscleHubEG.`;

  const enArticle = `# ${enTitle}

## Introduction: Why ${focusKw} Matters

Achieving long-term fitness transformation requires both scientific understanding and consistent execution. When it comes to **${focusKw}**, many athletes and fitness enthusiasts get caught in misleading myths or sub-optimal routines. In this guide, we break down the physiological mechanisms, practical implementation protocols, and key mistakes to avoid.

According to research published by the *International Society of Sports Nutrition (ISSN)* and the *American College of Sports Medicine (ACSM)*, sustainable progress relies on progressive overload, adequate macronutrient distribution, and strategic recovery.

---

## 1. Core Principles and Scientific Fundamentals

To get the most out of your efforts, focus on the fundamental pillars:

- **Nutritional Precision:** Ensure your daily caloric intake aligns directly with your body composition goals (hypertrophy vs. fat loss).
- **Progressive Overload:** Systematically challenge your muscular and neuromuscular systems over time.
- **Recovery and Sleep Hygiene:** Muscle synthesis and hormonal recovery occur primarily during restorative deep sleep cycles.
- **Consistency over Perfection:** Adherence to a solid protocol beats sporadic extreme efforts every time.

---

## 2. Step-by-Step Implementation Guide

Follow these actionable steps to optimize your routine:

1. **Assess Your Baseline:** Track your current nutrition, strength metrics, and daily energy expenditure for 7 days.
2. **Structure Your Training:** Emphasize compound movements with controlled tempo and full range of motion.
3. **Optimize Protein Distribution:** Aim for 1.6 to 2.2g of protein per kilogram of body weight distributed across 3-5 daily meals.
4. **Hydration & Electrolytes:** Maintain optimal cellular hydration, especially around your workout window.

---

## 3. Common Pitfalls to Avoid

- **Neglecting Rest Days:** Overtraining elevates chronic cortisol and blunts muscle protein synthesis.
- **Extreme Caloric Swings:** Drastic cuts or dirty bulks lead to metabolic fatigue or excess fat accumulation.
- **Ignoring Micronutrients:** Vitamins, minerals, and dietary fiber support digestion, immune function, and endocrine health.

---

## Conclusion & Actionable Next Steps

Mastering **${focusKw}** is a journey of disciplined daily habits backed by scientific principles. Implement the steps above, track your progress weekly, and adjust your variables as your body adapts.

> **Ready to take your transformation to the next level?**  
> Join **MuscleHubEG** today for customized workout programs, personalized meal plans, and direct guidance from certified coaches. Visit our [Membership Plans](/memberships) to start your journey.
`;

  const arArticle = `# ${arTitle}

## مقدمة: أهمية ${focusKw} في رحلتك الرياضية

تحقيق نتائج حقيقية ومستدامة في اللياقة البدنية يتطلب الجمع بين الأسس العلمية والالتزام اليومي. عندما يتعلق الأمر بـ **${focusKw}**، يقع الكثيرون في فخ المعلومات المتضاربة أو البرامج غير المناسبة لأجسامهم. في هذا الدليل العملي، نستعرض أهم الإرشادات العلمية والخطوات المباشرة لتطوير مستواك.

تؤكد الأبحاث الصادرة عن *الجمعية الدولية للتغذية الرياضية (ISSN)* أن النجاح في بناء العضلات وخسارة الدهون يعتمد بشكل أساسي على الاستمرارية، التوازن الغذائي، والتعافي الذكي.

---

## 1. الركائز الأساسية للنجاح

لتحقيق أقصى استفادة، ركز على النقاط الجوهرية التالية:

- **الدقة في التغذية:** حساب السعرات والماكروز بما يتناسب مع هدفك الحالي (تضخيم، تنشيف، أو إعادة تشكيل الجسم).
- **التدرج في الأحمال التدريبية (Progressive Overload):** زيادة الأوزان أو التكرارات تدريجياً لتحفيز النمو العضلي.
- **جودة النوم والاستشفاء:** تحدث عمليات البناء العضلي وإفراز الهرمونات البنائية بشكل رئيسي أثناء النوم العميق.
- **الاستمرارية:** الالتزام بخطة متوازنة على المدى الطويل يتفوق دائماً على الحماس المؤقت.

---

## 2. خطوات عملية للتطبيق

1. **حدد نقطة البداية:** سجّل نظامك الغذائي الحالي وأداءك في التمارين لمدة أسبوع كامل.
2. **نظّم برنامجك الرياضي:** ركز على التمارين المركبة الأساسية مع الالتزام بالأداء الحركي السليم.
3. **توزيع البروتين:** استهدف من 1.6 إلى 2.2 غرام بروتين لكل كيلوغرام من وزن الجسم موزعة على وجباتك.
4. **شرب الماء والأملاح المعدنية:** الحفاظ على الترطيب العضلي لتعزيز الطاقة وتقليل الإجهاد أثناء التمرين.

---

## 3. أخطاء شائعة يجب تجنبها

- **إهمال أيام الراحة:** التدريب المفرط بدون استشفاء كافٍ يرفع هرمونات التوتر ويقلل من كفاءة البناء العضلي.
- **الحميات القاسية:** النزول السريع في السعرات يؤدي إلى خسارة الكتلة العضلية وبطء معدل الحرق.
- **تجاهل الفيتامينات والألياف:** التغذية المتكاملة تحمي الجهاز الهضمي والمناعي.

---

## الخلاصة والخطوة التالية

الوصول إلى أفضل نسخة من جسمك مع **${focusKw}** يتطلب خطة واضحة ومدروسة. ابدأ بتطبيق هذه الخطوات وراقب تطور أدائك أسبوعياً.

> **هل تريد خطة مخصصة بالكامل لجسمك وهدفك؟**  
> انضم اليوم إلى منصة **MuscleHubEG** واحصل على برامج تدريبية وتغذوية مصممة خصيصاً لك بإشراف مدربين معتمدين. تصفح [باقات الاشتراك](/ar/memberships) وابدأ رحلتك الآن.
`;

  return {
    research: null,
    seo: {
      focusKeyword: focusKw,
      secondaryKeywords: [
        `${focusKw} tips`,
        `${focusKw} guide`,
        `best ${focusKw} routine`,
        `${cat} workout nutrition`,
      ],
      en: {
        seoTitle: `${enTitle} | MuscleHubEG`,
        metaTitle: `${enTitle} | MuscleHubEG Guide`,
        metaDescription: enMetaDesc,
        slug: slug || "fitness-guide",
      },
      ar: {
        seoTitle: `${arTitle} | MuscleHubEG`,
        metaTitle: `${arTitle} | MuscleHubEG`,
        metaDescription: arMetaDesc,
        slug: slug || "fitness-guide",
      },
    },
    englishArticle: enArticle,
    arabicArticle: arArticle,
    faq: [
      {
        question: `How quickly can I see results with ${focusKw}?`,
        answer: "Most individuals notice measurable improvements in energy and strength within 2-3 weeks, with visible body composition changes appearing after 6-8 weeks of consistent adherence.",
      },
      {
        question: `Is this approach suitable for beginners?`,
        answer: "Yes, the principles outlined here are scalable and adaptable for beginners as well as advanced athletes.",
      },
      {
        question: `How does MuscleHubEG coaching support this process?`,
        answer: "MuscleHubEG provides customized workout and nutrition plans tailored to your schedule, equipment, and metabolic profile.",
      },
    ],
    faqAr: [
      {
        question: `كم من الوقت يستغرق ظهور النتائج مع ${focusKw}؟`,
        answer: "يلاحظ معظم المتدربين تحسناً في مستويات الطاقة والأداء خلال أسبوعين إلى 3 أسابيع، بينما تبدأ التغيرات الملموسة في شكل الجسم بالظهور بعد 6 إلى 8 أسابيع من الالتزام.",
      },
      {
        question: `هل هذه النصائح مناسبة للمبتدئين؟`,
        answer: "نعم، القواعد المذكورة مصممة لتناسب مختلف المستويات من المبتدئين إلى المتقدمين مع إمكانية تعديل شدة التدريب.",
      },
      {
        question: `كيف يساعدني اشتراك MuscleHubEG في تحقيق هدفي؟`,
        answer: "توفر لك MuscleHubEG جداول تدريبية وخطط تغذية مخصصة لحالتك الفردية بإشراف مدربين لمتابعة تقدمك أولاً بأول.",
      },
    ],
    internalLinks: [
      {
        slug: "nutrition-guide",
        anchorText: "nutrition",
        reason: "Related foundational nutrition advice",
      },
      {
        slug: "progressive-overload",
        anchorText: "progressive overload",
        reason: "Core hypertrophy mechanism guide",
      },
    ],
    externalLinks: [
      {
        url: "https://pubmed.ncbi.nlm.nih.gov/",
        anchorText: "ISSN",
        reason: "Clinical sport nutrition authority",
      },
    ],
    imagePrompts: {
      featuredImage: `Ultra-realistic editorial photo directly related to "${input.topic || input.focusKeyword || "fitness"}", premium fitness style, dramatic blue and gold lighting, high detail, 8k resolution, no text overlay`,
      facebookImage: `Close-up realistic photo showing the specific subject of "${input.focusKeyword || input.topic || "fitness training"}", warm atmospheric studio lighting, high resolution, no text overlay`,
      openGraphImage: `Dynamic realistic scene depicting "${input.topic || input.focusKeyword || "athletic training"}" in context, professional fitness editorial atmosphere, no text overlay`,
    },
    socialPosts: {
      facebook: `Ready to elevate your fitness journey? Here is your complete science-backed guide to ${focusKw}.\n\nCheck out the full article on our blog!\n\nRegistration link in the first comment 👇`,
      linkedin: `Evidence-based insights on ${focusKw}: how progressive overload and balanced macronutrients drive sustainable transformation. Full breakdown on MuscleHubEG blog.`,
      instagram: `Transform your body with evidence-based methods! 💥 Key takeaways for ${focusKw} inside our latest blog guide. Link in bio!`,
      x: `Master ${focusKw} with science-backed principles. Check out our latest comprehensive guide on MuscleHubEG! 🏋️‍♂️💪`,
    },
    estimatedReadingTime: 5,
    source: "local-structured-generator",
  };
}

export async function generateArticleBundle(
  input: { topic?: string; focusKeyword?: string; category?: string; research?: any; language?: "en" | "ar" },
): Promise<ArticleBundle> {
  console.log(`[blog-generate] Starting EN/AR separated article generation (language: ${input.language || "both"})`);

  const emptySeo: SeoBlock = { seoTitle: "", metaTitle: "", metaDescription: "", slug: "" };
  const buildSeo = (block: any): SeoBlock => ({
    seoTitle: block?.seoTitle || "",
    metaTitle: block?.metaTitle || block?.seoTitle || "",
    metaDescription: block?.metaDescription || "",
    slug: block?.slug || "",
    focusKeyword: block?.focusKeyword,
    secondaryKeywords: Array.isArray(block?.secondaryKeywords) ? block.secondaryKeywords : undefined,
  });

  // ───────────────────────────────────────────────────────────────────
  // EN ARTICLE (skip if language=ar)
  // ───────────────────────────────────────────────────────────────────
  let enResult: any = null;
  if (input.language !== "ar") {
    try {
      enResult = await generateEnglishArticle(input, input.research);
    } catch (e: any) {
      console.error("[blog-generate] EN article failed:", e?.message);
      throw new Error(`Blog article generation failed — EN article step error: ${e?.message || "Unknown"}. Ensure OPENROUTER_API is set with a valid key.`);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // AR ARTICLE (skip if language=en) — runs in parallel with EN if both.
  // Does NOT receive englishArticle as input.
  // Uses input.topic/focusKeyword directly (should be Arabic if language=ar).
  // ───────────────────────────────────────────────────────────────────
  let arResult: any = null;
  if (input.language !== "en") {
    try {
      // Pass null for seo — AR writer generates its own AR SEO from scratch.
      // This prevents EN SEO from leaking into the AR prompt context.
      arResult = await generateArabicArticle(input, null, input.research);
    } catch (e: any) {
      console.error("[blog-generate] AR article failed:", e?.message);
      if (!enResult) throw e; // If EN also failed, throw.
      // If only AR failed, continue with EN-only bundle.
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // LINKS — generated separately per language via generateLinksAndSocial
  // (which now calls generateEnglishLinks + generateArabicLinks internally).
  // ───────────────────────────────────────────────────────────────────
  let linksResult: any = null;
  try {
    linksResult = await generateLinksAndSocial(
      { topic: input.topic, focusKeyword: input.focusKeyword },
      enResult?.seo || arResult?.seo || null,
      enResult?.englishArticle || "",
      arResult?.arabicArticle || "",
    );
  } catch (e: any) {
    console.error("[blog-generate] Links failed:", e?.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // Merge into final bundle
  // ───────────────────────────────────────────────────────────────────
  const enSeo = enResult?.seo;
  const arSeo = arResult?.seo;

  const englishArticleRaw = enResult?.englishArticle || "";
  const arabicArticleRaw = arResult?.arabicArticle || "";

  const enInternalLinks = Array.isArray(linksResult?.internalLinks) ? linksResult.internalLinks : [];
  const enExternalLinks = Array.isArray(linksResult?.externalLinks) ? linksResult.externalLinks : [];

  // Insert links into articles (EN links → EN article, AR links → AR article)
  // For AR: if linksResult has internalLinksAr (from generateArabicLinks), use it;
  // else use the combined internalLinks (which has anchorTextAr).
  const arInternalLinks = linksResult?.internalLinksAr || enInternalLinks;
  const arExternalLinks = linksResult?.externalLinksAr || enExternalLinks;

  const englishArticle = insertLinksIntoArticle(englishArticleRaw, enInternalLinks, enExternalLinks, false);
  const arabicArticle = insertLinksIntoArticle(arabicArticleRaw, arInternalLinks, arExternalLinks, true);

  const enWordCount = englishArticle.split(/\s+/).filter(Boolean).length;
  const arWordCount = arabicArticle.split(/\s+/).filter(Boolean).length;
  const estimatedReadingTime =
    typeof enResult?.estimatedReadingTime === "number"
      ? enResult.estimatedReadingTime
      : Math.max(1, Math.ceil(enWordCount / 200));
  const estimatedReadingTimeAr =
    typeof arResult?.estimatedReadingTimeAr === "number"
      ? arResult.estimatedReadingTimeAr
      : Math.max(1, Math.ceil(arWordCount / 200));

  // Build the seo block — new bundles have per-language focusKeyword/secondaryKeywords
  const enSeoBlock: SeoBlock = enSeo?.en ? buildSeo(enSeo.en) : emptySeo;
  if (!enSeoBlock.focusKeyword && enSeo?.focusKeyword) enSeoBlock.focusKeyword = enSeo.focusKeyword;
  if (!enSeoBlock.secondaryKeywords && Array.isArray(enSeo?.secondaryKeywords)) enSeoBlock.secondaryKeywords = enSeo.secondaryKeywords;

  const arSeoBlock: SeoBlock = arSeo?.ar ? buildSeo(arSeo.ar) : (arSeo?.seoTitle ? buildSeo(arSeo) : emptySeo);
  if (!arSeoBlock.focusKeyword && arSeo?.focusKeyword) arSeoBlock.focusKeyword = arSeo.focusKeyword;
  if (!arSeoBlock.secondaryKeywords && Array.isArray(arSeo?.secondaryKeywords)) arSeoBlock.secondaryKeywords = arSeo.secondaryKeywords;
  // Fallback: if AR SEO is still empty, use input topic/focusKeyword
  if (!arSeoBlock.seoTitle && input.topic) {
    arSeoBlock.seoTitle = input.topic;
    arSeoBlock.metaTitle = input.topic;
  }
  if (!arSeoBlock.focusKeyword) arSeoBlock.focusKeyword = input.focusKeyword || "";

  return {
    research: enResult?.research || arResult?.research || null,
    seo: {
      // For backward compat: top-level focusKeyword/secondaryKeywords come from EN
      focusKeyword: enSeoBlock.focusKeyword || enSeo?.focusKeyword || input.focusKeyword || "",
      secondaryKeywords: enSeoBlock.secondaryKeywords || (Array.isArray(enSeo?.secondaryKeywords) ? enSeo.secondaryKeywords : []),
      en: enSeoBlock,
      ar: arSeoBlock,
    },
    englishArticle,
    arabicArticle,
    faq: Array.isArray(enResult?.faq) ? enResult.faq : [],
    faqAr: Array.isArray(arResult?.faqAr) ? arResult.faqAr : [],
    internalLinks: enInternalLinks,
    externalLinks: enExternalLinks,
    // EN-specific image/social/readingTime
    imagePrompts: enResult?.imagePrompts || linksResult?.imagePrompts || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPosts: enResult?.socialPosts || linksResult?.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime,
    // AR-specific image/social/readingTime (NEW)
    imagePromptsAr: arResult?.imagePromptsAr,
    socialPostsAr: arResult?.socialPostsAr,
    estimatedReadingTimeAr,
    // AR-specific links (NEW — used by step3-publish for the AR article)
    internalLinksAr: linksResult?.internalLinksAr,
    externalLinksAr: linksResult?.externalLinksAr,
    source: "openrouter:en-ar-separated",
  };
}

/* P0-1: SPLIT FUNCTIONS — each is one AI call, callable from a separate      */
/* cron route. Each saves its result to the queue's article_bundle JSONB.    */
/* The original generateArticleBundle() above is kept for backward compat.    */


/**
 * Step 2a: External Research (LLM-knowledge based).
 *
 * OWNER DIRECTIVE (2026-08-27): all AI calls go through OpenRouter / Groq.
 * There is no live web-search integration anymore — the previous z-ai
 * web_search era AND the later Gemini googleSearch-grounding era are both
 * gone. `externalSearch()` now asks the unified chain to model the
 * best-ranking coverage of the topic (trusted hosts only, no fabricated
 * URLs are stored).
 *
 * Delegation is intentional — the native GHA pipeline's research step
 * (p0-research) and this shared helper call the SAME underlying
 * implementation, so research behavior stays consistent.
 *
 * Returns { research, source } where source = "llm-research".
 */
export async function generateExternalResearch(
  input: { topic?: string; focusKeyword?: string; category?: string },
): Promise<{ research: any; source: string }> {
  const result = await externalSearch({
    topic: input.topic,
    focusKeyword: input.focusKeyword,
    maxResults: 10,
  });

  console.log(
    `[blog-generate] External research done: ${result.totalResults} articles, ` +
    `${result.relatedQuestions.length} questions, ${result.trendingKeywords.length} keywords ` +
    `(queries: ${result.successfulQueries}/${result.queryCount} succeeded` +
    `${result.partialFailure ? ", PARTIAL FAILURE" : ""})`,
  );

  return {
    research: result,
    source: result.source,
  };
}


export async function generateEnglishArticle(
  input: { topic?: string; focusKeyword?: string; category?: string },
  research?: any,
): Promise<{
  seo: any;
  englishArticle: string;
  faq: any[];
  imagePrompts: any;
  socialPosts: any;
  estimatedReadingTime: number;
  source: string;
}> {
  const prompt = chunk1Prompt(input, research);
  const { text, model, provider } = await callFreeAIFallbackChain(
    prompt,
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 6_000,
      jsonMode: true,
      // Vercel Hobby budget (2026-08-27): the chain self-clamps to
      // maxModels × timeoutMs ≤ 52s; retries happen at the GitHub Actions
      // orchestration level between separate HTTP calls.
      timeoutMs: 26_000,
      maxModels: 2,
    },
  );
  // M62 fix: removed raw text logging (AGENTS.md §8 — never log AI response)

  const parsed = parseJSON<any>(text);
  if (!parsed || !parsed.englishArticle || !parsed.seo) {
    console.error(`[blog-generate] EN article FAILED — model: ${model}, provider: ${provider}`);
    console.error(`[blog-generate] EN parsed keys: ${parsed ? Object.keys(parsed).join(", ") : "null"}`);
    // M62 fix: removed raw text logging
    throw new Error(`English article chunk returned invalid data — missing englishArticle or seo. Provider: ${provider}, Model: ${model}. Parsed keys: ${parsed ? Object.keys(parsed).join(", ") : "null"}`);
  }
  console.log(`[blog-generate] EN article done (model: ${model}, provider: ${provider}, words: ${parsed.englishArticle.split(/\s+/).length})`);
  return {
    seo: parsed.seo,
    englishArticle: parsed.englishArticle,
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    imagePrompts: parsed.imagePrompts || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPosts: parsed.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime: typeof parsed.estimatedReadingTime === "number" ? parsed.estimatedReadingTime : Math.max(1, Math.ceil(parsed.englishArticle.split(/\s+/).length / 200)),
    source: `${provider}:${model}`,
  };
}

export async function generateArabicArticle(
  input: { topic?: string; focusKeyword?: string; category?: string },
  seo: any,
  research?: any,
): Promise<{
  arabicArticle: string;
  faqAr: any[];
  imagePromptsAr: any;
  socialPostsAr: any;
  estimatedReadingTimeAr: number;
  source: string;
}> {
  // EN/AR SEPARATION: this function does NOT receive englishArticle as input.
  // It uses chunk2Prompt but the AR writer gets only topic + research (same as EN).
  // The AR article, AR FAQ, AR image prompts, AR social posts, and AR reading
  // time are all generated independently.
  const prompt = chunk2Prompt(input, seo);

  const { text, model, provider } = await callFreeAIFallbackChain(
    prompt,
    {
      systemPrompt: AR_ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 6_000,
      jsonMode: true,
      timeoutMs: 26_000,
      maxModels: 2,
    },
  );
  // M62 fix: removed raw text logging (AGENTS.md §8)

  const parsed = parseJSON<any>(text);

  // Robust parsing — try multiple field name variations
  const arabicArticle = parsed?.arabicArticle || parsed?.arabic_article || parsed?.article_ar || parsed?.article || "";
  if (!parsed || !arabicArticle) {
    console.error(`[blog-generate] AR article FAILED — model: ${model}, provider: ${provider}`);
    console.error(`[blog-generate] AR parsed keys: ${parsed ? Object.keys(parsed).join(", ") : "null"}`);
    // M62 fix: removed raw text from error message
    throw new Error(`Arabic article chunk returned invalid data — missing arabicArticle. Provider: ${provider}, Model: ${model}. Parsed keys: ${parsed ? Object.keys(parsed).join(", ") : "null"}.`);
  }
  console.log(`[blog-generate] AR article done (model: ${model}, provider: ${provider}, words: ${arabicArticle.split(/\s+/).length})`);
  return {
    arabicArticle,
    faqAr: Array.isArray(parsed.faq_ar) ? parsed.faq_ar : (Array.isArray(parsed.faqAr) ? parsed.faqAr : []),
    imagePromptsAr: parsed.imagePromptsAr || parsed.image_prompts_ar || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPostsAr: parsed.socialPostsAr || parsed.social_posts_ar || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTimeAr: typeof parsed.estimatedReadingTimeAr === "number" ? parsed.estimatedReadingTimeAr : Math.max(1, Math.ceil(arabicArticle.split(/\s+/).length / 200)),
    source: `${provider}:${model}`,
  };
}

/**
 * Step 2d: Internal/external links + image prompts + social posts.
 * Single AI call. Takes SEO + both articles as input (improves link anchor
 * text matching — P1-6 fix from audit).
 */
export async function generateLinksAndSocial(
  input: { topic?: string; focusKeyword?: string },
  seo: any,
  englishArticle: string,
  arabicArticle: string,
): Promise<{
  internalLinks: any[];
  externalLinks: any[];
  imagePrompts: any;
  socialPosts: any;
  estimatedReadingTime: number;
  source: string;
}> {
  const enTitle = seo?.en?.seoTitle || input.topic || "";
  const arTitle = seo?.ar?.seoTitle || "";
  const focusKw = seo?.focusKeyword || input.focusKeyword || "";

  // Extract first 500 words of each article for link matching context
  const enExcerpt = englishArticle.split(/\s+/).slice(0, 500).join(" ");
  const arExcerpt = arabicArticle.split(/\s+/).slice(0, 500).join(" ");

  const prompt = `Generate PART 3 of a blog article bundle for MuscleHubEG.

CONTEXT:
 - English title: "${enTitle}"
 - Arabic title: "${arTitle}"
 - Focus keyword: "${focusKw}"

ENGLISH ARTICLE EXCERPT (for matching anchor text):
${enExcerpt}

ARABIC ARTICLE EXCERPT (for matching anchor text):
${arExcerpt}

STEP 6 — LINK SUGGESTIONS (MUST be included in both articles):
 - internalLinks: 3-5 suggested internal links to other MuscleHubEG blog posts.
   Each: { slug, anchorText, reason, anchorTextAr }
   IMPORTANT: Choose anchorText that actually appears in the article excerpts above.
   The anchorText is English; anchorTextAr is the Arabic version of the anchor text.
 - externalLinks: 3-5 authoritative external references (NIH, WHO, Examine.com, ACE, ISSN, Mayo Clinic).
   Each: { url, anchorText, reason, anchorTextAr }
   IMPORTANT: Choose anchorText that actually appears in the article excerpts above.

STEP 7 — IMAGE PROMPTS (English, for AI image generators):
 - featuredImage, facebookImage, openGraphImage
 - CRITICAL: Each image prompt MUST be directly related to the specific article topic "${focusKw}" and title "${enTitle}".
   - Do NOT generate generic "fitness gym" images that could apply to any article.
   - The image should visually represent the SPECIFIC subject matter of this article.
   - Example: If the article is about "creatine loading", show creatine supplement containers — NOT a generic gym scene.
   - Example: If the article is about "sleep and muscle recovery", show a person sleeping with athletic recovery imagery — NOT a gym workout.
 - Each prompt: ultra-realistic, premium fitness editorial style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.
 - Vary composition between the three (different angles / subjects, all related to the SAME topic).
 - Include the article's main subject in each prompt description.

STEP 8 — SOCIAL MEDIA POSTS:
 - facebook, linkedin, instagram, x
 - Each post: strong hook (first line), 2-3 supporting lines, engagement question, CTA, 3-6 hashtags.
 - Add a final line: "Registration link in the first comment " (English) or "رابط التسجيل في أول تعليق " (Arabic).
 - X post must be ≤ 280 chars.

STEP 9 — estimatedReadingTime (integer minutes, based on English article word count @ 200 wpm).

Return STRICT JSON with this shape:
{
  "internalLinks": [{ "slug": "string", "anchorText": "string", "reason": "string", "anchorTextAr": "string" }],
  "externalLinks": [{ "url": "string", "anchorText": "string", "reason": "string", "anchorTextAr": "string" }],
  "imagePrompts": {
    "featuredImage": "string",
    "facebookImage": "string",
    "openGraphImage": "string"
  },
  "socialPosts": {
    "facebook": "string",
    "linkedin": "string",
    "instagram": "string",
    "x": "string"
  },
  "estimatedReadingTime": 7
}

Return ONLY the JSON. No commentary, no markdown fences.`;

  const { text, model, provider } = await callFreeAIFallbackChain(
    prompt,
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2_500,
      jsonMode: true,
      timeoutMs: 22_000,
      maxModels: 2,
    },
  );
  // M62 fix: removed raw text logging
  const parsed = parseJSON<any>(text);
  if (!parsed) {
    console.error(`[blog-generate] Links FAILED — model: ${model}, provider: ${provider}`);
    // M62 fix: removed raw text logging
    throw new Error(`Links + social chunk returned invalid JSON. Provider: ${provider}, Model: ${model}`);
  }

  const wordCount = englishArticle.split(/\s+/).length;
  const estimatedReadingTime =
    typeof parsed.estimatedReadingTime === "number"
      ? parsed.estimatedReadingTime
      : Math.max(1, Math.ceil(wordCount / 200));

  console.log(`[blog-generate] Links + social done (model: ${model}, links: ${parsed.internalLinks?.length || 0})`);
  return {
    internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks : [],
    externalLinks: Array.isArray(parsed.externalLinks) ? parsed.externalLinks : [],
    imagePrompts: parsed.imagePrompts || {
      featuredImage: `Ultra-realistic editorial photo directly related to: ${input.topic || input.focusKeyword || "fitness and nutrition"}. Professional lighting, 8k, no text overlay`,
      facebookImage: `Close-up realistic photo about: ${input.focusKeyword || input.topic || "fitness"}. Professional studio lighting, no text overlay`,
      openGraphImage: `Dynamic scene depicting: ${input.topic || input.focusKeyword || "athletic training"}. Professional editorial style, no text overlay`,
    },
    socialPosts: parsed.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime,
    source: `${provider}:${model}`,
  };
}

/**
 * Helper: build the final ArticleBundle from individual step results.
 * Used by step3-publish to assemble the complete bundle from queue data.
 *
 * Supports BOTH the new separated format (imagePromptsAr, socialPostsAr,
 * estimatedReadingTimeAr, internalLinksAr, externalLinksAr) AND the old
 * combined format (single imagePrompts, socialPosts, estimatedReadingTime,
 * internalLinks with both anchorText + anchorTextAr).
 */
export function buildFinalBundle(parts: {
  research: any;
  seo: any;
  englishArticle: string;
  arabicArticle: string;
  faq: any[];
  faqAr: any[];
  internalLinks: any[];
  externalLinks: any[];
  imagePrompts: any;
  socialPosts: any;
  estimatedReadingTime: number;
  // NEW optional fields (absent in old bundles):
  imagePromptsAr?: any;
  socialPostsAr?: any;
  estimatedReadingTimeAr?: number;
  internalLinksAr?: any[];
  externalLinksAr?: any[];
}): ArticleBundle {
  const emptySeo: SeoBlock = { seoTitle: "", metaTitle: "", metaDescription: "", slug: "" };
  const buildSeo = (block: any): SeoBlock => ({
    seoTitle: block?.seoTitle || "",
    metaTitle: block?.metaTitle || block?.seoTitle || "",
    metaDescription: block?.metaDescription || "",
    slug: block?.slug || "",
    focusKeyword: block?.focusKeyword,
    secondaryKeywords: Array.isArray(block?.secondaryKeywords) ? block.secondaryKeywords : undefined,
  });

  // EN links (use top-level internalLinks/externalLinks — old combined shape or new EN-only shape)
  const enInternalLinks = parts.internalLinks || [];
  const enExternalLinks = parts.externalLinks || [];

  // AR links (NEW: use internalLinksAr/externalLinksAr if present; else fall
  // back to the top-level combined links with anchorTextAr field)
  const arInternalLinks = parts.internalLinksAr || enInternalLinks;
  const arExternalLinks = parts.externalLinksAr || enExternalLinks;

  // Insert links into articles (EN links → EN article, AR links → AR article)
  const englishArticle = insertLinksIntoArticle(parts.englishArticle || "", enInternalLinks, enExternalLinks, false);
  const arabicArticle = insertLinksIntoArticle(parts.arabicArticle || "", arInternalLinks, arExternalLinks, true);

  // Build seo blocks with per-language focusKeyword/secondaryKeywords
  const enSeoBlock: SeoBlock = parts.seo?.en ? buildSeo(parts.seo.en) : emptySeo;
  if (!enSeoBlock.focusKeyword && parts.seo?.focusKeyword) enSeoBlock.focusKeyword = parts.seo.focusKeyword;
  if (!enSeoBlock.secondaryKeywords && Array.isArray(parts.seo?.secondaryKeywords)) enSeoBlock.secondaryKeywords = parts.seo.secondaryKeywords;

  const arSeoBlock: SeoBlock = parts.seo?.ar ? buildSeo(parts.seo.ar) : emptySeo;
  if (!arSeoBlock.focusKeyword && parts.seo?.focusKeyword) arSeoBlock.focusKeyword = parts.seo.focusKeyword;
  if (!arSeoBlock.secondaryKeywords && Array.isArray(parts.seo?.secondaryKeywords)) arSeoBlock.secondaryKeywords = parts.seo.secondaryKeywords;

  // AR reading time (NEW: use estimatedReadingTimeAr if present; else fall back to EN)
  const arReadingTime =
    typeof parts.estimatedReadingTimeAr === "number"
      ? parts.estimatedReadingTimeAr
      : parts.estimatedReadingTime || 1;

  return {
    research: parts.research || null,
    seo: {
      // For backward compat: top-level focusKeyword/secondaryKeywords from EN
      focusKeyword: enSeoBlock.focusKeyword || parts.seo?.focusKeyword || "",
      secondaryKeywords: enSeoBlock.secondaryKeywords || (Array.isArray(parts.seo?.secondaryKeywords) ? parts.seo.secondaryKeywords : []),
      en: enSeoBlock,
      ar: arSeoBlock,
    },
    englishArticle,
    arabicArticle,
    faq: parts.faq || [],
    faqAr: parts.faqAr || [],
    internalLinks: enInternalLinks,
    externalLinks: enExternalLinks,
    // EN image/social/readingTime
    imagePrompts: parts.imagePrompts || {
      featuredImage: `Ultra-realistic editorial photo directly related to: ${parts.seo?.focusKeyword || "fitness and nutrition"}. Professional lighting, 8k, no text overlay`,
      facebookImage: `Close-up realistic photo about: ${parts.seo?.focusKeyword || "fitness"}. Professional studio lighting, no text overlay`,
      openGraphImage: `Dynamic scene depicting: ${parts.seo?.focusKeyword || "athletic training"}. Professional editorial style, no text overlay`,
    },
    socialPosts: parts.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime: parts.estimatedReadingTime || 1,
    // AR image/social/readingTime (NEW — optional, absent in old bundles)
    imagePromptsAr: parts.imagePromptsAr,
    socialPostsAr: parts.socialPostsAr,
    estimatedReadingTimeAr: arReadingTime,
    // AR links (NEW — optional)
    internalLinksAr: parts.internalLinksAr,
    externalLinksAr: parts.externalLinksAr,
    source: "openrouter:multi-step",
  };
}
