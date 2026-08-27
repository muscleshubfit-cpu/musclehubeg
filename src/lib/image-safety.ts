/**
 * IMAGE SAFETY POLICY — PEOPLE-FREE AI IMAGERY
 * ─────────────────────────────────────────────────────────────
 * OWNER HARD RULE (2026-08-27, live incident on two published posts):
 * AI-generated blog images MUST NEVER contain people or body imagery,
 * and prompts must NEVER include negations or NSFW vocabulary.
 *
 * WHY THE OLD GUARD FAILED (forensics from production URLs):
 * The retired IMAGE_MODESTY_SUFFIX injected phrases like
 *   "no nudity", "no cleavage", "no women in revealing outfits"
 * Diffusion models (flux/turbo/SD families) DO NOT parse negation —
 * those tokens act as POSITIVE ATTRACTORS ("nudity", "cleavage",
 * "women" are exactly what the model then renders). The old guard was
 * the direct cause of the incident.
 *
 * NEW LAW (structural, not advisory):
 *   1. ZERO human subjects in AI-generated images — objects & scenes
 *      only (equipment, food, interiors, flat vector graphics).
 *   2. Prompt vocabulary is sanitized against BOTH person-tokens AND
 *      NSFW tokens before any provider sees it.
 *   3. Negation constructions are stripped (they never help, sometimes
 *      they poison).
 *   4. Non-Latin subjects are rewritten to English object scenes
 *      (flux relevance collapses on Arabic text).
 *   5. Featured cover (#1 image) is anchored to the article's focus
 *      keyword/title so og:image is always on-topic.
 *
 * This module is the SINGLE choke point: every image prompt anywhere in
 * the platform goes through buildSafeImagePrompt() / sanitizeImageSubject().
 */

/** Banned person-subject tokens (Latin) — removed, never "negated". */
const PERSON_TOKENS_LATIN =
  /\b(man|men|woman|women|girl|girls|boy|boys|lady|ladies|female|males?|person|people|peoples|human|humans|mankind|athlete|athletes|bodybuilder|bodybuilders|model|models|trainer|trainers|trainee|trainees|figure|figures|portrait|portraits|face|faces|headshot|child|children|kid|kids|baby|babies|guy|guys|dude|hombre)\b/gi;

/** NSFW vocabulary — removed even when the caller meant to negate it. */
const NSFW_TOKENS_LATIN =
  /\b(nude|nudes|nudity|naked|topless|toplesss?|bra(?:s)?\b|lingerie|bikini|bikinis|cleavage|underwear|panties|sexy|sexiest|sexual(ly)?|erotic(a)?|porn\w*|nsfw|exposed|bare|barely|immodest|revealing|suggestive|midriff|thong|scantily)\b/gi;

/** Latin negation constructions — stripped entirely (they poison flux). */
const NEGATION_LATIN = [
  /\bno\s+[a-z][a-z\-]*(?:\s+[a-z][a-z\-]*){0,3}/gi, // "no nudity", "no text overlay", ...
  /\bwithout\s+(?:[a-z][a-z\-]*\s+){0,3}[a-z][a-z\-]*/gi,
  /\bnot\s+(?:[a-z][a-z\-]*\s+){0,2}[a-z][a-z\-]*/gi,
  /\bdon'?t\s+(?:show|include|contain)[^,.]*/gi,
];

/** Clothing/outfit wording ⇒ implies a human subject → removed and
 *  forces an object-scene rewrite (attire has no meaning without people). */
const CLOTHING_TOKENS_LATIN =
  /\b(attire|outfit\w*|clothing|garment\w*|dresses?|skirts?|shorts?|tank ?tops?|leggings?|tights?|sportswear|activewear|apparel|clothed|unclothed|modest(ly)?)\b/gi;

