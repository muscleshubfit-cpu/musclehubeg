/**
 * src/lib/blog-pipeline.ts — PIPELINE V2 · PHASES 1, 2, 4 (+ image guard)
 *
 * Owner directive 2026-08-27 — article generation restructured into:
 *   P1 outline  : pick ONE topic from P0 suggestions → SEO title,
 *                 subtitle, intro/5-7 H2/conclusion outline, LSI
 *                 keywords, image plan (subject + type per image).
 *   P2 content  : full 1500–2500-word article in the SAME language,
 *                 following the outline and naturally answering the
 *                 P0 FAQs.
 *   P4 review   : proofread/flow/dedup pass, keyword-coverage check,
 *                 conservative fact-check (never invent citations),
 *                 internal+external links, closing Call-to-Action.
 *
 * All calls go through callFreeAIFallbackChain (OpenRouter + Groq only,
 * strongest free models first, automatic fall-through to the next model
 * on failure). IMAGE MODESTY GUARD is enforced here on every prompt.
 */
import { callFreeAIFallbackChain } from "./ai-provider";
import { parseJSONLoose, type LanguageResearch } from "./blog-research";
import { getRecentPostsByLanguage, isDuplicateTopic } from "./blog-topics";

// ─────────────────────────────────────────────────────────────────
// OWNER HARD RULE: modest imagery only.
// Appended to EVERY image prompt used anywhere in the pipeline.
// ─────────────────────────────────────────────────────────────────
export const IMAGE_MODESTY_SUFFIX =
  ", modest athletic attire with full body coverage, no nudity, no revealing or suggestive clothing, no exposed midriff or cleavage, no women in revealing outfits, family-friendly editorial photography";

export type ImagePlanItem = { subject: string; type: string };

export type OutlinePlan = {
  title: string;
  subtitle: string;
  metaDescription: string;
  slugBase: string;
  sections: string[]; // 5–7 H2 headings
  lsiKeywords: string[];
  imagePlan: ImagePlanItem[];
};

export type ReviewReport = {
  changesSummary: string[];
  keywordCoverage: "good" | "partial" | "poor";
  factCheckNotes: string;
  ctaAdded: boolean;
};

export type InternalLinkCandidate = { slug: string; title: string };

const LANG_RULE: Record<"en" | "ar", string> = {
  en: "Write in ENGLISH for an international fitness audience.",
  ar: "اكتب باللغة العربية الفصحى المبسطة بنبرة مصرية/خليجية ودّية. كل المحتوى بالعربية بالكامل (بما في ذلك العناوين والروابط النصية).",
};

