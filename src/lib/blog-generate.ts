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

import { callFreeOpenRouter, callFreeOpenRouterLimited, parseJSON } from "@/lib/ai-provider";

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

STEP 0 — RESEARCH DATA (from live web search — use this to inform your article):
Top-ranking articles on this topic:
${(research.topArticles || []).slice(0, 5).map((a: any, i: number) => `  ${i + 1}. "${a.title}" (${a.host})\n     ${a.snippet}`).join("\n")}

Related questions people are asking (address these in your article + FAQ):
${(research.relatedQuestions || []).slice(0, 8).map((q: string, i: number) => `  ${i + 1}. ${q}`).join("\n")}

Trending keywords related to this topic:
${(research.trendingAngles || []).slice(0, 8).join(", ")}

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
 - CRITICAL: The ENTIRE Arabic article MUST be 100% in Arabic. This includes:
   * All headings (H2, H3) — Arabic only, no English words
   * All paragraphs — Arabic only
   * All table headers and cell content — Arabic only
   * The FAQ questions and answers — Arabic only
   * The CTA section — Arabic only
   * The "Key Takeaways" section — Arabic only
   * Source citations — write the source name in Arabic (e.g. "وفقاً لدراسة في المجلة الدولية للتغذية الرياضية")
   * Scientific terms — transliterate to Arabic or explain in Arabic (e.g. "معدل الأيض الأساسي (BMR)")
   * Do NOT write any English sentence, phrase, or heading in the Arabic article

STEP 5 — FAQ (3-5 Q&As, SEPARATE for each language):
 - Questions people ask on Google + AI assistants about this topic.
 - Answers 40-80 words each, concise and quotable.
 - English FAQ: questions and answers in English.
 - Arabic FAQ: questions and answers in Arabic ONLY — no English words.
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
 - Each prompt: ultra-realistic, premium fitness style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.
 - Vary composition between the three (different angles / subjects).

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