/** Arabic person-subject words (any attached prefixes/suffixes removed). */
const AR_PERSON_RE =
  /\S*(?:الرجل|الرجال|المراة|امراة|امراه|المرأه|نساء|النساء|فتاة|فتاه|فتيات|بنت|بنات|طفل|اطفال|اشخاص|الأشخاص|الاشخاص|شخص|جسد|جسم|اجساد|أجساد|عارضة|عارضه|عارض|متدربة|متدرب|مدربة|مدرب|وجه|وجوه)\S*/g;

/** Arabic NSFW + immodesty words. */
const AR_NSFW_RE =
  /\S*(?:عارية|عاري|عاره|عري|إثارة|اثارة|مثيره?|مكشوف|مكشوفة|فضفاض|خليع)\S*/g;

/** Arabic negation constructions. */
const AR_NEGATION_RE =
  /\s*(?:بدون|من دون|بلا|لا يحتوي على|لا يوجد)\s+\S+/g;

function stripArabicNegationAndBanned(s: string): string {
  let out = s;
  for (let pass = 0; pass < 3; pass++) {
    out = out.replace(AR_NEGATION_RE, " ");
    out = out.replace(AR_NSFW_RE, " ");
    out = out.replace(AR_PERSON_RE, " ");
  }
  return out;
}

export type SanitizeResult = {
  /** Sanitized subject text (may be empty if nothing usable remained). */
  clean: string;
  /** true when banned/negated/non-Latin content forced removal/rewrite. */
  changed: boolean;
  /** true when at least one PERSON-subject token was removed — such
   *  prompts describe a PEOPLE SCENE and must be fully rewritten as an
   *  object scene (see buildSafeImagePrompt). */
  personRemoved: boolean;
  /** latin-character ratio of the cleaned string (after sanitizing). */
  latinRatio: number;
};

/**
 * Decode URI components defensively, strip negations + banned vocab +
 * ALL person references. Returns a people-free, negation-free subject.
 */
export function sanitizeImageSubject(raw: string): SanitizeResult {
  let s = raw ?? "";
  let decoded = s;
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  const original = decoded;

  // Person/CLOTHING-token presence BEFORE removal decides rewrite policy.
  const hadPerson =
    new RegExp(PERSON_TOKENS_LATIN.source, "i").test(decoded) ||
    new RegExp(CLOTHING_TOKENS_LATIN.source, "i").test(decoded) ||
    AR_PERSON_RE_NOG.test(decoded);

  // Strip negations FIRST so "no nudity" can't survive as vocabulary.
  for (const re of NEGATION_LATIN) decoded = decoded.replace(re, " ");
  decoded = stripArabicNegationAndBanned(decoded);

  // Remove banned vocab + all human/clothing references (multiple passes).
  for (let pass = 0; pass < 3; pass++) {
    decoded = decoded.replace(PERSON_TOKENS_LATIN, " ");
    decoded = decoded.replace(CLOTHING_TOKENS_LATIN, " ");
    decoded = decoded.replace(NSFW_TOKENS_LATIN, " ");
  }

  decoded = decoded
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/(,\s*){2,}/g, ", ")
    .replace(/^[\s,:\-–]+|[\s,:\-–]+$/g, "");

  const letters = decoded.match(/[A-Za-z]/g)?.length ?? 0;
  const latinRatio = letters / Math.max(1, letters + (decoded.match(/[^\x00-\x7F]/g)?.length ?? 0));

  return { clean: decoded, changed: decoded !== original.trim(), personRemoved: hadPerson, latinRatio };
}

/* ---------------------------------------------------------------------- */
/* Object-scene fallbacks — guaranteed-safe topical replacements           */
/* ---------------------------------------------------------------------- */

type HintRule = { match: RegExp; scene: string };

