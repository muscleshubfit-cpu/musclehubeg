/**
 * Shared article-bundle generator.
 *
 * Extracted out of the manual "Generate Article" editor endpoint so the
 * automated cron pipeline (src/app/api/cron/generate-blog-post) can reuse
 * the exact same, already-tuned SEO/GEO/AEO prompt and JSON-parsing/validation
 * logic instead of a second, drifting copy.
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

import { callFreeOpenRouterLimited, parseJSON } from "@/lib/ai-provider";
import { externalSearch } from "@/lib/external-search";

export const ARTICLE_SYSTEM_PROMPT = `You are the MuscleHub AI Content Assistant — an expert SEO content strategist and copywriter for a premium online nutrition & fitness coaching platform (MuscleHub, musclehubeg.vercel.app).

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
 - The COACHING CTA must invite readers to subscribe to a MuscleHub membership plan (Free / Premium / Pro) or book a coaching session via /memberships.
 - Do NOT mention any individual coach name. The platform brand is "MuscleHub".
 - Do NOT include a newsletter subscription CTA. The site no longer has one.

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

  return `Generate PART 1 of a blog article bundle for MuscleHub.

INPUT:
 - Topic: ${input.topic || "(none — derive from focus keyword)"}
 - Focus Keyword: ${input.focusKeyword || "(none — derive from topic)"}
 - Category: ${input.category || "nutrition"}
${researchBlock}

STEP 1 — RESEARCH (do silently):
 - Identify the search intent (informational / commercial / transactional).
 - Pick the best article angle that wins on Google AND AI search.
 - Choose 1 primary focus keyword + 5-8 secondary keywords.

STEP 2 — SEO DATA (SEPARATE for English and Arabic — never reuse one language's title/description for the other):
 - focusKeyword: the single primary keyword (English, canonical — used for internal tracking only).
 - secondaryKeywords: array of 5-8 related keywords (English).
 - en.seoTitle: ≤ 60 chars, English, includes focus keyword near the front.
 - en.metaTitle: ≤ 60 chars, English, may equal en.seoTitle.
 - en.metaDescription: 120-160 chars, English, includes focus keyword + a CTA verb.
 - en.slug: kebab-case, English, 3-6 words, includes focus keyword.
 - ar.seoTitle: ≤ 60 chars, WRITTEN IN ARABIC, a natural Arabic headline (not a translation of en.seoTitle — write it fresh for Arabic readers/search behavior).
 - ar.metaTitle: ≤ 60 chars, Arabic, may equal ar.seoTitle.
 - ar.metaDescription: 120-160 chars, WRITTEN IN ARABIC, natural Arabic phrasing + a CTA verb in Arabic.
 - ar.slug: kebab-case, LATIN CHARACTERS ONLY (transliterate or use the English focus keyword) — Arabic URLs break sharing/encoding, so even the Arabic post's slug must be Latin.

STEP 3 — ENGLISH ARTICLE (Markdown, 600-900 words):
 - Start with a clear 2-3 sentence answer to the title (AEO).
 - Use H2/H3 hierarchy, bullet lists, at least one comparison table.
 - Cite sources inline as "(Source: NIH, 2024)" style.
 - End with a "Key Takeaways" section (3-5 bullets).
 - Embed a Coaching CTA section (H2 "Ready for a Personalized Plan?").
 - Insert the focus keyword in the first paragraph, in at least one H2, and 2-3 times in body.
 - DO NOT insert internal or external links in this chunk — they will be added in Part 3.

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
    "en": { "seoTitle": "string", "metaTitle": "string", "metaDescription": "string", "slug": "string" },
    "ar": { "seoTitle": "string (Arabic)", "metaTitle": "string (Arabic)", "metaDescription": "string (Arabic)", "slug": "string (Latin)" }
  },
  "englishArticle": "markdown string"
}

Return ONLY the JSON. No commentary, no markdown fences.`;
};

// ─────────────────────────────────────────────────────────────────────────
// CHUNK 2: Arabic Article + FAQ
// ─────────────────────────────────────────────────────────────────────────
const chunk2Prompt = (input: {
  topic?: string;
  focusKeyword?: string;
  category?: string;
}, seo: any) => {
  const enTitle = seo?.en?.seoTitle || input.topic || "";
  const arTitle = seo?.ar?.seoTitle || "";
  const focusKw = seo?.focusKeyword || input.focusKeyword || "";

  return `Generate PART 2 of a blog article bundle for MuscleHub.

CONTEXT FROM PART 1:
 - English title: "${enTitle}"
 - Arabic title: "${arTitle}"
 - Focus keyword: "${focusKw}"

STEP 4 — ARABIC ARTICLE (LOCALIZED, NOT TRANSLATED, Markdown, 500-800 words):
 - Adapt the angle for an Egyptian / Gulf Arabic-speaking audience.
 - Use culturally relevant examples (Egyptian foods, local gym culture, prayer-time scheduling, etc.).
 - Write in Modern Standard Arabic with a friendly, motivating tone.
 - Do NOT translate English idioms literally — rewrite for Arabic readers.
 - Same SEO structure as English (H2/H3, table, key takeaways, CTA sections).
 - Include the focus keyword (transliterated or Arabic equivalent) naturally.

CRITICAL ARABIC-ONLY RULES (VIOLATION = REJECTED ARTICLE):
 1. The ENTIRE Arabic article MUST be 100% Arabic text.
 2. ALL headings (H2, H3) — Arabic ONLY. No English words in any heading.
 3. ALL paragraphs — Arabic ONLY. No English sentences or phrases.
 4. ALL table headers and cell content — Arabic ONLY.
 5. The CTA section — Arabic ONLY.
 6. The "Key Takeaways" section — Arabic ONLY.
 7. Source citations — write in Arabic format: "وفقاً لدراسة في المجلة الدولية للتغذية الرياضية"
 8. Scientific terms — transliterate to Arabic with original in parentheses: "معدل الأيض الأساسي (BMR)"
    - Only the abbreviation in parentheses is allowed in English (e.g., "BMR", "DNA", "ATP").
    - The full term MUST be written in Arabic before the abbreviation.
 9. English keywords are NOT to be inserted into the Arabic text for SEO purposes.
    - Use the Arabic equivalent or transliteration instead.
    - Example: use "البروتين" not "protein", use "التمارين" not "workout".
 10. Do NOT write ANY English sentence, phrase, or heading in the Arabic article body.
 11. The article must be a genuinely localized piece — not a word-for-word translation.
     Rewrite examples, metaphors, and cultural references for an Arabic-speaking audience.

STEP 5 — FAQ (3-5 Q&As, SEPARATE for each language):
 - Questions people ask on Google + AI assistants about this topic.
 - Answers 40-80 words each, concise and quotable.
 - English FAQ: questions and answers in English.
 - Arabic FAQ (faq_ar field): questions and answers in Arabic ONLY.
   - Arabic FAQ questions MUST be different from the English FAQ questions — not translations.
   - Arabic FAQ answers MUST be written fresh for Arabic readers.
   - No English words in the Arabic FAQ except scientific abbreviations in parentheses.
 - Return FAQ as: [{ "question": "English Q", "answer": "English A" }, ...]
   The system will use these for the English article. For the Arabic article,
   include a separate "faq_ar" field with Arabic-only Q&A.

Return STRICT JSON with this shape:
{
  "arabicArticle": "markdown string",
  "faq": [{ "question": "string", "answer": "string" }],
  "faq_ar": [{ "question": "string (Arabic)", "answer": "string (Arabic)" }]
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

  return `Generate PART 3 of a blog article bundle for MuscleHub.

CONTEXT:
 - English title: "${enTitle}"
 - Arabic title: "${arTitle}"
 - Focus keyword: "${focusKw}"

STEP 6 — LINK SUGGESTIONS (MUST be included in both articles):
 - internalLinks: 3-5 suggested internal links to other MuscleHub blog posts.
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

export type SeoBlock = { seoTitle: string; metaTitle: string; metaDescription: string; slug: string };

export type ArticleBundle = {
  research: { angle: string; searchIntent: string; rationale: string } | null;
  seo: {
    focusKeyword: string;
    secondaryKeywords: string[];
    en: SeoBlock;
    ar: SeoBlock;
  };
  englishArticle: string;
  arabicArticle: string;
  faq: { question: string; answer: string }[];
  faqAr: { question: string; answer: string }[];
  internalLinks: { slug: string; anchorText: string; reason: string }[];
  externalLinks: { url: string; anchorText: string; reason: string }[];
  imagePrompts: { featuredImage: string; facebookImage: string; openGraphImage: string };
  socialPosts: { facebook: string; linkedin: string; instagram: string; x: string };
  estimatedReadingTime: number;
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
  const arMetaDesc = `اكتشف أفضل النصائح العلمية والمثبتة حول ${focusKw}. دليلك العملي لتحسين اللياقة البدنية والوصول إلى أهدافك مع MuscleHub.`;

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
> Join **MuscleHub** today for customized workout programs, personalized meal plans, and direct guidance from certified coaches. Visit our [Membership Plans](/memberships) to start your journey.
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
> انضم اليوم إلى منصة **MuscleHub** واحصل على برامج تدريبية وتغذوية مصممة خصيصاً لك بإشراف مدربين معتمدين. تصفح [باقات الاشتراك](/ar/memberships) وابدأ رحلتك الآن.
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
        seoTitle: `${enTitle} | MuscleHub`,
        metaTitle: `${enTitle} | MuscleHub Guide`,
        metaDescription: enMetaDesc,
        slug: slug || "fitness-guide",
      },
      ar: {
        seoTitle: `${arTitle} | MuscleHub`,
        metaTitle: `${arTitle} | MuscleHub`,
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
        question: `How does MuscleHub coaching support this process?`,
        answer: "MuscleHub provides customized workout and nutrition plans tailored to your schedule, equipment, and metabolic profile.",
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
        question: `كيف يساعدني اشتراك MuscleHub في تحقيق هدفي؟`,
        answer: "توفر لك MuscleHub جداول تدريبية وخطط تغذية مخصصة لحالتك الفردية بإشراف مدربين لمتابعة تقدمك أولاً بأول.",
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
      linkedin: `Evidence-based insights on ${focusKw}: how progressive overload and balanced macronutrients drive sustainable transformation. Full breakdown on MuscleHub blog.`,
      instagram: `Transform your body with evidence-based methods! 💥 Key takeaways for ${focusKw} inside our latest blog guide. Link in bio!`,
      x: `Master ${focusKw} with science-backed principles. Check out our latest comprehensive guide on MuscleHub! 🏋️‍♂️💪`,
    },
    estimatedReadingTime: 5,
    source: "local-structured-generator",
  };
}

export async function generateArticleBundle(
  input: { topic?: string; focusKeyword?: string; category?: string; research?: any },
): Promise<ArticleBundle> {
  console.log("[blog-generate] Starting chunked article generation");

  // ───────────────────────────────────────────────────────────────────
  // CHUNK 1: SEO + Research + English Article
  // ───────────────────────────────────────────────────────────────────
  let chunk1: any = null;
  try {
    const { text: raw1, model: model1 } = await callFreeOpenRouterLimited(
      chunk1Prompt(input, input.research),
      {
        systemPrompt: ARTICLE_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 4_000,
        jsonMode: true,
        timeoutMs: 50_000,
      },
    );
    chunk1 = parseJSON<any>(raw1);
    console.log(`[blog-generate] Chunk 1 done (model: ${model1}, has English: ${!!chunk1?.englishArticle})`);
  } catch (e: any) {
    console.error("[blog-generate] Chunk 1 AI call failed:", e?.message);
    throw new Error(`Blog article generation failed — all AI providers/models unavailable. Last error: ${e?.message || "Unknown"}. Ensure OPENROUTER_API is set with a valid key on Vercel.`);
  }

  if (!chunk1 || !chunk1.englishArticle || !chunk1.seo) {
    console.error("[blog-generate] Chunk 1 returned incomplete or invalid data.");
    throw new Error("Blog article generation failed — AI returned incomplete data (missing englishArticle or seo). The model may be rate-limited or unavailable.");
  }

  // ───────────────────────────────────────────────────────────────────
  // CHUNK 2: Arabic Article + FAQ (in parallel with Chunk 3)
  // ───────────────────────────────────────────────────────────────────
  const chunk2Promise = callFreeOpenRouterLimited(
    chunk2Prompt(input, chunk1.seo),
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 4_000,
      jsonMode: true,
      timeoutMs: 50_000,
    },
  ).then(({ text, model }) => {
    const parsed = parseJSON<any>(text);
    console.log(`[blog-generate] Chunk 2 done (model: ${model}, has Arabic: ${!!parsed?.arabicArticle})`);
    return parsed;
  }).catch((e: any) => {
    console.error("[blog-generate] Chunk 2 failed:", e?.message);
    return null;
  });

  // ───────────────────────────────────────────────────────────────────
  // CHUNK 3: Links + Image Prompts + Social Posts
  // ───────────────────────────────────────────────────────────────────
  const chunk3Promise = callFreeOpenRouterLimited(
    chunk3Prompt(input, chunk1.seo),
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2_500,
      jsonMode: true,
      timeoutMs: 40_000,
    },
  ).then(({ text, model }) => {
    const parsed = parseJSON<any>(text);
    console.log(`[blog-generate] Chunk 3 done (model: ${model}, has links: ${!!parsed?.internalLinks})`);
    return parsed;
  }).catch((e: any) => {
    console.error("[blog-generate] Chunk 3 failed:", e?.message);
    return null;
  });

  // Wait for chunks 2 and 3 in parallel
  const [chunk2, chunk3] = await Promise.all([chunk2Promise, chunk3Promise]);

  // ───────────────────────────────────────────────────────────────────
  // Merge all chunks into final bundle
  // ───────────────────────────────────────────────────────────────────
  const emptySeo: SeoBlock = { seoTitle: "", metaTitle: "", metaDescription: "", slug: "" };
  const buildSeo = (block: any): SeoBlock => ({
    seoTitle: block?.seoTitle || "",
    metaTitle: block?.metaTitle || block?.seoTitle || "",
    metaDescription: block?.metaDescription || "",
    slug: block?.slug || "",
  });

  const internalLinks = Array.isArray(chunk3?.internalLinks) ? chunk3.internalLinks : [];
  const externalLinks = Array.isArray(chunk3?.externalLinks) ? chunk3.externalLinks : [];

  // Insert links into both articles
  const englishArticle = insertLinksIntoArticle(
    chunk1.englishArticle || "",
    internalLinks,
    externalLinks,
    false,
  );
  const arabicArticle = insertLinksIntoArticle(
    chunk2?.arabicArticle || "",
    internalLinks,
    externalLinks,
    true,
  );

  const wordCount = englishArticle.split(/\s+/).length;
  const estimatedReadingTime =
    typeof chunk3?.estimatedReadingTime === "number"
      ? chunk3.estimatedReadingTime
      : Math.max(1, Math.ceil(wordCount / 200));

  return {
    research: chunk1.research || null,
    seo: {
      focusKeyword: chunk1.seo?.focusKeyword || input.focusKeyword || "",
      secondaryKeywords: Array.isArray(chunk1.seo?.secondaryKeywords) ? chunk1.seo.secondaryKeywords : [],
      en: chunk1.seo?.en ? buildSeo(chunk1.seo.en) : emptySeo,
      ar: chunk1.seo?.ar ? buildSeo(chunk1.seo.ar) : emptySeo,
    },
    englishArticle,
    arabicArticle,
    faq: Array.isArray(chunk2?.faq) ? chunk2.faq : [],
    faqAr: Array.isArray(chunk2?.faq_ar) ? chunk2.faq_ar : [],
    internalLinks,
    externalLinks,
    imagePrompts: chunk3?.imagePrompts || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPosts: chunk3?.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime,
    source: "gemini:chunked",
  };
}

/* P0-1: SPLIT FUNCTIONS — each is one AI call, callable from a separate      */
/* cron route. Each saves its result to the queue's article_bundle JSONB.    */
/* The original generateArticleBundle() above is kept for backward compat.    */