/** Compact JSON view of research fed to prompts (keeps token cost sane). */
function researchDigest(r: LanguageResearch): string {
  const kws = r.keywords.map((k) => `${k.keyword} (${k.searchVolume || "?"})`).join("; ");
  const faqs = r.faqs.map((f) => `Q: ${f.question}`).join(" | ");
  return `KEYWORDS: ${kws}\nCOMMON QUESTIONS: ${faqs}`;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1 — topic choice + outline
// ═══════════════════════════════════════════════════════════════

/** Model ranks the 5 researched topics; code applies a hard dup-guard. */
export async function pickTopicIndex(
  lang: "en" | "ar",
  topics: string[],
): Promise<number> {
  const recent = await getRecentPostsByLanguage(lang, 100);
  const recentLite = recent.map((p) => p.title);
  try {
    const prompt = `You are an SEO strategist. Recent published titles (avoid overlap):\n${recentLite.slice(0, 30).map((t) => `- ${t}`).join("\n")}\n\nCandidate topics:\n${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nPick the candidate with the best search potential AND lowest duplication risk. Return STRICT JSON: {"index": <1-based number>}`;
    const { text } = await callFreeAIFallbackChain(prompt, {
      temperature: 0.4,
      maxTokens: 120,
      jsonMode: true,
      timeoutMs: 40_000,
      maxModels: 3,
    });
    const parsed = parseJSONLoose<{ index?: number }>(text);
    const idx = parsed?.index ? Number(parsed.index) - 1 : -1;
    if (idx >= 0 && idx < topics.length) return idx;
  } catch {
    /* fall through to deterministic pick */
  }
  // Deterministic fallback: first non-duplicate suggestion (LRU-friendly).
  for (let i = 0; i < topics.length; i++) {
    if (!recent.some((p) => isDuplicateTopic(topics[i], topics[i], [p]).duplicate)) return i;
  }
  return 0;
}

export async function buildOutline(
  lang: "en" | "ar",
  topic: string,
  research: LanguageResearch,
): Promise<{ outline: OutlinePlan; source: string }> {
  const prompt = `You are an expert SEO content planner for a fitness & nutrition blog.
${LANG_RULE[lang]}

CHOSEN TOPIC: "${topic}"

${researchDigest(research)}

Create the detailed article blueprint. Return STRICT JSON only:
{
  "title": "SEO headline 50-65 chars, contains the main keyword naturally",
  "subtitle": "one engaging supporting line",
  "metaDescription": "140-155 chars including the main keyword",
  "slugBase": "short-url-slug-in-lowercase-english-even-for-arabic",
  "sections": ["H2 heading 1", "..."],            // exactly 5-7 H2s, logical teaching order from intro to conclusion
  "lsiKeywords": ["...", "..."],                   // 8-12 LSI/sub-keywords to weave in naturally
  "imagePlan": [ {"subject": "exact visual subject", "type": "photo|infographic|diagram"} ] // 3-5 items matching the sections
}`;
  const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
    temperature: 0.6,
    // 2026-08-27 hardening: Groq's strict json mode HARD-FAILS when a
    // reasoning model (gpt-oss) burns completion tokens on hidden CoT
    // before finishing the document ("max completion tokens reached").
    // We have our own tolerant extractor (parseJSONLoose) — drop
    // response_format so partial/fenced JSON can still be salvaged.
    maxTokens: 2_600,
    jsonMode: false,
    timeoutMs: 70_000,
    maxModels: 2,
  });
  const parsed = parseJSONLoose<any>(text);
  if (!parsed?.title || !Array.isArray(parsed.sections)) {
    throw new Error(`P1 ${lang}: invalid outline JSON from ${provider}:${model}`);
  }
  const imagePlan: ImagePlanItem[] = Array.isArray(parsed.imagePlan)
    ? parsed.imagePlan
        .map((i: any) => ({ subject: String(i?.subject ?? "").trim(), type: String(i?.type ?? "photo").trim() }))
        .filter((i: ImagePlanItem) => i.subject.length > 2)
        .slice(0, 5)
    : [];
  const lsi: string[] = Array.isArray(parsed.lsiKeywords)
    ? parsed.lsiKeywords.filter((k: unknown): k is string => typeof k === "string").slice(0, 12)
    : [];

  console.log(`[blog-pipeline] P1 ${lang} done (${provider}:${model})`);
  return {
    outline: {
      title: String(parsed.title),
      subtitle: String(parsed.subtitle ?? ""),
      metaDescription: String(parsed.metaDescription ?? "").slice(0, 160),
      slugBase: String(parsed.slugBase ?? topic).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60),
      sections: parsed.sections.filter((s: unknown): s is string => typeof s === "string").slice(0, 8),
      lsiKeywords: lsi,
      imagePlan,
    },
    source: `${provider}:${model}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 — full content generation (1500–2500 words)
// ═══════════════════════════════════════════════════════════════

export async function generateFullArticle(
  lang: "en" | "ar",
  outline: OutlinePlan,
  research: LanguageResearch,
): Promise<{ markdown: string; wordCount: number; source: string }> {
  const faqBlock = research.faqs
    .map((f) => `- ${f.question}`)
    .join("\n");

  const prompt = `You are an elite fitness/nutrition copywriter. Write the FULL article.