const OBJECT_SCENE_RULES: HintRule[] = [
  { match: /creatine|protein|whey|supplement|vitamin|mineral/i, scene: "supplement jars with shaker bottle arranged on gym bench close-up" },
  { match: /nutrition|diet|meal|calorie|food|eating|kitchen|macros/i, scene: "healthy meal prep bowls with vegetables and lean protein top view" },
  { match: /cardio|treadmill|fat burn|hiit|endurance|running machine/i, scene: "row of modern treadmills and elliptical machines in bright gym" },
  { match: /home workout|homeworkout|no equipment|bodyweight|دومستيك منزلي/i, scene: "compact home corner gym setup with yoga mat dumbbells resistance bands" },
  { match: /injury|recovery|stretch|mobility|foam roller|physical therapy/i, scene: "foam roller yoga mat and stretching strap laid out neatly" },
  { match: /yoga|pilates|flexibility/i, scene: "rolled yoga mats with blocks in calm minimal studio space" },
  { match: /muscle|hypertrophy|strength|powerlift|split|program|routine|training|workout|exercise|gym plan/i, scene: "dumbbell rack with kettlebell and barbell plates in modern dark-tone gym interior" },
  { match: /beginner|guide|tips|plan|schedule/i, scene: "fitness journal notebook beside dumbbell and water bottle on wooden bench" },
];

/** Style tails — POSITIVE phrasing only, never negative constructions. */
const STYLE_TAILS: Record<string, string> = {
  photo:
    ", professional product photography, soft studio lighting, high detail",
  infographic:
    ", clean flat vector infographic illustration style, minimal geometric shapes, soft colors, plain background",
  diagram:
    ", clear technical diagram illustration, minimal line art, white background",
};

function typeTail(type?: string): string {
  return STYLE_TAILS[type ?? "photo"] ?? STYLE_TAILS.photo;
}

export function deriveObjectScene(hint?: string): string {
  const hay = hint ?? "";
  for (const r of OBJECT_SCENE_RULES) if (r.match.test(hay)) return r.scene;
  return "modern fitness studio interior with equipment rack and natural light";
}

/**
 * FULL pipeline used everywhere an image prompt is constructed.
 *
 * Returns a people-free, negation-free, English-text prompt with a
 * positive-only style tail. If the sanitized subject is empty, mostly
 * non-Latin (flux degrades badly on Arabic), or still contained
 * person-scene meaning, it is REPLACED by a topical object scene derived
 * from the hint (article title/focus keyword).
 */
export function buildSafeImagePrompt(
  subjectRaw: string,
  type?: string,
  hint?: string,
): string {
  const { clean, personRemoved, latinRatio } = sanitizeImageSubject(subjectRaw);

  const unusable =
    !clean ||
    personRemoved || // described a people scene → replace entirely
    clean.replace(/[^A-Za-z]/g, "").length < 6 || // effectively no usable English
    latinRatio < 0.55;

  const finalSubject = unusable ? deriveObjectScene(hint ?? subjectRaw) : clean;

  return `${finalSubject}${typeTail(type)}`;
}

/** Defensive check for tests + remediation scanning.
 *  Uses fresh NON-global regexes (/g lastIndex state is mutable). */
export function promptHasBannedVocabulary(s: string): boolean {
  if (new RegExp(PERSON_TOKENS_LATIN.source, "i").test(s)) return true;
  if (new RegExp(NSFW_TOKENS_LATIN.source, "i").test(s)) return true;
  if (new RegExp(CLOTHING_TOKENS_LATIN.source, "i").test(s)) return true;
  if (/\bno\s+[a-z]/i.test(s)) return true; // any "no …" construction at all
  if (/\bwithout\b|\bnot\b/i.test(s)) return true;
  if (AR_NEGATION_RE_NOG.test(s)) return true;
  if (AR_NSFW_RE_NOG.test(s)) return true;
  return false;
}

/** Non-global mirrors for safe .test() usage anywhere. */
const AR_NEGATION_RE_NOG = new RegExp(AR_NEGATION_RE.source, "i");
const AR_NSFW_RE_NOG = new RegExp(AR_NSFW_RE.source, "i");
const AR_PERSON_RE_NOG = new RegExp(AR_PERSON_RE.source, "i");
