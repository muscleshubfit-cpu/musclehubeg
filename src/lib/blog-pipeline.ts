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
import { sanitizeModelSlug } from "./slug";

// ─────────────────────────────────────────────────────────────────
// OWNER HARD RULE (2026-08-27 REVISED): PEOPLE-FREE AI imagery ONLY.
// The old textual 'modesty suffix' is RETIRED — see image-safety.ts.
// ─────────────────────────────────────────────────────────────────
export const IMAGE_MODESTY_SUFFIX_RETIRED = true;
// (retired value — negation tokens like 'no nudity' POISON diffusion
// prompts and directly caused the live immodest-render incident;
// policy now centralized in src/lib/image-safety.ts)

export type ImagePlanItem = { subject: string; type: string };

export type OutlinePlan = {
  title: string;
  subtitle: string;
  metaDescription: string;
  slugBase: string;
  sections: string[]; // 5–7 H2 headings
  lsiKeywords: string[];
  imagePlan: ImagePlanItem[];
  /** PHASE 62 VARIETY: the article type/angle chosen for this run —
   *  shapes the outline + writing instructions so consecutive articles
   *  stop sharing one structural mold. */
  angle?: string;
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
// PHASE 62 VARIETY — ARTICLE-TYPE ROTATION (owner: «مفروض يكون فى تنوع
// كبير وتدوير لنوع المقالات»). Path A previously forced EVERY article
// through one generic 5-7 H2 teaching skeleton + the same closing CTA.
// Each run now draws a random angle and the outline/writing/review
// prompts genuinely shape themselves around it.
// ═══════════════════════════════════════════════════════════════
type ArticleAngle = { id: string; en: string; ar: string; shapeEn: string; shapeAr: string };

export const ARTICLE_ANGLES: ArticleAngle[] = [
  {
    id: "guide",
    en: "a practical step-by-step how-to guide",
    ar: "دليل عملي خطوة بخطوة",
    shapeEn: "numbered step sections, each with concrete actions and a common-pitfall note",
    shapeAr: "أقسام خطوات مرقّمة، كل خطوة بإجراءات ملموسة وتحذير من خطأ شائع",
  },
  {
    id: "myths",
    en: "a myth-busting article (claim → what science actually says → what to do instead)",
    ar: "مقال دحض خرافات (الادعاء ← ماذا يقول العلم فعلاً ← البديل الصحيح)",
    shapeEn: "one section per myth, each opening with the popular claim then the correction",
    shapeAr: "قسم لكل خرافة، يبدأ بالادعاء الشائع ثم تصحيحه العلمي",
  },
  {
    id: "comparison",
    en: "a head-to-head comparison (X vs Y)",
    ar: "مقال مقارنة مباشرة (س مقابل ص)",
    shapeEn: "criteria-based sections (effectiveness, cost, time, who it suits) ending with a verdict",
    shapeAr: "أقسام حسب معايير (الفعالية، التكلفة، الوقت، لمن يناسب) وتنتهي بحكم نهائي",
  },
  {
    id: "mistakes",
    en: "a mistakes-and-fixes article",
    ar: "مقال أخطاء وحلولها",
    shapeEn: "numbered mistakes, each with the signs you are doing it + the exact fix",
    shapeAr: "أخطاء مرقّمة، كل خطأ بعلامات تعرفه + الحل الدقيق",
  },
  {
    id: "science",
    en: "a science deep-dive explained simply",
    ar: "تحليل علمي مبسط",
    shapeEn: "mechanism → evidence → practical application sections, jargon-free",
    shapeAr: "أقسام: الآلية ← الأدلة ← التطبيق العملي، بلغة بسيطة بلا مصطلحات معقدة",
  },
  {
    id: "checklist",
    en: "a checklist / cheat-sheet article",
    ar: "مقال قائمة مرجعية (تشيك ليست)",
    shapeEn: "short focused sections of scannable checklists the reader can apply today",
    shapeAr: "أقسام قصيرة بقوائم قابلة للتطبيق اليوم",
  },
  {
    id: "faq",
    en: "a question-driven article answering real reader questions",
    ar: "مقال أسئلة وأجوبة لأكثر ما يسأل الناس",
    shapeEn: "each H2 is a real question phrased the way people search, answered directly",
    shapeAr: "كل عنوان رئيسي سؤال حقيقي بصيغة البحث الشائع، مع إجابة مباشرة",
  },
  {
    id: "plan",
    en: "a ready-to-use plan/template article (7-day sample, prep template…)",
    ar: "مقال خطة/قالب جاهز للتطبيق (أسبوع نموذجي، قالب تحضير وجبات…)",
    shapeEn: "template sections the reader can copy, with adaptation notes for different levels",
    shapeAr: "أقسام قوالب جاهزة للنسخ مع ملاحظات تكييف لكل مستوى",
  },
  {
    id: "beginner-path",
    en: "a beginner-focused pathway article (zero to competent in X weeks)",
    ar: "مقال مسار للمبتدئين (من الصفر إلى الإتقان خلال أسابيع)",
    shapeEn: "week-by-week progression sections with milestones and self-tests",
    shapeAr: "أقسام أسبوع بأسبوع مع محطات قياس تقدم واختبارات ذاتية",
  },
  {
    id: "food-focus",
    en: "a food/kitchen-focused practical article (shopping, prep, recipes structure)",
    ar: "مقال عملي مركز على المطبخ (تسوق، تحضير، هيكل وصفات)",
    shapeEn: "kitchen-actionable sections: what to buy, how to prep, how to combine",
    shapeAr: "أقسام قابلة للتنفيذ في المطبخ: ماذا تشتري، كيف تحضّر، كيف تجمع",
  },
];

export function pickArticleAngle(): ArticleAngle {
  return ARTICLE_ANGLES[Math.floor(Math.random() * ARTICLE_ANGLES.length)];
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
      tag: `blog:pick-topic-${lang}`,
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
  const angle = pickArticleAngle();
  const angleLine = lang === "ar"
    ? `نوع المقال المطلوب: ${angle.ar} — صمّم أقسام H2 بحيث تناسب هذا النوع فعلاً (${angle.shapeAr})؛ ممنوع إعادة استخدام هيكل عام موحّد لكل المقالات.`
    : `ARTICLE TYPE: ${angle.en} — shape the H2 sections to genuinely fit this type (${angle.shapeEn}); do NOT reuse a generic one-size-fits-all skeleton.`;
  const prompt = `You are an expert SEO content planner for a fitness & nutrition blog.
${LANG_RULE[lang]}

CHOSEN TOPIC: "${topic}"

${angleLine}

LONG-TAIL SEO LAW (owner directive 2026-09-01): the title, at least TWO H2
headings, and at least 5 of the LSI keywords must mirror REAL long-tail
search phrasing — the exact question-style / how-to / "best X for Y" phrasings
people type into Google and AI assistants (e.g. "how many calories to eat to
lose weight" beats "calories"). Broad head-term titles are a FAILURE.

${researchDigest(research)}

Create the detailed article blueprint. Return STRICT JSON only:
{
  "title": "SEO headline 50-65 chars containing the LONG-TAIL keyword naturally, phrased like a real search query",
  "subtitle": "one engaging supporting line",
  "metaDescription": "140-155 chars including the long-tail keyword",
  "slugBase": "short-url-slug-in-lowercase-english-even-for-arabic",
  "sections": ["H2 heading 1", "..."],            // exactly 5-7 H2s shaped for the article type above; at least TWO phrased as real long-tail search questions
  "lsiKeywords": ["...", "..."],                   // 8-12 sub-keywords to weave in naturally; at least 5 must be 3+ word long-tail phrases
  "imagePlan": [ {"subject": "exact visual subject", "type": "photo|infographic|diagram"} ] // 3-5 items matching the sections. IMAGE LAW: subjects MUST be ENGLISH physical OBJECTS or SCENES ONLY (equipment, food, interiors) — NEVER any person, body part, people word, or clothing wording
}`;
  const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
    tag: `blog:outline-${lang}`,
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

  console.log(`[blog-pipeline] P1 ${lang} done (${provider}:${model}, angle: ${angle.id})`);
  return {
    outline: {
      title: String(parsed.title),
      subtitle: String(parsed.subtitle ?? ""),
      metaDescription: String(parsed.metaDescription ?? "").slice(0, 160),
      // ONE-SLUG-LAW (2026-08-28j): was a local 60-char inline sanitize —
      // now the same latin law as the coach generator (≤80, min 3 → "").
      slugBase: sanitizeModelSlug(String(parsed.slugBase ?? topic)),
      sections: parsed.sections.filter((s: unknown): s is string => typeof s === "string").slice(0, 8),
      lsiKeywords: lsi,
      imagePlan,
      angle: angle.id,
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

  // PHASE 62 VARIETY: honor the angle chosen in P1 (flows through the
  // queue bundle). Unknown/legacy outlines fall back to a random angle.
  const angle = ARTICLE_ANGLES.find((a) => a.id === outline.angle) ?? pickArticleAngle();
  const angleLine = lang === "ar"
    ? `اكتب المقال كـ${angle.ar}: ${angle.shapeAr}. اجعل الافتتاحية تناسب هذا النوع (مثلاً: مشهد واقعي أو خرافة شائعة أو سؤال حقيقي) وليس تعريفاً عاماً.`
    : `Write this as ${angle.en}: ${angle.shapeEn}. Open with a hook that fits this article type (a real scenario, a popular claim, or a striking question) — never a generic definition.`;

  const prompt = `You are an elite fitness/nutrition copywriter. Write the FULL article.
${LANG_RULE[lang]}

TITLE: ${outline.title}
SUBTITLE: ${outline.subtitle}
MAIN KEYWORDS TO COVER NATURALLY: ${research.keywords.slice(0, 6).map((k) => k.keyword).join("; ")}
LSI KEYWORDS: ${outline.lsiKeywords.join("; ")}

LONG-TAIL RULE: the keywords above are LONG-TAIL search phrases — include
them VERBATIM (or near-verbatim) inside H2 headings and paragraph text where
it reads naturally. These exact phrasings are what the article must rank for.

${angleLine}

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
    tag: `blog:content-${lang}`,
    temperature: 0.7,
    // GROQ FREE FIT (2026-08-27, hard data from dispatch logs): Groq enforces
    // an 8000 TPM ceiling and COUNTS max_tokens in it — a 16000-cap request
    // returns 413 'Requested 16664' every time. A 1500-2500 word article is
    // only ~3000 output tokens, so 6400 keeps us under the ceiling while
    // leaving headroom. Nightly upstream outages (entire Google gemma pool
    // 429 for hours) leave nemotron as sole carrier some windows — give it
    // a REAL long window: eff min(150s, 360s/2=180s) = 150s ×2 models.
    maxTokens: 6_400,
    jsonMode: false, // tolerant extraction instead of strict-mode hard fails
    timeoutMs: 150_000,
    maxModels: 2,
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

  // PHASE 62 VARIETY — CTA ROTATION: the identical closing paragraph on
  // every article was one of the strongest "same article reworded"
  // signals. Each run draws one of five closing CTA directives.
  const CTA_VARIANTS: Record<"en" | "ar", string[]> = {
    en: [
      "Append a closing Call-to-Action paragraph inviting the reader to explore Musclehubeg's personalized online coaching with coach Ahmed Zake.",
      "Append a closing Call-to-Action paragraph inviting the reader to try Musclehubeg's free tools (calorie calculator, meal planner) before considering coaching.",
      "Append a closing Call-to-Action paragraph inviting the reader to join the Musclehubeg coaching program and get a plan built around their goal, schedule, and food preferences.",
      "Append a closing Call-to-Action paragraph inviting the reader to follow Musclehubeg for weekly evidence-based fitness & nutrition guides.",
      "Append a closing Call-to-Action paragraph inviting the reader to take the next step with Musclehubeg — whether reading a related guide or starting a tailored plan.",
    ],
    ar: [
      "أضف فقرة ختامية تدعو القارئ لتجربة الكوتشينج أونلاين المخصص من Musclehubeg مع الكابتن أحمد زكي.",
      "أضف فقرة ختامية تدعو القارئ لتجربة الأدوات المجانية على Musclehubeg (حاسبة السعرات، مخطط الوجبات) قبل التفكير في الكوتشينج.",
      "أضف فقرة ختامية تدعو القارئ للانضمام لبرنامج الكوتشينج في Musclehubeg للحصول على خطة مبنية على هدفه وجدوله وأكله المفضل.",
      "أضف فقرة ختامية تدعو القارئ لمتابعة Musclehubeg لكل أسبوع أدلة جديدة في اللياقة والتغذية مبنية على العلم.",
      "أضف فقرة ختامية تدعو القارئ لاتخاذ الخطوة التالية مع Musclehubeg — إما قراءة دليل ذي صلة أو بدء خطة مخصصة له.",
    ],
  };
  const ctaInstruction =
    CTA_VARIANTS[lang][Math.floor(Math.random() * CTA_VARIANTS[lang].length)];

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
5. FREE-TOOL LINKS (owner directive 2026-09-01): wherever the text naturally mentions calories, macros/protein targets, body fat, BMI, water intake, or meal plans, link that phrase to the matching FREE tool in [anchor](url) format — ONLY these URLs, max 3 total, each used at most once:
   - calories → [anchor](/tools/calorie-calculator)
   - macros/protein needs → [anchor](/tools/macro-calculator)
   - body fat → [anchor](/tools/body-fat-calculator)
   - BMI → [anchor](/tools/bmi-calculator)
   - water intake/hydration → [anchor](/tools/water-tracker)
   - meal plan/meal prep → [anchor](/meal-planner)
6. Add at most 2 external links ONLY to well-known authoritative domains you are certain exist (who.int, ncbi.nlm.nih.gov, cdc.gov, mayoclinic.org) in [anchor](https://...) format.
7. ${ctaInstruction}
8. Keep all "## " section structure; output the COMPLETE final article.

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
    tag: `blog:review-${lang}`,
    temperature: 0.4,
    // Review embeds the FULL draft → big payload runs openrouter-only via
    // the chain guard. DEEP LADDER FIX (2026-08-27 AR dispatch forensics):
    // with maxModels=2 the review died when BOTH leading models hiccuped
    // (ultra 150s abort + gemma upstream 429 shared pool) WITHOUT reaching
    // lightning/super which were healthy. maxModels=5 walks the full
    // openrouter ladder — the chain self-clamps eff windows so Vercel stays
    // Hobby-safe (52s) while native GHA (360s budget) gets real depth.
    maxTokens: 6_400,
    jsonMode: false,
    timeoutMs: 110_000,
    maxModels: 5,
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
