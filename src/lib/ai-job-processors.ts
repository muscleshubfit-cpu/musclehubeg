/**
 * AI Job Processors — the execution registry used by the native GitHub
 * Actions runner (scripts/ai-jobs-runner/process.mts).
 *
 * OWNER DIRECTIVE (2026-08-27): ALL batch AI runs here, never on Vercel.
 * EVO chat alone stays on Vercel streaming and does NOT appear here.
 *
 * Each processor receives the SANITIZED payload stored by the enqueue API
 * route (see src/lib/ai-jobs.ts sanitizeJobPayload) and returns a JSON
 * result that gets persisted into ai_jobs.result by the runner.
 */

import { callFreeAIFallbackChain, parseJSON } from "@/lib/ai-provider";
import {
  generateNutritionPlanAI,
  generateWorkoutPlanAI,
  regenerateMeal,
  substituteExercise,
} from "@/lib/plan-generator";
import type { ClientContext } from "@/lib/ai-local";
import { generateSocialPost } from "@/lib/social-posts";
import { pickSmartTopic } from "@/lib/blog-topics";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { VALID_CATEGORY_IDS } from "@/lib/blog";
import { articleSlugFromTitle } from "@/lib/ai-jobs-client";

/* Shared quality knobs for heavy jobs (GHA sets AI_CHAIN_TOTAL_BUDGET_MS
 * = 180000 — three tries × generous timeouts, strongest models first). */
const HEAVY = { timeoutMs: 70_000 as const, maxModels: 3 as const };
const LIGHT = { timeoutMs: 45_000 as const, maxModels: 2 as const };

function pickClientContext(raw: any): ClientContext {
  const cc = raw && typeof raw === "object" ? raw : {};
  return {
    name: typeof cc.name === "string" ? cc.name : "",
    nutrition: cc.nutrition || {},
    fitness: cc.fitness || {},
    recent_measurements: Array.isArray(cc.recent_measurements)
      ? cc.recent_measurements
      : [],
  };
}

/* ─────────────────────────── Article tools ─────────────────────────── */

export type ArticleToolKey =
  // New spec set (owner directive #3)
  | "paraphrase"
  | "summarize_bullets"
  | "proofread"
  | "seo_pack"
  | "subheadings"
  // Legacy editor tools kept working through the same queue
  | "seo_title"
  | "meta_desc"
  | "faq"
  | "cta"
  | "image_prompt"
  | "social_facebook"
  | "social_instagram"
  | "social_x"
  | "social_linkedin";

/** Map old editor button ids → the canonical job tools. */
export const ARTICLE_TOOL_ALIASES: Record<string, ArticleToolKey> = {
  improve: "paraphrase",
  enhance: "paraphrase",
  summary: "summarize_bullets",
};

export function resolveArticleTool(keyRaw: string): ArticleToolKey {
  const k = String(keyRaw || "").trim();
  if ((ARTICLE_TOOL_ALIASES as Record<string, string>)[k]) {
    return ARTICLE_TOOL_ALIASES[k];
  }
  return k as ArticleToolKey;
}

type ToolOutput = {
  /** Main deliverable shown to the editor. */
  text: string;
  /** Optional machine-readable extras (LSI list, bullets array …). */
  data?: Record<string, any>;
  /** Optional change-notes section rendered under the result. */
  notes?: string;
  /** Model id that served the tool (kept for provenance). */
  sourceLabel?: string;
};

const MARKER_MAIN = "===CORRECTED===";
const MARKER_NOTES = "===NOTES===";

/**
 * Split sentinel-formatted free-text into main + notes deterministically.
 * Free models are unreliable at escaping large Arabic inside JSON, so the
 * transform tools use explicit text markers instead.
 */
