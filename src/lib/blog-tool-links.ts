/**
 * src/lib/blog-tool-links.ts — AUTOMATIC FREE-TOOL INTERNAL LINKING
 * (owner SEO directive, 2026-09-01).
 *
 * OWNER REQUEST: «يقوم السكريبت عند صياغة المقال بوضع روابط ذكية تحيل
 * القارئ إلى الأدوات المجانية المناسبة داخل موقعنا (مثل حاسبة السعرات،
 * الماكروز، مخطط الوجبات)».
 *
 * WHY DETERMINISTIC (not model-generated):
 *   The P4 review model already *may* add tool links, but free models
 *   comply inconsistently and occasionally invent URLs. This module is
 *   the GUARANTEE layer: pure regex + first-occurrence wrapping, no AI
 *   call, no network, idempotent (safe to run twice), language-aware
 *   (EN + AR trigger phrases) and spam-safe (max 3 links per article,
 *   one per tool, never inside an existing markdown link).
 *
 * TARGETS — every URL below is a real, indexable site route:
 *   /tools/calorie-calculator · /tools/macro-calculator ·
 *   /tools/body-fat-calculator · /tools/bmi-calculator ·
 *   /tools/water-tracker · /meal-planner · /programs · /exercises · /foods
 * (The tool pages render in Arabic for Arabic readers via the site's
 *  language detection — same URL space the AR homepage already uses.)
 */

export type ToolLinkRule = {
  /** Short id for logs / queue notes. */
  id: string;
  /** Site-internal destination (real route — verified against src/app). */
  url: string;
  /** EN trigger patterns (word-boundary safe). */
  patternsEn: RegExp[];
  /** AR trigger patterns (plain substring — \b is meaningless for Arabic). */
  patternsAr: RegExp[];
};

/** Ordered most-specific-first; hub pages (programs/exercises/foods) last. */
const TOOL_RULES: ToolLinkRule[] = [
  {
    id: "meal-planner",
    url: "/meal-planner",
    patternsEn: [/\bmeal plan(s|ning)?\b/i, /\bmeal prep\b/i, /\bmeal ideas?\b/i],
    patternsAr: [/خطة وجبات/, /خط[ةة] غذائي[ةة]?/, /خط[ةة] أكل/, /نظام غذائي/, /مخطط الوجبات/, /وجباتك/],
  },
  {
    id: "calorie-calculator",
    url: "/tools/calorie-calculator",
    patternsEn: [/\bcalorie(s)?\b/i, /\bcaloric (deficit|surplus|intake)\b/i, /\bkcal\b/i],
    patternsAr: [/سعرات/, /كالوري/, /سعر حراري/, /السعرات الحرارية/],
  },
  {
    id: "macro-calculator",
    url: "/tools/macro-calculator",
    patternsEn: [/\bmacros?\b/i, /\bmacronutrients?\b/i, /\bprotein intake\b/i],
    patternsAr: [/ماكروز/, /ماكرو/, /البروتين والكارب/, /بروتينك/, /احتياجك من البروتين/],
  },
  {
    id: "body-fat-calculator",
    url: "/tools/body-fat-calculator",
    patternsEn: [/\bbody fat\b/i, /\bbody-fat\b/i, /\bfat percentage\b/i],
    patternsAr: [/نسبة الدهون/, /دهون الجسم/, /الدهون تحت الجلد/, /قياس الدهون/],
  },
  {
    id: "bmi-calculator",
    url: "/tools/bmi-calculator",
    patternsEn: [/\bBMI\b/, /\bbody mass index\b/i],
    patternsAr: [/كتلة الجسم/, /مؤشر كتلة/, /بي إم آي/],
  },
  {
    id: "water-tracker",
    url: "/tools/water-tracker",
    patternsEn: [/\bwater intake\b/i, /\bhydration\b/i, /\bdrink(ing)? water\b/i, /\bdaily water\b/i],
    patternsAr: [/شرب الماء/, /الترطيب/, /ترطيب الجسم/, /كوب ماء/, /لتر من الماء/],
  },
  {
    id: "programs-hub",
    url: "/programs",
    patternsEn: [/\bworkout program\b/i, /\btraining program\b/i, /\btraining split\b/i, /\bworkout plan\b/i],
    patternsAr: [/برنامج تدريبي/, /برامج تدريب/, /الجدول التدريبي/, /برنامج تمارين/],
  },
  {
    id: "exercises-hub",
    url: "/exercises",
    patternsEn: [/\bexercises?\b/i],
    patternsAr: [/التمارين/, /التمرين/, /تمارين/],
  },
  {
    id: "foods-hub",
    url: "/foods",
    patternsEn: [/\bfood database\b/i, /\bhigh[- ]protein foods?\b/i, /\bnutrition facts\b/i],
    patternsAr: [/قاعدة بيانات الأكلات/, /الأكلات/, /الأطعمة/],
  },
];

