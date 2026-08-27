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

/**
 * SCENE DIVERSITY LAW (2026-08-28, owner: «كل الصور فى كل المقالات نفس
 * الصور»): a small set of curated scenes made every article render the
 * SAME composition. The bank below keeps the people-free guarantee but
 * gives EVERY theme 5 concrete variants, selected deterministically by
 * (article, image-position) so two posts never collide and one post's
 * body images differ from each other and from the cover.
 *
 * AUTHORING RULES for bank entries:
 *  - objects/interiors only, still-life verbs (arranged / resting /
 *    laid out / coiled / neatly placed) — no actions, no people words,
 *    no clothing words (they must pass BOTH safety gates verbatim);
 *  - English only (flux degrades on Arabic);
 *  - variant[0] of every theme is the pre-diversity classic scene so
 *    older regression tests and og:images stay stable.
 */
type SceneTheme = {
  match: RegExp;
  variants: string[];
};

const SCENE_BANK: SceneTheme[] = [
  {
    // planner theme sits ABOVE muscle: program articles get the notebook
    // family, not another equipment shot (highest person-attractor risk).
    match: /periodized|progressive overload|training split|push.?pull.?legs|upper.?lower|weekly schedule|workout plan|training plan|program design|beginner.*plan|plan.*beginner/i,
    variants: [
      "open fitness planner notebook with weekly schedule grid beside dumbbells and stopwatch on wooden desk",
      "fitness journal with printed calendar page and pen on clean white desk",
      "wall calendar with marked dates next to water bottle and whistle on shelf",
      "tablet showing a fitness spreadsheet beside small dumbbells on a bench",
      "clipboard with printed schedule, measuring tape and stopwatch flat lay",
    ],
  },
  {
    match: /creatine|protein|whey|supplement|vitamin|mineral/i,
    variants: [
      "supplement jars with shaker bottle arranged on gym bench close-up",
      "protein powder jar with scoop on marble kitchen counter top view",
      "rows of supplement containers on wooden shelf with soft lighting",
      "shaker bottle with creatine jar and measuring scoop on dark slate",
      "vitamin bottles and weekly pill organizer on bright shelf",
    ],
  },
  {
    match: /nutrition|diet|meal|calorie|food|eating|kitchen|macros/i,
    variants: [
      "healthy meal prep bowls with vegetables and lean protein top view",
      "grilled chicken rice and broccoli meal containers on marble counter",
      "colorful balanced meal boxes arranged on wooden table overhead view",
      "kitchen scale with fresh vegetables and a printed diet chart",
      "yogurt berries and nuts breakfast bowls on bright table",
    ],
  },
  {
    match: /cardio|treadmill|fat burn|hiit|endurance|running machine/i,
    variants: [
      "row of modern treadmills and elliptical machines in bright gym",
      "stationary bikes lined up in minimalist fitness studio",
      "treadmill console close-up with glowing heart rate display",
      "jump rope coiled on gym floor mat beside stopwatch and towel",
      "air bike and stair climber in industrial style gym interior",
    ],
  },
  {
    match: /home workout|homeworkout|no equipment|bodyweight|دومستيك منزلي/i,
    variants: [
      "compact home corner gym setup with yoga mat dumbbells resistance bands",
      "living room fitness corner with folded mat kettlebell and jump rope",
      "resistance bands and adjustable dumbbells arranged on apartment floor",
      "home gym rack with medicine ball and foam roller by the window",
      "yoga mat water bottle and small dumbbells on wooden living room floor",
    ],
  },
  {
    match: /injury|recovery|stretch|mobility|foam roller|physical therapy/i,
    variants: [
      "foam roller yoga mat and stretching strap laid out neatly",
      "massage gun and foam roller resting on bench in calm recovery room",
      "rolled towels and water bottle on physiotherapy table soft light",
      "resistance band door anchor and massage ball kit arranged on floor",
      "epsom salt jar and folded towel beside bathtub edge serene lighting",
    ],
  },
  {
    match: /yoga|pilates|flexibility/i,
    variants: [
      "rolled yoga mats with blocks in calm minimal studio space",
      "yoga mat with towel and water bottle in sunlit empty studio",
      "stack of colorful yoga blocks and straps on bamboo shelf",
      "meditation cushion and folded blanket in serene corner",
      "yoga wheel and mat standing against studio wall natural light",
    ],
  },
  {
    match: /muscle|hypertrophy|strength|powerlift|split|program|routine|training|workout|exercise|gym plan/i,
    variants: [
      "dumbbell rack with kettlebell and barbell plates in modern dark-tone gym interior",
      "loaded barbell resting on rubber gym floor with dramatic lighting",
      "chrome dumbbells arranged by weight on white studio background",
      "kettlebells lined up on rubber gym floor close up",
      "weight plates stacked beside leather belt on steel bench",
    ],
  },
  {
    match: /beginner|guide|tips|schedule/i,
    variants: [
      "fitness journal notebook beside dumbbell and water bottle on wooden bench",
      "open guide book with equipment illustrations on wooden desk",
      "gym tote bag with towel water bottle and notebook flat lay",
      "whiteboard with simple habit tracker checkmarks and marker",
      "sneakers and gym bag resting on locker room bench morning light",
    ],
  },
];