/**
 * Step 2a: External Web Research.
 * Performs REAL external web search via z-ai web_search API.
 * Does NOT call any LLM. Does NOT generate pseudo-research.
 *
 * This function delegates to `externalSearch()` in `src/lib/external-search.ts`,
 * which is the project's official entry point for real external web search.
 * The delegation is intentional — both the blog pipeline (Step 2a) and the
 * manual `/api/ai/research-topic` route (used by AIGenerateModal) call the
 * SAME underlying implementation, so search behavior stays consistent.
 *
 * The previous version of this function used raw `fetch()` against
 * `https://internal-api.z.ai/v1/functions/invoke` with the default `"Gemini"`
 * API key, which returns `invalid X-Token` on every call in production.
 * Using the `z-ai-web-dev-sdk` via `externalSearch()` fixes that — the SDK
 * uses an internal token and works in Vercel serverless environments.
 *
 * Returns { research, source } where research contains REAL URLs, hosts,
 * snippets from actual web search results.
 */
export async function generateExternalResearch(
  input: { topic?: string; focusKeyword?: string; category?: string },
): Promise<{ research: any; source: string }> {
  const result = await externalSearch({
    topic: input.topic,
    focusKeyword: input.focusKeyword,
    maxResults: 10,
    timeoutMs: 20_000,
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
): Promise<{ seo: any; englishArticle: string; source: string }> {
  const prompt = chunk1Prompt(input, research);
  const { text, model } = await callFreeOpenRouterLimited(
    prompt,
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 8_000,
      jsonMode: true,
      timeoutMs: 25_000,
    }
  );
  const parsed = parseJSON<any>(text);
  if (!parsed || !parsed.englishArticle || !parsed.seo) {
    throw new Error("English article chunk returned invalid data — missing englishArticle or seo");
  }
  return {
    seo: parsed.seo,
    englishArticle: parsed.englishArticle,
    source: `gemini:${model}`,
  };
}

export async function generateArabicArticle(
  input: { topic?: string; focusKeyword?: string; category?: string },
  seo: any,
  englishArticle?: string,
): Promise<{ arabicArticle: string; faq: any[]; faqAr: any[]; source: string }> {
  const prompt = chunk2Prompt(input, seo);

  const { text, model } = await callFreeOpenRouterLimited(
    prompt,
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 8_000,
      jsonMode: true,
      timeoutMs: 25_000,
    },
    2,
  );
  const parsed = parseJSON<any>(text);
  if (!parsed || !parsed.arabicArticle) {
    throw new Error("Arabic article chunk returned invalid data — missing arabicArticle");
  }
  console.log(`[blog-generate] AR article done (model: ${model}, has FAQ: ${!!parsed.faq?.length})`);
  return {
    arabicArticle: parsed.arabicArticle,
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    faqAr: Array.isArray(parsed.faq_ar) ? parsed.faq_ar : [],
    source: `gemini:${model}`,
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

  const prompt = `Generate PART 3 of a blog article bundle for MuscleHub.

CONTEXT:
 - English title: "${enTitle}"
 - Arabic title: "${arTitle}"
 - Focus keyword: "${focusKw}"

ENGLISH ARTICLE EXCERPT (for matching anchor text):
${enExcerpt}

ARABIC ARTICLE EXCERPT (for matching anchor text):
${arExcerpt}

STEP 6 — LINK SUGGESTIONS (MUST be included in both articles):
 - internalLinks: 3-5 suggested internal links to other MuscleHub blog posts.
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

  const { text, model } = await callFreeOpenRouterLimited(
    prompt,
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2_500,
      jsonMode: true,
      timeoutMs: 20_000,
    },
    2,
  );
  const parsed = parseJSON<any>(text);
  if (!parsed) throw new Error("Links + social chunk returned invalid JSON");

  const wordCount = englishArticle.split(/\s+/).length;
  const estimatedReadingTime =
    typeof parsed.estimatedReadingTime === "number"
      ? parsed.estimatedReadingTime
      : Math.max(1, Math.ceil(wordCount / 200));

  console.log(`[blog-generate] Links + social done (model: ${model}, links: ${parsed.internalLinks?.length || 0})`);
  return {
    internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks : [],
    externalLinks: Array.isArray(parsed.externalLinks) ? parsed.externalLinks : [],
    imagePrompts: parsed.imagePrompts || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPosts: parsed.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime,
    source: `gemini:${model}`,
  };
}

/**
 * Helper: build the final ArticleBundle from individual step results.
 * Used by step3-publish to assemble the complete bundle from queue data.
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
}): ArticleBundle {
  const emptySeo: SeoBlock = { seoTitle: "", metaTitle: "", metaDescription: "", slug: "" };
  const buildSeo = (block: any): SeoBlock => ({
    seoTitle: block?.seoTitle || "",
    metaTitle: block?.metaTitle || block?.seoTitle || "",
    metaDescription: block?.metaDescription || "",
    slug: block?.slug || "",
  });

  // Insert links into both articles
  const englishArticle = insertLinksIntoArticle(
    parts.englishArticle || "",
    parts.internalLinks,
    parts.externalLinks,
    false,
  );
  const arabicArticle = insertLinksIntoArticle(
    parts.arabicArticle || "",
    parts.internalLinks,
    parts.externalLinks,
    true,
  );

  return {
    research: parts.research || null,
    seo: {
      focusKeyword: parts.seo?.focusKeyword || "",
      secondaryKeywords: Array.isArray(parts.seo?.secondaryKeywords) ? parts.seo.secondaryKeywords : [],
      en: parts.seo?.en ? buildSeo(parts.seo.en) : emptySeo,
      ar: parts.seo?.ar ? buildSeo(parts.seo.ar) : emptySeo,
    },
    englishArticle,
    arabicArticle,
    faq: parts.faq || [],
    faqAr: parts.faqAr || [],
    internalLinks: parts.internalLinks || [],
    externalLinks: parts.externalLinks || [],
    imagePrompts: parts.imagePrompts || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPosts: parts.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime: parts.estimatedReadingTime || 1,
    source: "gemini:multi-step",
  };
}
