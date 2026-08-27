/**
 * Social Posts Generator — OWNER DIRECTIVE #4 (2026-08-27).
 *
 * Ready-to-publish marketing posts from an article/topic for
 * facebook | instagram | x | linkedin, in three internal stages fused
 * into ONE strong-model call (fast + no truncation risk between stages):
 *
 *   Stage 1  extract the 3–5 key points from the source material
 *   Stage 2  platform-specific drafting with exact length contracts:
 *              facebook  → 100–200 words + engagement question
 *              instagram → short caption + 8–12 hashtags
 *              x         → ≤280 characters + hashtags
 *              linkedin  → 200–300 words professional + practical tips
 *   Stage 3  polish: hook format (question / challenge / statistic),
 *            article link placement, final CTA line.
 *
 * Output is STRICT JSON so the UI can render copy-buttons per part.
 */

import { callFreeAIFallbackChain, parseJSON } from "@/lib/ai-provider";

export type SocialPlatform = "facebook" | "instagram" | "x" | "linkedin";
export type SocialTone = "professional" | "friendly" | "motivational";

export type SocialPostInput = {
  platform: SocialPlatform;
  tone: SocialTone;
  language: "ar" | "en";
  topic?: string; // standalone topic when there's no article text
  content?: string; // article body / excerpt
  title?: string;
  articleUrl?: string;
};

export type SocialPostResult = {
  key_points: string[];
  post_text: string;
  hashtags: string[];
  cta: string;
  image_idea?: string;
  best_times: string[];
  source: string;
};

const PLATFORM_CONTRACTS: Record<SocialPlatform, { ar: string; en: string }> = {
  facebook: {
    ar: 'فيسبوك: نص طويل نسبياً (100-200 كلمة) مع سؤال يدفع للتعليق والمشاركة.',
    en: "Facebook: relatively long post (100-200 words) ending with a comment/share-driving question.",
  },
  instagram: {
    ar: 'إنستغرام: كابشن قصير قوي مع إيموجي و8-12 هاشتاج مناسب للصورة.',
    en: "Instagram: short punchy caption with emojis and 8-12 hashtags suitable for an image.",
  },
  x: {
    ar: 'تويتر/X: نص مختصر جداً حتى 280 حرفاً فقط مع هاشتاجات — تحقق من العدد حرفياً.',
    en: "X/Twitter: max 280 characters INCLUDING hashtags — count literally.",
  },
  linkedin: {
    ar: 'لينكدإن: نص احترافي (200-300 كلمة) بنصائح عملية وأسلوب قيادة فكرية.',
    en: "LinkedIn: professional post (200-300 words) with practical tips and thought leadership.",
  },
};

const TONE_AR: Record<SocialTone, string> = {
  professional: "احترافية رسمية",
  friendly: "ودية قريبة",
  motivational: "تحفيزية مشوقة",
};

function buildPrompt(input: SocialPostInput): string {
  const isAr = input.language === "ar";
  const sourceTitle = input.title?.trim() || "";
  const sourceBody =
    input.content?.trim() ||
    input.topic?.trim() ||
    (isAr ? "مواضيع اللياقة والتغذية الصحية عموماً" : "general fitness & nutrition topics");
  const topicLine =
    !input.content && input.topic ? `\nالموضوع المطلوب: ${input.topic}\n` : "\n";

  const platformRules = PLATFORM_CONTRACTS[input.platform][isAr ? "ar" : "en"];
  const tone = isAr ? TONE_AR[input.tone] : input.tone;
  const linkNote = input.articleUrl
    ? isAr
      ? `رابط المقال الذي يجب إدراجه كما هو داخل المنشور أو في نهايته: ${input.articleUrl}`
      : `Article URL to include inside or at the end of the post: ${input.articleUrl}`
    : "";

  if (isAr) {
    return `أنت خبير تسويق محتوى لياقة لمنصة MuscleHubEG. أنشئ منشوراً جاهزاً للنشر.

مصدر المحتوى:
${sourceTitle ? `عنوان المقال: ${sourceTitle}\n` : ""}${topicLine}
نص/خلاصة المقال:
${sourceBody.slice(0, 8000)}
${linkNote}

مراحل العمل (نفّذها كلها داخلياً):
1) استخلص أهم 3-5 نقاط رئيسية.
2) اكتب المسودة حسب مواصفات المنصة: ${platformRules}
3) حسّن المنشور النهائي: افتتاحية جذابة (سؤال أو تحدٍّ أو إحصائية)، إدراج الرابط إن وجد، ودعوة واضحة لاتخاذ إجراء.

النبرة المطلوبة: ${tone}.

أعد JSON فقط بدون أسوار markdown بالشكل:
{
 "key_points": ["3 إلى 5 نقاط رئيسية مختصرة"],
 "post_text": "المنشور النهائي الجاهز للنسخ واللصق",
 "hashtags": ["#هاشتاج", "..."],
 "cta": "جملة الدعوة لاتخاذ إجراء",
 "image_idea": "وصف قصير لصورة مقترحة مرافقة للمنشور",
 "best_times": ["أفضل وقتين-ثلاثة للنشر على هذه المنصة بالتوقيت المصري"]
}`;
  }

  return `You are a fitness content marketing expert for MuscleHubEG. Create a ready-to-publish social media post.

Source material:
${sourceTitle ? `Article title: ${sourceTitle}\n` : ""}${topicLine}
Article body/summary:
${sourceBody.slice(0, 8000)}
${linkNote}

Internal stages (do all three):
1) Extract the top 3-5 key points.
2) Draft per platform spec: ${platformRules}
3) Polish final post: hook opener (question/challenge/statistic), include link if provided, clear CTA.

Required tone: ${tone}.

Return ONLY valid JSON (no markdown fences):
{
 "key_points": ["3 to 5 concise key points"],
 "post_text": "final ready-to-paste post text",
 "hashtags": ["#hashtag", "..."],
 "cta": "call-to-action sentence",
 "image_idea": "short description of a suggested companion image",
 "best_times": ["top 2-3 posting times for this platform in Cairo time"]
}`;
}

