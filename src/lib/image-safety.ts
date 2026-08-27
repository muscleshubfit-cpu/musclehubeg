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
 * LAW v2 — SEMANTIC PERSON-SCENE ATTRACTORS (2026-08-28 live incident
 * #2 on /blog/12-week-periodized-muscle-building-plan): a prompt with
 * ZERO person tokens ("muscle building workout plan 12-Week Periodized
 * Muscle Building Plan for Intermediate Lifters") STILL rendered a
 * shirtless man. Proof: production URL seed=29197. Diffusion models
 * associate fitness ACTION nouns (workout, lifting, training, plan for
 * lifters…) with training BODIES in their latent space — token-level
 * sanitization cannot stop semantic attractors. Therefore:
 *   6. Any subject carrying person-scene SEMANTICS (action/program/
 *      physique vocabulary, EN + AR) is REPLACED ENTIRELY by a curated
 *      object scene — never partially trusted.
 *   7. Style tails are idempotent (a tail already present in the
 *      subject is stripped before a fresh one is appended — fixes the
 *      doubled "…high detail, …high detail" URLs seen in production).
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

/**
 * SEMANTIC ATTRACTOR VOCABULARY (law v2, 2026-08-28): these tokens don't
 * name people, but diffusion models render PEOPLE for them anyway —
 * fitness actions/programs/physique results are trained on bodies.
 * A surviving subject containing ANY of these is never trusted; it is
 * replaced by a curated object scene.
 * NOTE: deliberately NO bare "row/rows" (would match "row of treadmills");
 * "rowing" is listed instead. Matcher-only words ("cardio", "treadmill")
 * belong in OBJECT_SCENE_RULES, not here.
 */
const ACTION_SCENE_TOKENS_LATIN =
  /\b(workouts?|working out|work out|trainings?|training plan|train\b|lifters?|lifting|lift\b|lifts|exercis\w*|bodybuild\w*|weightlift\w*|powerlift\w*|crossfit|calisthenics|gym session|hiit|tabata|supersets?|dropsets?|push.?ups?|pull.?ups?|squats?|lunges?|planks?|deadlifts?|bench press|overhead press|shoulder press|leg press|curls?|presses|burpees?|mountain climbers|jumping jacks|sprints?|jogging|rowing|flexing|flex\b|physiques?|six.?pack|abs\b|biceps|triceps|deltoids|glutes|hamstrings|quadriceps|transformation|shredded|ripped|toned body|muscle building|muscle gain|mass gain|strength gain|muscle growth|build muscle|building muscle|fat burn|burn fat|burning fat|weight loss|lose weight|losing weight|gain muscle|gaining muscle|hypertrophy training)\b/i;

/** Arabic semantic attractors (actions/programs/physique). */
const AR_ACTION_SCENE_RE =
  /\S*(?:تمرين|تمارين|يتمرن|عضلات|بناء العضلات|تنشيف|حرق الدهون|خسارة الوزن|ضخ muscle|كتلة العضل|جسم رياضي|لياقة بدنية)\S*/g;

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
  // LAW v2: plan/program/split topics get the PLANNER scene — the single
  // highest-risk attractor class ("12-week periodized plan for lifters"
  // rendered a shirtless man). Must sit ABOVE the muscle rule (first
  // match wins) so program articles get the on-topic notebook scene.
  { match: /periodized|progressive overload|training split|push.?pull.?legs|upper.?lower|weekly schedule|workout plan|training plan|program design|beginner.*plan|plan.*beginner/i, scene: "open fitness planner notebook with weekly schedule grid beside dumbbells and stopwatch on wooden desk" },
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

  // LAW v2: a subject can be token-clean and STILL semantically describe
  // a people scene ("muscle building workout plan for lifters"). Such
  // prompts are replaced ENTIRELY by a curated object scene.
  const semanticPerson =
    new RegExp(ACTION_SCENE_TOKENS_LATIN.source, "i").test(clean) ||
    new RegExp(ACTION_SCENE_TOKENS_LATIN.source, "i").test(subjectRaw ?? "");

  const unusable =
    !clean ||
    personRemoved || // described a people scene → replace entirely
    semanticPerson || // action/program semantics attract bodies → replace
    clean.replace(/[^A-Za-z]/g, "").length < 6 || // effectively no usable English
    latinRatio < 0.55;

  // Tail idempotency (production showed "…high detail, …high detail"):
  // strip any style tail already baked into the base before appending.
  const base = unusable ? deriveObjectScene(hint ?? subjectRaw) : clean;
  const finalSubject = stripStyleTails(base);

  return `${finalSubject}${typeTail(type)}`;
}

/** Remove any STYLE_TAILS text already present in the subject (law v2 §7). */
function stripStyleTails(s: string): string {
  let out = s;
  for (const tail of Object.values(STYLE_TAILS)) {
    const escaped = tail.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), " ");
  }
  return out
    .replace(/\s+/g, " ")
    .replace(/(,\s*){2,}/g, ", ")
    .replace(/^[\s,:\-–]+|[\s,:\-–]+$/g, "");
}

/**
 * LAW v2 helper: true when the text carries person-scene SEMANTICS
 * (action/program/physique attractors). Used by buildSafeImagePrompt to
 * decide full-scene rewrite. NOT used by promptHasBannedVocabulary —
 * curated scenes themselves must never be refused at the URL gate.
 */
export function promptHasPersonSemantics(s: string): boolean {
  if (!s) return false;
  if (new RegExp(ACTION_SCENE_TOKENS_LATIN.source, "i").test(s)) return true;
  if (new RegExp(AR_ACTION_SCENE_RE.source, "i").test(s)) return true;
  return false;
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