export async function generateArticleBundle(
  input: { topic?: string; focusKeyword?: string; category?: string; research?: any },
): Promise<ArticleBundle> {
  console.log("[blog-generate] Starting chunked article generation");

  // ───────────────────────────────────────────────────────────────────
  // CHUNK 1: SEO + Research + English Article
  // ───────────────────────────────────────────────────────────────────
  let chunk1: any = null;
  try {
    const { text: raw1, model: model1 } = await callFreeOpenRouter(
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
    console.error("[blog-generate] Chunk 1 failed:", e?.message);
    throw new Error(`Chunk 1 (SEO + English article) failed: ${e?.message}`);
  }

  if (!chunk1 || !chunk1.englishArticle || !chunk1.seo) {
    throw new Error("Chunk 1 returned invalid data — missing seo or englishArticle");
  }

  // ───────────────────────────────────────────────────────────────────
  // CHUNK 2: Arabic Article + FAQ (in parallel with Chunk 3)
  // ───────────────────────────────────────────────────────────────────
  const chunk2Promise = callFreeOpenRouter(
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
  const chunk3Promise = callFreeOpenRouter(
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
    source: "openrouter:chunked",
  };
}

/* ========================================================================= */
/* P0-1: SPLIT FUNCTIONS — each is one AI call, callable from a separate      */
/* cron route. Each saves its result to the queue's article_bundle JSONB.    */
/* The original generateArticleBundle() above is kept for backward compat.    */
/* ========================================================================= */

/**
 * Step 2a: Research.
 * Single AI call. Returns research JSON (top articles, related questions,
 * trending keywords, search intent).
 */
export async function generateResearch(
  input: { topic?: string; focusKeyword?: string; category?: string },
): Promise<{ research: any; source: string }> {
  const researchPrompt = `You are an expert SEO/GEO content strategist. Research the topic "${input.focusKeyword || input.topic}" for a fitness & nutrition coaching blog (MuscleHub, Egypt-focused, Arabic + English audience).

Based on your knowledge of search trends, Google search behavior, and AI answer engine patterns, provide:

1. TOP_ARTICLES: The top 5 article angles currently ranking for this topic (title + brief description of what they cover).
2. RELATED_QUESTIONS: 8-10 questions people actually search for related to this topic (like Answer The Public would show).
3. TRENDING_KEYWORDS: 10-15 related keywords and subtopics that are trending or have high search volume.
4. SEARCH_INTENT: Is the primary search intent informational, commercial, or transactional? What does the searcher really want?

Return STRICT JSON only:
{
  "topArticles": [{"title": "...", "description": "..."}],
  "relatedQuestions": ["question 1", "..."],
  "trendingKeywords": ["keyword 1", "..."],
  "searchIntent": "informational|commercial|transactional",
  "searcherGoal": "what the searcher really wants to achieve"
}`;

  const { text, model } = await callFreeOpenRouterLimited(
    researchPrompt,
    {
      systemPrompt: "You are an expert SEO strategist. Return JSON only.",
      temperature: 0.5,
      maxTokens: 2000,
      jsonMode: true,
      timeoutMs: 20_000,
    },
    2,
  );
  const research = parseJSON<any>(text);
  if (!research) throw new Error("Research returned invalid JSON");
  console.log(`[blog-generate] Research done (model: ${model})`);
  return { research, source: `openrouter:${model}` };
}

/**
 * Step 2b: SEO data + English article.
 * Single AI call. Takes research as input. Returns SEO block + English article.
 * maxTokens increased from 4000 to 8000 to prevent truncation (P0-2 fix).
 */
export async function generateEnglishArticle(
  input: { topic?: string; focusKeyword?: string; category?: string },
  research: any,
): Promise<{ seo: any; englishArticle: string; source: string }> {
  const { text, model } = await callFreeOpenRouterLimited(
    chunk1Prompt(input, research),
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
  if (!parsed || !parsed.englishArticle || !parsed.seo) {
    throw new Error("English article chunk returned invalid data — missing seo or englishArticle");
  }
  console.log(`[blog-generate] EN article done (model: ${model}, words: ${parsed.englishArticle.split(/\s+/).length})`);
  return { seo: parsed.seo, englishArticle: parsed.englishArticle, source: `openrouter:${model}` };
}

/**
 * Step 2c: Arabic article + FAQ.
 * Single AI call. Takes SEO + English article as input (EN article improves
 * coherence — the AR writer can match structure and depth).
 * maxTokens increased from 4000 to 8000 to prevent truncation.
 */
export async function generateArabicArticle(
  input: { topic?: string; focusKeyword?: string; category?: string },
  seo: any,
  englishArticle: string,
): Promise<{ arabicArticle: string; faq: any[]; faqAr: any[]; source: string }> {
  const enTitle = seo?.en?.seoTitle || input.topic || "";
  const arTitle = seo?.ar?.seoTitle || "";
  const focusKw = seo?.focusKeyword || input.focusKeyword || "";

  // Truncate English article to ~2000 words to keep prompt size manageable
  const enExcerpt = englishArticle.split(/\s+/).slice(0, 2000).join(" ");

  const prompt = `Generate PART 2 of a blog article bundle for MuscleHub.

CONTEXT FROM PART 1:
 - English title: "${enTitle}"
 - Arabic title: "${arTitle}"
 - Focus keyword: "${focusKw}"

ENGLISH ARTICLE (for reference — match its structure, depth, and topic coverage):
${enExcerpt}

STEP 4 — ARABIC ARTICLE (LOCALIZED, NOT TRANSLATED, Markdown, 500-800 words):
 - Adapt the angle for an Egyptian / Gulf Arabic-speaking audience.
 - Use culturally relevant examples (Egyptian foods, local gym culture, prayer-time scheduling, etc.).
 - Write in Modern Standard Arabic with a friendly, motivating tone.
 - Do NOT translate English idioms literally — rewrite for Arabic readers.
 - Same SEO structure as English (H2/H3, table, key takeaways, CTA sections).
 - Match the English article's depth and coverage — cover the same sub-topics.
 - Include the focus keyword (transliterated or Arabic equivalent) naturally.
 - CRITICAL: The ENTIRE Arabic article MUST be 100% in Arabic. This includes:
   * All headings (H2, H3) — Arabic only, no English words
   * All paragraphs — Arabic only
   * All table headers and cell content — Arabic only
   * The FAQ questions and answers — Arabic only
   * The CTA section — Arabic only
   * The "Key Takeaways" section — Arabic only
   * Source citations — write the source name in Arabic (e.g. "وفقاً لدراسة في المجلة الدولية للتغذية الرياضية")
   * Scientific terms — transliterate to Arabic or explain in Arabic (e.g. "معدل الأيض الأساسي (BMR)")
   * Do NOT write any English sentence, phrase, or heading in the Arabic article

STEP 5 — FAQ (3-5 Q&As, SEPARATE for each language):
 - Questions people ask on Google + AI assistants about this topic.
 - Answers 40-80 words each, concise and quotable.
 - English FAQ: questions and answers in English.
 - Arabic FAQ: questions and answers in Arabic ONLY — no English words.
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
    source: `openrouter:${model}`,
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
 - Each prompt: ultra-realistic, premium fitness style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.
 - Vary composition between the three (different angles / subjects).

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
    source: `openrouter:${model}`,
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
    source: "openrouter:multi-step",
  };
}