/** Deterministic best-times fallback when the model omits them. */
const DEFAULT_TIMES: Record<SocialPlatform, string[]> = {
  facebook: ["1:00 PM - 3:00 PM", "7:00 PM - 9:00 PM"],
  instagram: ["12:00 PM - 2:00 PM", "8:00 PM - 11:00 PM"],
  x: ["9:00 AM - 11:00 AM", "6:00 PM - 8:00 PM"],
  linkedin: ["8:00 AM - 10:00 AM", "5:00 PM - 6:00 PM"],
};

function normalizeHashtags(raw: any, platform: SocialPlatform): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out = list
    .map((h: any) => String(h || "").trim())
    .filter(Boolean)
    .map((h: string) => (/^#[\w\u0600-\u06FF]+$/.test(h) ? h : `#${h.replace(/^#+/, "").replace(/[^\w\u0600-\u06FF]/g, "_")}`))
    .filter((h: string) => h.length > 1);
  const cap = platform === "instagram" ? 12 : platform === "x" ? 3 : 5;
  return Array.from(new Set(out)).slice(0, cap);
}

export async function generateSocialPost(
  input: SocialPostInput,
): Promise<SocialPostResult> {
  const prompt = buildPrompt(input);

  const { text, model } = await callFreeAIFallbackChain(
    prompt,
    {
      systemPrompt:
        input.language === "ar"
          ? "أنت كاتب محتوى تسويقي خبير. تعيد JSON صالحاً فقط — بلا أي نص خارج الـJSON."
          : "You are an expert marketing copywriter. Return ONLY valid JSON.",
      temperature: 0.75,
      maxTokens: input.platform === "linkedin" ? 2600 : 2200,
      jsonMode: true,
      timeoutMs: 70_000,
      maxModels: 3,
    },
  );

  // parseJSON handles fences + repairTruncatedJSON already; still guard fields.
  const parsed = parseJSON<Partial<SocialPostResult>>(text);
  const rawText =
    parsed?.post_text?.toString().trim() ||
    (typeof parsed === "string" ? parsed : "") ||
    text.trim();

  // Hard platform contract on X length: trim silently if the model overshot.
  let postText = rawText;
  if (input.platform === "x") {
    const tags = normalizeHashtags(parsed?.hashtags, "x").join(" ");
    const budget = 280 - (tags ? tags.length + 1 : 0);
    if (postText.length > budget) {
      postText = postText.slice(0, budget - 1).replace(/\s+\S*$/, "") + "…";
    }
  }

  const keyPoints = Array.isArray(parsed?.key_points)
    ? parsed.key_points.map(String).slice(0, 5)
    : [];

  return {
    key_points: keyPoints,
    post_text: postText,
    hashtags: normalizeHashtags(parsed?.hashtags, input.platform),
    cta: String(parsed?.cta || "").slice(0, 300),
    image_idea: typeof parsed?.image_idea === "string" ? parsed.image_idea.slice(0, 300) : undefined,
    best_times:
      Array.isArray(parsed?.best_times) && parsed.best_times.length > 0
        ? parsed.best_times.map(String).slice(0, 4)
        : DEFAULT_TIMES[input.platform],
    source: `openrouter/groq:${model}`,
  };
}
