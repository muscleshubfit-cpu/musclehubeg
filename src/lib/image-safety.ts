/**
 * IMAGE SOURCE POLICY v3 — PEXELS-FIRST REAL PHOTOGRAPHY
 * ─────────────────────────────────────────────────────────────
 * OWNER DIRECTIVE (2026-08-28): «استبدل خطوه الصور تماما الى
 * PEXELS_API_KEY داخل GitHub Action ، الصور نستوردها ومع المتبع
 * تتحول الى حجم خفيف بنظام الموقع ، وغير نظام اختيار الصور بحيث
 * يكون فى اشخاص عادى لكن لا عرى»
 *
 * WHAT CHANGED vs v1/v2 (superseded):
 *   - Pollinations AI image GENERATION is RETIRED entirely. Every
 *     image is real stock photography imported from Pexels (primary),
 *     with Unsplash / Pixabay as failover sources.
 *   - NORMAL PEOPLE ARE ALLOWED in photos — fitness stock photography
 *     is exactly what the owner wants («اشخاص عادى»). The v1/v2
 *     people-free scene bank and semantic-attractor machinery are
 *     retired together with the AI generator.
 *   - NUDITY/immodesty is NOT allowed («لا عرى»): search queries AND
 *     result alt-texts are screened against NSFW vocabulary.
 *   - Negation constructions are stripped from queries (useless and
 *     harmful in keyword search).
 *   - Diversity comes from deterministic result-index rotation per
 *     (article, position) variationKey — same slot always renders the
 *     same photo, no two slots collide.
 *   - Lightweight delivery: Pexels `src.landscape` is a 1200×627
 *     auto=compress CDN URL; the site's next/image system then
 *     converts to WebP/responsive sizes at the edge.
 *
 * This module is the SINGLE choke point: every image search query and
 * every result alt-text anywhere in the platform passes through here.
 */

/** NSFW vocabulary — removed from queries, rejected in alt-texts. */
const NSFW_TOKENS_LATIN =
  /\b(nude|nudes|nudity|naked|topless|toplesss?|bra(?:s)?\b|lingerie|bikini|bikinis|cleavage|underwear|panties|sexy|sexiest|sexual(ly)?|erotic(a)?|porn\w*|nsfw|exposed|bare|barely|immodest|revealing|suggestive|midriff|thong|scantily)\b/gi;

/**
 * IMMODEST-SIGNAL vocabulary (v3.1, 2026-08-28 live catch): NOT pornographic,
 * but reliably predicts half-dressed body-shots on stock platforms
 * ("a man flexing his muscles" = shirtless back in practice). Stripped
 * from queries and rejected in result alt-texts. Deliberately NOT
 * including "muscular" or "tank top" — normal clothed athletes stay.
 */
const IMMODEST_TOKENS_LATIN =
  /\b(flexing|flexes|shirtless|topless|bodybuilder|bodybuilders|six.?pack|torso(?:es)?|abs\b|swimsuit|swimwear|stripp\w*|half.?naked|no shirt)\b/gi;

/** Arabic NSFW + immodesty words (prefix/suffix tolerant). */
const AR_NSFW_RE =
  /\S*(?:عارية|عاري|عاره|عري|إثارة|اثارة|مثيره?|مكشوف|مكشوفة|فضفاض|خليع)\S*/g;

/** Latin negation constructions — stripped (poison keyword search). */
const NEGATION_LATIN = [
  /\bno\s+[a-z][a-z\-]*(?:\s+[a-z][a-z\-]*){0,3}/gi, // "no nudity", ...
  /\bwithout\s+(?:[a-z][a-z\-]*\s+){0,3}[a-z][a-z\-]*/gi,
  /\bnot\s+(?:[a-z][a-z\-]*\s+){0,2}[a-z][a-z\-]*/gi,
  /\bdon'?t\s+(?:show|include|contain)[^,.]*/gi,
];

/** Arabic negation constructions. */
const AR_NEGATION_RE =
  /\s*(?:بدون|من دون|بلا|لا يحتوي على|لا يوجد)\s+\S+/g;

export type SanitizeQueryResult = {
  /** Sanitized search query (people words INTENTIONALLY preserved). */
  query: string;
  /** true when negation/NSFW content forced removal. */
  changed: boolean;
  /** true when at least one NSFW token was removed. */
  nsfwRemoved: boolean;
};

/**
 * Sanitize a stock-photo SEARCH QUERY: decode defensively, strip
 * negations + NSFW vocabulary (EN + AR), collapse whitespace. People
 * words survive untouched — normal people are allowed (v3 law).
 */
export function sanitizeImageQuery(raw: string): SanitizeQueryResult {
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
  const original = decoded.trim();

  for (const re of NEGATION_LATIN) decoded = decoded.replace(re, " ");
  decoded = decoded.replace(AR_NEGATION_RE, " ");

  let nsfwRemoved = false;
  for (let pass = 0; pass < 3; pass++) {
    const before = decoded;
    decoded = decoded.replace(NSFW_TOKENS_LATIN, " ");
    decoded = decoded.replace(AR_NSFW_RE, " ");
    decoded = decoded.replace(IMMODEST_TOKENS_LATIN, " ");
    if (decoded !== before) nsfwRemoved = true;
  }

  decoded = decoded
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/(,\s*){2,}/g, ", ")
    .replace(/^[\s,:\-–]+|[\s,:\-–]+$/g, "")
    // keyword search degrades on very long queries
    .slice(0, 120)
    .replace(/[\s,:\-–]+$/, "");

  return {
    query: decoded,
    changed: decoded !== original,
    nsfwRemoved,
  };
}

/** Defensive check (tests + result alt-text screening). Fresh NON-global
 *  regexes — /g lastIndex state is mutable. */
export function hasNsfwVocabulary(s: string): boolean {
  if (!s) return false;
  if (new RegExp(NSFW_TOKENS_LATIN.source, "i").test(s)) return true;
  if (new RegExp(AR_NSFW_RE.source, "i").test(s)) return true;
  return false;
}

/**
 * v3.1: true when an alt-text/query carries immodest-signal wording
 * (shirtless/flexing/bodybuilder/abs-shots…). Used ALONGSIDE
 * hasNsfwVocabulary for result screening — the practical no-vision
 * guard against half-dressed body photos on stock platforms.
 */
export function hasImmodestSignal(s: string): boolean {
  if (!s) return false;
  return new RegExp(IMMODEST_TOKENS_LATIN.source, "i").test(s);
}

/** Deterministic string hash (djb2) → non-negative int. */
export function hashKey(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * SCENE DIVERSITY → RESULT ROTATION (v3): pick a deterministic index
 * inside the search results for a given variationKey. Without a key the
 * first (most relevant) result is used. Keeps every (article, position)
 * slot stable while guaranteeing different slots differ.
 */
export function pickResultIndex(total: number, variationKey?: string): number {
  if (total <= 0) return 0;
  if (!variationKey) return 0;
  return hashKey(variationKey) % total;
}