${LANG_RULE[lang]}

TITLE: ${outline.title}
SUBTITLE: ${outline.subtitle}
MAIN KEYWORDS TO COVER NATURALLY: ${research.keywords.slice(0, 6).map((k) => k.keyword).join("; ")}
LSI KEYWORDS: ${outline.lsiKeywords.join("; ")}

EXACT OUTLINE — follow it section by section:
- Introduction (hook + what the reader will learn)
${outline.sections.map((s) => `- H2: ${s}`).join("\n")}
- Conclusion

REQUIREMENTS:
1. Length: 1500-2500 words TOTAL (do NOT stop before 1500).
2. Use "## " for each H2 exactly as outlined (keep the wording), short paragraphs (2-4 sentences), bullet lists where useful.
3. Weave keywords + LSI terms NATURALLY (no stuffing).
4. Answer these reader questions inside relevant sections:
${faqBlock}
5. Practical, evidence-aligned advice; when citing research, name the finding generically (e.g. "studies show...") — do NOT invent paper names, authors or URLs.
6. No title repetition at the top — start directly with the introduction paragraph.

Return STRICT JSON only:
{ "articleMd": "the full article in markdown (## headings, no # H1)" }`;

  const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
    temperature: 0.7,
    // GROQ FREE FIT (2026-08-27, hard data from dispatch logs): Groq enforces
    // an 8000 TPM ceiling and COUNTS max_tokens in it — a 16000-cap request
    // returns 413 'Requested 16664' every time. A 1500-2500 word article is
    // only ~3000 output tokens, so 6400 keeps us under the ceiling while
    // leaving headroom. timeout 60s × maxModels 3 = 180s GHA budget.
    maxTokens: 6_400,
    jsonMode: false, // tolerant extraction instead of strict-mode hard fails
    timeoutMs: 60_000,
    maxModels: 3,
  });
  const parsed = parseJSONLoose<{ articleMd?: string; article?: string }>(text);
  const md = (parsed?.articleMd || parsed?.article || "").trim();
  const wc = countWords(md);
  if (!md || wc < 400) {
    throw new Error(`P2 ${lang}: empty/too-short article from ${provider}:${model}`);
  }
  console.log(`[blog-pipeline] P2 ${lang} done (${provider}:${model}, ~${wc} words)`);
  return { markdown: md, wordCount: wc, source: `${provider}:${model}` };
}

export function countWords(md: string): number {
  return md.split(/\s+/).filter(Boolean).length;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4 — quality review & enhancement
// ═══════════════════════════════════════════════════════════════

/**
 * Deterministic safety net: if the enhanced draft is still short, append
 * an FAQ section built directly from Phase 0 research (real answers,
 * no hallucination). Used by p4 route after the model pass.
 */
export function ensureFaqSection(
  lang: "en" | "ar",
  md: string,
  research: LanguageResearch,
): { md: string; appended: boolean } {
  const header =
    lang === "ar" ? "## الأسئلة الشائعة" : "## Frequently Asked Questions";
  if (/^##\s*(frequently asked|الأسئلة الشائعة)/im.test(md)) return { md, appended: false };
  const items = research.faqs
    .slice(0, Math.min(10, research.faqs.length))
    .map((f) =>
      lang === "ar"
        ? `**${f.question}**\n\n${f.answer}`
        : `**${f.question}**\n\n${f.answer}`,
    );
  if (items.length === 0) return { md, appended: false };
  return { md: `${md}\n\n${header}\n\n${items.join("\n\n")}`, appended: true };
}

export async function reviewAndEnhance(
  lang: "en" | "ar",
  draftMd: string,
  outline: OutlinePlan,
  internalCandidates: InternalLinkCandidate[],
): Promise<{
  markdown: string;
  report: ReviewReport;
  internalLinks: { slug: string; anchorText: string }[];
  externalLinks: { url: string; anchorText: string }[];
  source: string;
}> {
  const candidates =
    internalCandidates.length > 0
      ? internalCandidates.slice(0, 15).map((c) => `- /blog/${c.slug} → ${c.title}`).join("\n")
      : "(no previous posts yet)";

  const prompt = `You are a senior editor doing FINAL QUALITY REVIEW of a fitness blog article.