const DEFAULT_SCENE_VARIANTS = [
  "modern fitness studio interior with equipment rack and natural light",
  "empty gym room with mirrored wall and rubber flooring",
  "dark industrial gym interior with spotlights over equipment",
  "bright boutique fitness studio with plants and wooden accents",
  "gym locker row with open locker holding towel and bottle",
];

/** Deterministic string hash (djb2) → non-negative int. */
function hashKey(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Every curated scene, for safety-gate tests and documentation. */
export function listCuratedScenes(): string[] {
  return [...SCENE_BANK.flatMap((t) => t.variants), ...DEFAULT_SCENE_VARIANTS];
}

/**
 * Pick a people-free topical scene. With variationKey, selection rotates
 * deterministically across the theme's variants (SCENE DIVERSITY LAW);
 * without one, variant[0] (the pre-diversity classic) is returned.
 */
export function deriveObjectScene(hint?: string, variationKey?: string): string {
  const hay = hint ?? "";
  for (const t of SCENE_BANK) {
    if (t.match.test(hay)) {
      return variationKey
        ? t.variants[hashKey(variationKey) % t.variants.length]
        : t.variants[0];
    }
  }
  return variationKey
    ? DEFAULT_SCENE_VARIANTS[hashKey(variationKey) % DEFAULT_SCENE_VARIANTS.length]
    : DEFAULT_SCENE_VARIANTS[0];
}

/** Style tails — POSITIVE phrasing only, never negative constructions.
 *  The photo family rotates per (article, position) for visual diversity
 *  (SCENE DIVERSITY LAW); infographic/diagram stay structural/fixed. */
const PHOTO_STYLE_TAILS = [
  ", professional product photography, soft studio lighting, high detail",
  ", editorial photography, dramatic side lighting, shallow depth of field",
  ", top-down flat lay photography, crisp shadows, clean background",
  ", cinematic photography, moody low-key lighting, dark tones",
  ", bright airy photography, natural window light, minimal aesthetic",
];

const STYLE_TAILS: Record<string, string> = {
  infographic:
    ", clean flat vector infographic illustration style, minimal geometric shapes, soft colors, plain background",
  diagram:
    ", clear technical diagram illustration, minimal line art, white background",
};

function typeTail(type?: string, variationKey?: string): string {
  if (type === "infographic" || type === "diagram") return STYLE_TAILS[type];
  const key = variationKey ?? "default";
  return PHOTO_STYLE_TAILS[hashKey(key) % PHOTO_STYLE_TAILS.length];
}

/**
 * FULL pipeline used everywhere an image prompt is constructed.
 *
 * Returns a people-free, negation-free, English-text prompt with a
 * positive-only style tail. If the sanitized subject is empty, mostly
 * non-Latin (flux degrades badly on Arabic), or still contained
 * person-scene meaning, it is REPLACED by a topical object scene derived
 * from the hint (article title/focus keyword) — rotated by variationKey
 * (SCENE DIVERSITY LAW).
 */
export function buildSafeImagePrompt(
  subjectRaw: string,
  type?: string,
  hint?: string,
  variationKey?: string,
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
  const base = unusable
    ? deriveObjectScene(hint ?? subjectRaw, variationKey)
    : clean;
  const finalSubject = stripStyleTails(base);

  return `${finalSubject}${typeTail(type, variationKey)}`;
}

/** Remove any style-tail text already present in the subject (law v2 §7). */
function stripStyleTails(s: string): string {
  let out = s;
  const tails = [...Object.values(STYLE_TAILS), ...PHOTO_STYLE_TAILS];
  for (const tail of tails) {
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