/** Hard anti-spam cap: at most 3 tool links per article. */
const MAX_LINKS = 3;

export type InsertedToolLink = { tool: string; url: string; anchor: string };

/**
 * Markdown-link architecture guard: split a line on EXISTING markdown
 * links/images and only allow insertion inside the plain-text fragments.
 * `![alt](url)` images and `[anchor](url)` links are captured and skipped.
 */
const MD_LINK_SPLIT = /(!?\[[^\]]*\]\([^)]*\))/g;

/** Lines that must never receive inline links. */
const SKIP_LINE = /^(#{1,6}\s|>|\||\s*[-*_]{3,}\s*$|!\[)/;

/**
 * Wrap the FIRST plain-text occurrence of each tool's trigger phrase with
 * a markdown link to that tool — deterministic, idempotent, capped.
 *
 * @param md        Article markdown (EN or AR).
 * @param lang      Which trigger dictionary to use.
 * @returns         The (possibly) updated markdown + what was inserted,
 *                  so callers can log/annotate the queue row.
 */
export function insertToolLinks(
  md: string,
  lang: "en" | "ar",
): { md: string; inserted: InsertedToolLink[] } {
  if (!md || md.length < 40) return { md, inserted: [] };

  let result = md;
  const inserted: InsertedToolLink[] = [];

  for (const rule of TOOL_RULES) {
    if (inserted.length >= MAX_LINKS) break;

    // IDEMPOTENCE: this tool is already linked somewhere in the article
    // (model-added in P4, or a previous run of this function) → skip.
    if (result.includes(`](${rule.url})`)) continue;

    const patterns = lang === "ar" ? rule.patternsAr : rule.patternsEn;
    const wrapped = tryWrapFirstOccurrence(result, patterns, rule.url);
    if (wrapped) {
      result = wrapped.text;
      inserted.push({ tool: rule.id, url: rule.url, anchor: wrapped.anchor });
    }
  }

  if (inserted.length > 0) {
    console.log(
      `[blog-tool-links] inserted ${inserted.length} tool link(s): ` +
        inserted.map((l) => `${l.tool}→${l.url}`).join(", "),
    );
  }
  return { md: result, inserted };
}

/**
 * Scan the document line by line; inside each safe line, scan only the
 * plain-text fragments (not existing markdown links). Return the updated
 * document + the anchor that was wrapped, or null if no safe match.
 */
function tryWrapFirstOccurrence(
  text: string,
  patterns: RegExp[],
  url: string,
): { text: string; anchor: string } | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || SKIP_LINE.test(line)) continue;

    const fragments = line.split(MD_LINK_SPLIT);
    for (let f = 0; f < fragments.length; f++) {
      // Existing markdown links/images land on odd indices after the
      // capturing split — never touch those.
      if (f % 2 === 1) continue;
      const fragment = fragments[f];
      if (!fragment) continue;

      for (const pattern of patterns) {
        const m = pattern.exec(fragment);
        if (!m || typeof m.index !== "number") continue;
        const anchor = m[0];
        // Sanity: never wrap a whitespace-only or 1-char anchor.
        if (!anchor || anchor.trim().length < 2) continue;

        fragments[f] =
          fragment.slice(0, m.index) +
          `[${anchor}](${url})` +
          fragment.slice(m.index + anchor.length);

        lines[i] = fragments.join("");
        return { text: lines.join("\n"), anchor };
      }
    }
  }
  return null;
}