${LANG_RULE[lang]}

ARTICLE TITLE: ${outline.title}
TARGET LENGTH: 1500-2500 words (expand thin sections if needed).

DRAFT (markdown):
"""
${draftMd}
"""

EXISTING SITE POSTS you may internally link to (slug → title):
${candidates}

DO ALL OF THE FOLLOWING:
1. Proofread: fix grammar/spelling, improve flow, remove repetition (merge duplicated points).
2. Verify every main keyword & LSI term appears naturally at least once; add a sentence where missing.
3. Fact-guard: remove or soften any specific citation that looks invented (paper names/authors/URLs that may not exist). Keep generic phrasing like "research shows".
4. Add EXACTLY 2-4 internal links using [anchor](/blog/slug) format on fitting anchor text from the list above (only real slugs).
5. Add at most 2 external links ONLY to well-known authoritative domains you are certain exist (who.int, ncbi.nlm.nih.gov, cdc.gov, mayoclinic.org) in [anchor](https://...) format.
6. Append a closing Call-to-Action paragraph inviting the reader to join MuscleHubEG coaching / explore the site.
7. Keep all "## " section structure; output the COMPLETE final article.

Return STRICT JSON only:
{
  "articleMd": "full final article markdown",
  "changesSummary": ["short change notes"],
  "keywordCoverage": "good|partial|poor",
  "factCheckNotes": "what was removed/softened and why",
  "ctaAdded": true,
  "internalLinks": [{"slug":"used-slug","anchorText":"anchor"}],
  "externalLinks": [{"url":"https://...","anchorText":"anchor"}]
}`;

  const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
    temperature: 0.4,
    // Review embeds the FULL draft → ~9k-token requests (excluded from Groq
    // by the chain's big-payload guard) and need one long nemotron window,
    // not several short ones: 105s × 2 = 210s ≤ GHA budget 240s.
    maxTokens: 6_400,
    jsonMode: false,
    timeoutMs: 105_000,
    maxModels: 2,
  });
  const parsed = parseJSONLoose<any>(text);
  const md = (parsed?.articleMd || "").trim();
  if (!md || countWords(md) < 400) {
    throw new Error(`P4 ${lang}: invalid review JSON from ${provider}:${model}`);
  }
  const coverage = ["good", "partial", "poor"].includes(parsed?.keywordCoverage)
    ? (parsed.keywordCoverage as ReviewReport["keywordCoverage"])
    : "partial";

  console.log(`[blog-pipeline] P4 ${lang} done (${provider}:${model})`);
  return {
    markdown: md,
    report: {
      changesSummary: Array.isArray(parsed.changesSummary)
        ? parsed.changesSummary.filter((c: unknown): c is string => typeof c === "string").slice(0, 10)
        : [],
      keywordCoverage: coverage,
      factCheckNotes: String(parsed?.factCheckNotes ?? ""),
      ctaAdded: Boolean(parsed?.ctaAdded),
    },
    internalLinks: Array.isArray(parsed.internalLinks)
      ? parsed.internalLinks
          .filter((l: any) => typeof l?.slug === "string" && typeof l?.anchorText === "string")
          .slice(0, 5)
      : [],
    externalLinks: Array.isArray(parsed.externalLinks)
      ? parsed.externalLinks
          .filter((l: any) => typeof l?.url === "string" && /^https:\/\//.test(l.url) && typeof l?.anchorText === "string")
          .slice(0, 3)
      : [],
    source: `${provider}:${model}`,
  };
}
