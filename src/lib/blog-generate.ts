import { callAIWithFallback, parseJSON } from "@/lib/ai-provider";
import type { AIConfig } from "@/lib/ai-provider";

/**
 * Shared article-bundle generator.
 *
 * Extracted out of the manual "Generate Article" editor endpoint so the
 * automated cron pipeline (src/app/api/cron/generate-blog-post) can reuse
 * the exact same, already-tuned SEO/GEO/AEO prompt and JSON-parsing/validation
 * logic instead of a second, drifting copy.
 */

export const ARTICLE_SYSTEM_PROMPT = `You are the MuscleHub AI Content Assistant — an expert SEO content strategist and copywriter for a premium online nutrition & fitness coaching platform (Coach Ahmed Zake, musclehubeg.vercel.app).

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
  - The COACHING CTA must invite readers to get a personalized plan from Coach Ahmed Zake.
  - The NEWSLETTER CTA must invite readers to subscribe for weekly evidence-based tips.

Output: STRICT JSON only. No prose outside the JSON, no markdown fences.`;

export const articleUserPrompt = (input: {
  topic?: string;
  focusKeyword?: string;
  category?: string;
}) => `Generate a complete blog article bundle for MuscleHub.

INPUT:
  - Topic: ${input.topic || "(none — derive from focus keyword)"}
  - Focus Keyword: ${input.focusKeyword || "(none — derive from topic)"}
  - Category: ${input.category || "nutrition"}

STEP 1 — RESEARCH (do silently):
  - Identify the search intent (informational / commercial / transactional).
  - Pick the best article angle that wins on Google AND AI search.
  - Choose 1 primary focus keyword + 5-8 secondary keywords.

STEP 2 — SEO DATA:
  - seoTitle:        ≤ 60 chars, includes focus keyword near the front.
  - metaTitle:       ≤ 60 chars, may equal seoTitle.
  - metaDescription: 120-160 chars, includes focus keyword + a CTA verb.
  - slug:            kebab-case, 3-6 words, includes focus keyword.
  - focusKeyword:    the single primary keyword.
  - secondaryKeywords: array of 5-8 related keywords.

STEP 3 — ENGLISH ARTICLE (Markdown, 600-900 words):
  - Start with a clear 2-3 sentence answer to the title (AEO).
  - Use H2/H3 hierarchy, bullet lists, at least one comparison table.
  - Cite sources inline as "(Source: NIH, 2024)" style.
  - End with a "Key Takeaways" section (3-5 bullets).
  - Embed a Coaching CTA section (H2 "Ready for a Personalized Plan?") + a Newsletter CTA section.
  - Insert the focus keyword in the first paragraph, in at least one H2, and 2-3 times in body.

STEP 4 — ARABIC ARTICLE (LOCALIZED, NOT TRANSLATED, Markdown, 600-900 words):
  - Adapt the angle for an Egyptian / Gulf Arabic-speaking audience.
  - Use culturally relevant examples (Egyptian foods, local gym culture, prayer-time scheduling, etc.).
  - Write in Modern Standard Arabic with a friendly, motivating tone.
  - Do NOT translate English idioms literally — rewrite for Arabic readers.
  - Same SEO structure as English (H2/H3, table, key takeaways, CTA sections).
  - Include the focus keyword (transliterated or Arabic equivalent) naturally.

STEP 5 — FAQ (3-5 Q&As):
  - Questions people ask on Google + AI assistants about this topic.
  - Answers 40-80 words each, concise and quotable.

STEP 6 — LINK SUGGESTIONS:
  - internalLinks: 3-5 suggested internal links to other MuscleHub blog posts (use plausible slugs; the admin will confirm). Each: { slug, anchorText, reason }.
  - externalLinks: 3-5 authoritative external references (NIH, WHO, Examine.com, ACE, ISSN, Mayo Clinic). Each: { url, anchorText, reason }.

STEP 7 — IMAGE PROMPTS (English, for AI image generators):
  - featuredImage, facebookImage, openGraphImage
  - Each prompt: ultra-realistic, premium fitness style, dramatic lighting, blue & gold accent palette, NO text overlay, high CTR.
  - Vary composition between the three (different angles / subjects).

STEP 8 — SOCIAL MEDIA POSTS:
  - facebook, linkedin, instagram, x
  - Each post: strong hook (first line), 2-3 supporting lines, engagement question, CTA, 3-6 hashtags.
  - Add a final line: "Registration link in the first comment 👇" (English) or "رابط التسجيل في أول تعليق 👇" (Arabic).
  - X post must be ≤ 280 chars.

STEP 9 — estimatedReadingTime (integer minutes, based on English article word count @ 200 wpm).

RETURN STRICT JSON with this exact shape:
{
  "research": {
    "angle": "string — one sentence describing the chosen angle",
    "searchIntent": "informational | commercial | transactional",
    "rationale": "string — 1-2 sentences why this angle wins on Google + AI search"
  },
  "seo": {
    "seoTitle": "string",
    "metaTitle": "string",
    "metaDescription": "string",
    "slug": "string",
    "focusKeyword": "string",
    "secondaryKeywords": ["string", "..."]
  },
  "englishArticle": "markdown string",
  "arabicArticle": "markdown string",
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "internalLinks": [
    { "slug": "string", "anchorText": "string", "reason": "string" }
  ],
  "externalLinks": [
    { "url": "string", "anchorText": "string", "reason": "string" }
  ],
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

export type ArticleBundle = {
  research: { angle: string; searchIntent: string; rationale: string } | null;
  seo: {
    seoTitle: string;
    metaTitle: string;
    metaDescription: string;
    slug: string;
    focusKeyword: string;
    secondaryKeywords: string[];
  };
  englishArticle: string;
  arabicArticle: string;
  faq: { question: string; answer: string }[];
  internalLinks: { slug: string; anchorText: string; reason: string }[];
  externalLinks: { url: string; anchorText: string; reason: string }[];
  imagePrompts: { featuredImage: string; facebookImage: string; openGraphImage: string };
  socialPosts: { facebook: string; linkedin: string; instagram: string; x: string };
  estimatedReadingTime: number;
  source: string;
};

export async function generateArticleBundle(
  input: { topic?: string; focusKeyword?: string; category?: string },
  override?: Partial<AIConfig>,
): Promise<ArticleBundle> {
  const prompt = articleUserPrompt(input);

  const { text: raw, provider: usedProvider } = await callAIWithFallback(
    prompt,
    {
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 12_000,
      jsonMode: true,
      timeoutMs: 240_000,
    },
    override,
  );

  const parsed = parseJSON<any>(raw);
  if (!parsed) {
    throw new Error("AI returned a response but it was not valid JSON.");
  }

  return {
    research: parsed.research || null,
    seo: {
      seoTitle: parsed.seo?.seoTitle || "",
      metaTitle: parsed.seo?.metaTitle || parsed.seo?.seoTitle || "",
      metaDescription: parsed.seo?.metaDescription || "",
      slug: parsed.seo?.slug || "",
      focusKeyword: parsed.seo?.focusKeyword || input.focusKeyword || "",
      secondaryKeywords: Array.isArray(parsed.seo?.secondaryKeywords) ? parsed.seo.secondaryKeywords : [],
    },
    englishArticle: parsed.englishArticle || "",
    arabicArticle: parsed.arabicArticle || "",
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks : [],
    externalLinks: Array.isArray(parsed.externalLinks) ? parsed.externalLinks : [],
    imagePrompts: parsed.imagePrompts || { featuredImage: "", facebookImage: "", openGraphImage: "" },
    socialPosts: parsed.socialPosts || { facebook: "", linkedin: "", instagram: "", x: "" },
    estimatedReadingTime:
      typeof parsed.estimatedReadingTime === "number"
        ? parsed.estimatedReadingTime
        : Math.max(1, Math.ceil((parsed.englishArticle || "").split(/\s+/).length / 200)),
    source: usedProvider,
  };
}