function splitSentinel(text: string): ToolOutput {
  const raw = text.trim();
  if (raw.includes(MARKER_NOTES)) {
    const [main, ...rest] = raw.split(MARKER_NOTES);
    return {
      text: main.replace(MARKER_MAIN, "").trim(),
      notes: rest.join(MARKER_NOTES).trim(),
    };
  }
  return { text: raw.replace(MARKER_MAIN, "").trim() };
}

async function runArticleTool(payload: any): Promise<ToolOutput> {
  const tool = resolveArticleTool(String(payload.tool || ""));
  const content = String(payload.content || "");
  const title = String(payload.title || "");
  const keyword = String(payload.keyword || "");
  const category = String(payload.category || "");
  const isAr = payload.language !== "en";

  const articleContext = `${isAr ? "عنوان المقال" : "Article title"}: ${title || "-"}
${isAr ? "التصنيف" : "Category"}: ${category || "-"}
${isAr ? "الكلمة المفتاحية" : "Focus keyword"}: ${keyword || "-"}

${isAr ? "محتوى المقال" : "Article body"}:
${content.slice(0, isAr ? 12_000 : 14_000)}`;

  const sys = isAr
    ? "أنت محرر لغوي وخبير SEO لموقع MuscleHubEG الرياضي. تلتزم حرفياً بتعليمات الإخراج."
    : "You are MuscleHubEG's senior editor & SEO specialist. Follow output instructions literally.";

  // Sentinel instructions reused by the three big-text transforms.
  const sentinelRule = isAr
    ? `أعد النتيجة بهذا الشكل الحرفي (لا JSON ولا أسوار):
${MARKER_MAIN}
النص النهائي المحسّن كاملاً بصيغة Markdown
${MARKER_NOTES}
- تغيير مهم 1
- تغيير مهم 2`
    : `Reply in EXACTLY this literal format (no JSON, no fences):
${MARKER_MAIN}
full final improved Markdown text
${MARKER_NOTES}
- important change 1
- important change 2`;

  let prompt = "";
  switch (tool) {
    case "paraphrase":
      prompt = isAr
        ? `أعد صياغة نص المقال ليكون أوضح وأكثر جاذبية مع تغيير هيكل الجمل مع الحفاظ الكامل على المعنى والمعلومات العلمية.\n\n${articleContext}\n\n${sentinelRule}`
        : `Paraphrase the article for clarity and engagement while restructuring sentences but preserving full meaning.\n\n${articleContext}\n\n${sentinelRule}`;
      break;

    case "proofread":
      prompt = isAr
        ? `دقّق نص المقال لغوياً: صحّح الأخطاء الإملائية والنحوية وعلامات الترقيم وحسّن الأسلوب حيث يلزم، دون تغيير المعنى أو حذف محتوى.\n\n${articleContext}\n\n${sentinelRule}`
        : `Proofread the article: fix spelling/grammar/punctuation and polish style without changing meaning or cutting content.\n\n${articleContext}\n\n${sentinelRule}`;
      break;

    case "subheadings":
      prompt = isAr
        ? `أعد تنظيم النص بإضافة عناوين فرعية (##) مناسبة كل مكان يزيد عن فقرتين، بدون حذف أي محتوى.\n\n${articleContext}\n\n${sentinelRule}`
        : `Reorganize the text by adding fitting (##) subheadings wherever more than two paragraphs go by; do not remove any content.\n\n${articleContext}\n\n${sentinelRule}`;
      break;

    case "summarize_bullets": {
      prompt = isAr
        ? `أنشئ ملخصاً للمقال في 50-100 كلمة ثم قائمة نقاط رئيسية (bullet points).\n\n${articleContext}\n\nأعد بهذا الشكل الحرفي:\n${MARKER_MAIN}\n**الملخص:**\nفقرة الملخص (50-100 كلمة)\n\n**النقاط الرئيسية:**\n- نقطة\n- نقطة\n${MARKER_NOTES}\n- ملاحظات إن وجدت`
        : `Summarize in 50-100 words plus a bullet list of key takeaways.\n\n${articleContext}\n\nReply exactly:\n${MARKER_MAIN}\n**Summary:**\n50-100 word paragraph\n\n**Key points:**\n- point\n${MARKER_NOTES}\n- notes`;
      break;
    }

    case "seo_pack":
    case "seo_title":
    case "meta_desc": {
      prompt = isAr
        ? `حلّل المقال وأخرج حزمة تحسين SEO كاملة:\n\n${articleContext}\n\nأعد JSON فقط بالشكل:\n{
 "meta_description": "وصف ميتا جذاب 120-155 حرفاً يتضمن الكلمة المفتاحية",
 "lsi_keywords": ["8-12 كلمة مفتاحية فرعية LSI"],
 "title_variants": ["3 عناوين بديلة أقل من 60 حرفاً تتضمن الكلمة المفتاحية"],
 "subheading_suggestions": ["2-4 اقتراحات عناوين فرعية محسّنة"],
 "notes": "شرح موجز لأهم التحسينات المقترحة"
}`
        : `Produce a complete SEO pack for this article.\n\n${articleContext}\n\nReturn ONLY JSON:\n{ "meta_description": "120-155 chars with focus keyword", "lsi_keywords": ["8-12 LSI keywords"], "title_variants": ["3 alternative titles <60 chars"], "subheading_suggestions": ["2-4 improved H2 ideas"], "notes": "brief rationale" }`;
      break;
    }

    case "faq":
      prompt = isAr
        ? `ولّد 3-5 أسئلة وأجوبة شائعة مرتبطة مباشرة بمحتوى المقال بالعربية الفصحى.\n\n${articleContext}\n\nأعد JSON فقط: { "faq": [ { "question": "..", "answer": ".." } ] }`
        : `Generate 3-5 FAQ Q&As tied directly to the article.\n\n${articleContext}\n\nReturn ONLY JSON: { "faq": [ { "question": "..", "answer": ".." } ] }`;
      break;

    case "cta":
      prompt = isAr
        ? `اكتب 3 دعوات لاتخاذ إجراء (CTA) مقنعة خاصة بـ MuscleHubEG بناءً على المقال.\n\n${articleContext}\n\nأعد شكلاً حرفياً:\n${MARKER_MAIN}\n1. ...\n2. ...\n3. ...\n${MARKER_NOTES}\n- ملاحظات`
        : `Write 3 persuasive CTAs for MuscleHubEG from this article.\n\n${articleContext}\n\nReply exactly:\n${MARKER_MAIN}\n1. ...\n2. ...\n3. ...\n${MARKER_NOTES}\n- notes`;
      break;

    case "image_prompt":
      prompt = `Write ONE detailed AI image-generation prompt in English for a professional cover image DIRECTLY representing THIS article's specific subject (never a generic gym scene):\nTitle: ${title || "Fitness"}\nCategory: ${category || "Fitness"}\nKeyword: ${keyword || content.slice(0, 120)}\nRequirements: cinematic, realistic lighting, no text/watermarks. Output ONLY the raw prompt string.`;
      break;

    default:
      throw new Error(`unknown article_tool: ${tool}`);
  }

  const needsJson =
    tool === "seo_pack" || tool === "seo_title" || tool === "meta_desc" || tool === "faq";
  // Social variants map to dedicated platform jobs instead.
  if (String(tool).startsWith("social_")) {
    throw new Error("social_* handled by social_post processor");
  }

  const { text, model } = await callFreeAIFallbackChain(
    prompt,
    {
      tag: `ai-job:${tool}`,
      systemPrompt: sys,
      temperature: tool === "proofread" ? 0.3 : 0.7,
      maxTokens:
        tool === "summarize_bullets" ? 1400 : tool === "seo_pack" ? 1600 : 4000,
      jsonMode: needsJson,
      ...(needsJson ? HEAVY : LIGHT),
    },
  );

  if (needsJson) {
    const parsed = parseJSON<any>(text);
    if (!parsed) throw new Error("فشل تحليل نتيجة الأداة (JSON غير صالح).");
    if (tool === "faq") {
      const faq = Array.isArray(parsed.faq) ? parsed.faq.slice(0, 6) : [];
      if (faq.length === 0) throw new Error("لم يتم توليد أسئلة صالحة.");
      return {
        text: faq.map((q: any) => `**${q.question}**\n${q.answer}`).join("\n\n"),
        data: { faq },
        sourceLabel: model,
      };
    }
    if (tool === "seo_title") {
      const t = String(parsed.title_variants?.[0] ?? parsed.meta_description ?? "").slice(0, 200);
      if (!t) throw new Error("لم يتم توليد عنوان صالح.");
      return { text: t, data: parsed, sourceLabel: model };
    }
    if (tool === "meta_desc") {
      const d = String(parsed.meta_description ?? "").replace(/^["'«»]+|["'«»]+$/g, "").slice(0, 300);
      if (!d) throw new Error("لم يتم توليد وصف صالح.");
      return { text: d, data: parsed, sourceLabel: model };
    }
    // seo_pack
    const meta = String(parsed.meta_description ?? "").slice(0, 300);
    if (!meta) throw new Error("لم يتم توليد حزمة SEO.");
    const pretty = [
      `**Meta Description:** ${meta}`,
      ``,
      `**LSI Keywords:** ${(Array.isArray(parsed.lsi_keywords) ? parsed.lsi_keywords : []).join(" • ")}`,
      ``,
      `**${isAr ? "عناوين بديلة" : "Title variants"}:**`,
      ...(Array.isArray(parsed.title_variants) ? parsed.title_variants : []).map((t: string) => `- ${t}`),
      ``,
      `**${isAr ? "اقتراحات عناوين فرعية" : "Subheading suggestions"}:**`,
      ...(Array.isArray(parsed.subheading_suggestions) ? parsed.subheading_suggestions : []).map((t: string) => `- ${t}`),
    ].join("\n");
    return {
      text: pretty,
      data: parsed,
      notes: String(parsed.notes || ""),
      sourceLabel: model,
    };
  }

  const out = splitSentinel(text);
  if (!out.text) throw new Error("نتيجة فارغة من النموذج.");
  return { ...out, sourceLabel: model };
}

/* ─────────────────────────── Social post ─────────────────────────── */

async function runSocialPost(payload: any) {
  const platform = String(payload.platform || "facebook") as any;
  const tone = String(payload.tone || "motivational") as any;
  return generateSocialPost({
    platform,
    tone,
    language: payload.language === "en" ? "en" : "ar",
    topic: payload.topic,
    content: payload.content,
    title: payload.title,
    articleUrl: payload.articleUrl,
  });
}

/* ─────────────────────────── Plans ─────────────────────────── */

async function runPlanNutrition(payload: any) {
  const ctx = pickClientContext(payload.clientContext);
  const overrides = payload.overrides || {};
  const res = await generateNutritionPlanAI(ctx, {
    targetCalories: overrides.targetCalories,
    macros: overrides.macros,
    foods: overrides.foods,
    mealsCount: overrides.mealsCount,
    notes: overrides.notes,
  });
  return {
    title: res.title,
    plan_type: "nutrition",
    content: res.content, // includes meals[].meal_alternatives (≤2 per meal)
    source: res.source,
  };
}

async function runPlanWorkout(payload: any) {
  const ctx = pickClientContext(payload.clientContext);
  const overrides = payload.overrides || {};
  const res = await generateWorkoutPlanAI(ctx, {
    mealsCount: overrides.mealsCount, // legacy reuse → daysPerWeek
    foods: overrides.foods,
    notes: overrides.notes
      ? `${overrides.notes}${payload.durationWeeks ? ` — مدة البرنامج المستهدفة: ${payload.durationWeeks} أسابيع` : ""}`
      : undefined,
  });
  return {
    title: res.title,
    plan_type: "workout",
    content: res.content,
    source: res.source,
  };
}

async function runMealRegenerate(payload: any) {
  const ctx = payload.clientContext ? pickClientContext(payload.clientContext) : undefined;
  const out = await regenerateMeal(
    payload.meal || {},
    payload.targetCalories,
    ctx,
    payload.reason,
  );
  return {
    replacement: out.meal,
    suggestions: out.suggestions,
    source: out.source,
  };
}

async function runExerciseRegenerate(payload: any) {
  const out = await substituteExercise({
    exercise: payload.exercise || {},
    reason: payload.reason,
    location: payload.location,
    clientContext: payload.clientContext ? pickClientContext(payload.clientContext) : undefined,
  });
  return out; // { replacement(+exerciseSlug/image), alternatives[3], libraryMatched, source }
}

/* ─────────────────── Article generation (coach) ─────────────────── */

/**
 * DRAFT MATERIALIZATION LAW (2026-08-28d): a completed article_generate
 * result MUST exist as a blog_posts DRAFT row — never only inside
 * ai_jobs.result. Owner watched two SUCCESSFUL generations and still
 * reported «لم تولد المقال»: the finished article lived solely in the job
 * result, visible only if the live browser watcher caught the done event
 * (mobile tabs die, coaches navigate away). Materializing server-side
 * makes the draft appear in the articles list NO MATTER what the browser
 * does. Drafts stay is_published=false — the coach still reviews before
 * publishing (AI PROVENANCE preserved via source + the review flow).
 */
async function materializeArticleDraft(r: {
  title: string;
  markdown: string;
  excerpt: string;
  meta_description: string;
  tags: string[];
  language: "ar" | "en";
  category?: string;
  focus_keyword?: string;
}): Promise<string | null> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return null;
  const now = new Date().toISOString();
  const words = r.markdown.split(/\s+/).filter(Boolean).length;
  const row: Record<string, any> = {
    language: r.language,
    title: r.title,
    slug: articleSlugFromTitle(r.title),
    excerpt: r.excerpt,
    content: r.markdown,
    meta_title: r.title,
    meta_description: r.meta_description,
    focus_keyword: r.focus_keyword || r.tags[0] || "",
    keywords: r.tags.slice(0, 8),
    category:
      r.category && VALID_CATEGORY_IDS.has(r.category) ? r.category : "nutrition",
    tags: r.tags,
    featured_image: "", // safe image pipeline can backfill later
    cover_alt: "",
    reading_time: Math.max(1, Math.round(words / 200)),
    author: "MuscleHubEG",
    is_published: false, // NEVER auto-publish — coach reviews first
    published_at: null,
    created_at: now,
    updated_at: now,
    faq_json: [],
    schema_json: {},
    source: "ai:article_generate",
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await (supabaseAdmin as any)
      .from("blog_posts")
      .insert([row])
      .select("id")
      .single();
    if (!error) return (data as any)?.id ?? null;
    const msg = String(error?.message || "");
    if (/duplicate|unique|conflict/i.test(msg)) {
      // Same-title slug collision (rare) — suffix and retry.
      row.slug = `${row.slug}-${Date.now().toString(36)}`.slice(0, 90);
      continue;
    }
    if ("source" in row) {
      delete row.source; // legacy schema without the source column
      continue;
    }
    console.error("[article_generate] draft materialization failed:", msg);
    return null;
  }
  return null;
}

/**
 * Full-article GENERATION from a topic — the queue-era replacement for the
 * Phase-15-deleted client-side generator (owner report 2026-08-28: coaches
 * had no generation entry at all, only a banner pointing at a dead button).
 *
 * TOPIC-AUTO (2026-08-28b): an empty/short topic is valid — pickSmartTopic()
 * (the automated blog pipeline's topic brain) chooses a fresh, non-duplicate
 * title in the requested language, so the generation system picks its own
 * subject when the coach doesn't supply one.
 *
 * Output contract with BlogEditorView prefill (sessionStorage hand-off):
 * { title, markdown, excerpt, meta_description, tags[], language, source }
 * + topic diagnostics: { topic, autoTopic, focus_keyword, topic_rationale, category }
 */
async function runArticleGenerate(payload: any) {
  let topic = String(payload.topic || "").trim();
  const isAr = payload.language !== "en";
  const tone = String(payload.tone || "").trim();
  const audience = String(payload.audience || "").trim();
  let category = String(payload.category || "").trim();
  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords.map((k: any) => String(k).trim()).filter(Boolean).slice(0, 8)
    : [];

  // TOPIC-AUTO (2026-08-28b): when the coach leaves the topic empty, the
  // SAME smart topic system that powers the automated blog pipeline
  // (pickSmartTopic — AI pick with curated per-language fallbacks, rotation
  // across content pillars, duplicate-check against published posts) picks
  // the article's title. Owner directive: «مفروض يختار العنوان بنفس نظام
  // التوليد».
  let autoTopic = false;
  let topicRationale = "";
  let focusKeyword = "";
  if (topic.length < 5) {
    const pick = await pickSmartTopic(category || undefined, isAr ? "ar" : "en");
    if (!pick?.topic) {
      throw new Error("article_generate: empty topic and smart topic pick failed");
    }
    topic = pick.topic;
    focusKeyword = pick.focusKeyword || "";
    topicRationale = pick.rationale || "";
    if (!category && pick.category) category = pick.category;
    autoTopic = true;
    console.log(`[article_generate] auto-picked topic: "${topic}" (pillar: ${pick.category})`);
  }

  const sys = isAr
    ? "أنت كاتب محتوى رياضي خبير لموقع MuscleHubEG (مدونة لياقة وتغذية مصرية). تكتب بالعربية الفصحى المبسّطة بنبرة تحفيزية عملية، وتلتزم حرفياً بتعليمات الإخراج JSON."
    : "You are MuscleHubEG's senior fitness & nutrition content writer (Egyptian fitness blog). Write in clear, practical English and follow the JSON output contract literally.";

  const lines = [
    isAr
      ? `اكتب مقالاً كاملاً جاهزاً للنشر عن: «${topic}»`
      : `Write a complete, publication-ready article about: "${topic}"`,
    tone && (isAr ? `النبرة: ${tone}.` : `Tone: ${tone}.`),
    audience && (isAr ? `الجمهور المستهدف: ${audience}.` : `Target audience: ${audience}.`),
    category && (isAr ? `التصنيف: ${category}.` : `Category: ${category}.`),
    keywords.length &&
      (isAr
        ? `الكلمات المفتاحية التي يجب أن تظهر طبيعياً: ${keywords.join("، ")}.`
        : `Focus keywords to weave in naturally: ${keywords.join(", ")}.`),
    isAr
      ? "المتطلبات: 800-1200 كلمة، مقدمة جذابة، عناوين فرعية ## منظمة (5-8 أقسام)، نقاط وقوائم عند الحاجة، نصائح عملية قابلة للتطبيق، خاتمة بدعوة لاتخاذ إجراء. بدون جداول HTML وبدون صور وبدون صيغة LaTeX."
      : "Requirements: 800-1200 words, engaging intro, 5-8 organized ## subheadings, bullets where useful, actionable advice, conclusion with a call-to-action. No HTML tables, no images, no LaTeX.",
    isAr
      ? "أعد JSON فقط بالشكل الحرفي (بدون أسوار كود):"
      : "Return ONLY JSON in this exact shape (no code fences):",
    `{
 "title": "${isAr ? "عنوان جذاب أقل من 70 حرفاً" : "catchy title under 70 chars"}",
 "excerpt": "${isAr ? "ملخص تشويقي سطرين" : "two-line teaser"}",
 "meta_description": "${isAr ? "وصف ميتا 120-155 حرفاً" : "120-155 char meta description"}",
 "tags": ["${isAr ? "5-8 وسوم قصيرة" : "5-8 short tags"}"],
 "markdown": "${isAr ? "المقال كاملاً بصيغة Markdown تبدأ بعنوان ## أول قسم (بدون تكرار العنوان الرئيسي)" : "full article in Markdown starting with the first ## section (never repeat the main title)"}"
}`,
  ].filter(Boolean);

  const { text, model } = await callFreeAIFallbackChain(
    lines.join("\n\n"),
    {
      tag: "ai-job:article-generate",
      systemPrompt: sys,
      temperature: 0.7,
      // GROQ ELIGIBILITY LAW (2026-08-28c): the chain skips Groq when
      // prompt/4 + maxTokens + 800 > 7200 (Groq free TPM counts prompt +
      // max_tokens). 7000 reserved tokens LOCKED this job out of Groq →
      // OpenRouter-only → free-pool 429s + 60s aborts (observed: attempt 1
      // died, attempt 2 needed 138s). 5000 still covers the 800-1200-word
      // contract with a wide margin (~3600+ Arabic words) while the real
      // request stays under Groq's 8000 TPM → the fast reliable Groq path
      // is reachable again.
      maxTokens: 5000,
      jsonMode: true,
      ...HEAVY,
    },
  );

  const parsed = parseJSON<any>(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("فشل تحليل نتيجة التوليد (JSON غير صالح).");
  }
  const title = String(parsed.title || "").slice(0, 200).trim();
  const markdown = String(parsed.markdown || "").slice(0, 60_000).trim();
  if (!title || markdown.length < 200) {
    throw new Error("النموذج لم يُرجع مقالاً كاملاً — حاول مرة أخرى.");
  }
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 10)
    : [];

  // DRAFT MATERIALIZATION (2026-08-28d): persist the finished article as a
  // blog_posts DRAFT before reporting done — the draft exists in the
  // articles list even if every browser watcher missed the completion.
  const post_id = await materializeArticleDraft({
    title,
    markdown,
    excerpt: String(parsed.excerpt || "").slice(0, 400),
    meta_description: String(parsed.meta_description || "").slice(0, 300),
    tags,
    language: isAr ? "ar" : "en",
    category: category || undefined,
    focus_keyword: focusKeyword || undefined,
  });
  if (post_id) console.log(`[article_generate] draft materialized: blog_posts#${post_id}`);

  return {
    title,
    markdown,
    excerpt: String(parsed.excerpt || "").slice(0, 400),
    meta_description: String(parsed.meta_description || "").slice(0, 300),
    tags,
    language: isAr ? ("ar" as const) : ("en" as const),
    topic,
    autoTopic,
    focus_keyword: focusKeyword,
    topic_rationale: topicRationale,
    category: category || undefined,
    post_id,
    draft_saved: !!post_id,
    source: model,
  };
}

/* ─────────────────────────── Registry ─────────────────────────── */

export type ProcessorResult = Record<string, any>;

export const PROCESSORS: Record<
  string,
  (payload: any) => Promise<ProcessorResult>
> = {
  plan_nutrition: runPlanNutrition,
  plan_workout: runPlanWorkout,
  meal_regenerate: runMealRegenerate,
  exercise_regenerate: runExerciseRegenerate,
  article_tool: async (p: any) => {
    const out = await runArticleTool(p);
    const r: ProcessorResult = { text: out.text, tool: resolveArticleTool(String(p.tool)) };
    if (out.data) r.data = out.data;
    if (out.notes) r.notes = out.notes;
    if (out.sourceLabel) r.source = out.sourceLabel;
    return r;
  },
  article_generate: runArticleGenerate,
  social_post: runSocialPost,
};
