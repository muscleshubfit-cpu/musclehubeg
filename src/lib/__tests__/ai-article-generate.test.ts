/**
 * Tests for the article_generate queue job (T-PLAN-GEN-2026-08-28):
 * payload sanitizer trust boundary + the M15-slaw-compliant slug helper
 * used by the coach generation → editor hand-off.
 *
 * Regression context (owner: «توليد الخطط لا يعمل» + «توليد المقالات
 * للكوتش غير موجود»): article generation had NO queue type at all after
 * the Phase-15 client-side generator deletion. These canaries pin the
 * new type's contract.
 */
import { describe, it, expect } from "vitest";
import {
  sanitizeJobPayload,
  isAiJobType,
  JOB_GATE,
} from "../ai-jobs";
import { articleSlugFromTitle } from "../ai-jobs-client";
import { pickRotationCategory, PILLAR_IDS } from "../blog-topics";
import { sanitizeModelSlug, sectionSubjects } from "../ai-job-processors";

describe("article_generate — type rotation (owner: «عايز يكون فى تدوير لنوع المقالات»)", () => {
  it("rotates AWAY from the last-generated pillar", () => {
    // ROTATION MEMORY feeds generated-but-unpublished results into this
    // pure function — one nutrition generation must push the next auto-pick
    // to a different content type.
    const next = pickRotationCategory([{ category: "nutrition" }]);
    expect(next).not.toBe("nutrition");
  });

  it("covers the owner's named types (fitness, nutrition, workout, health)", () => {
    for (const c of ["fitness", "nutrition", "workout", "health"]) {
      expect(PILLAR_IDS).toContain(c);
    }
  });

  it("keeps rotating across a mixed history (never repeats the most recent)", () => {
    const history = [
      { category: "workout" },
      { category: "nutrition" },
      { category: "health" },
    ];
    expect(pickRotationCategory(history)).not.toBe("workout"); // most recent wins the exclusion
  });
});

describe("article_generate — registry", () => {
  it("is a registered job type behind the coach gate", () => {
    expect(isAiJobType("article_generate")).toBe(true);
    expect(JOB_GATE.article_generate).toBe("coach");
  });
});

describe("article_generate — sanitizeJobPayload", () => {
  // sanitizeJobPayload returns Json (it is the enqueue trust boundary);
  // tests read known whitelisted fields → one honest view per call.
  const sanitize = (raw: unknown): Record<string, unknown> =>
    sanitizeJobPayload("article_generate", raw) as Record<string, unknown>;
  it("keeps the whitelisted fields with clamps", () => {
    const out = sanitize({
      topic: "أفضل تمارين ضغط للصدر",
      language: "ar",
      tone: "تحفيزي",
      audience: "مبتدئين",
      category: "تمارين",
      keywords: ["ضغط", " ", "صدر", 123 as unknown as string],
      evil: "https://javascript:alert(1)",
    });
    expect(out.topic).toBe("أفضل تمارين ضغط للصدر");
    expect(out.language).toBe("ar");
    expect(out.tone).toBe("تحفيزي");
    expect(out.audience).toBe("مبتدئين");
    expect(out.keywords).toEqual(["ضغط", "صدر"]); // non-string entries are dropped
    expect(out.evil).toBeUndefined();
  });

  it("defaults language to ar and keywords to []", () => {
    const out = sanitize({ topic: "protein timing basics" });
    expect(out.language).toBe("ar");
    expect(out.keywords).toEqual([]);
  });

  it("caps keywords at 8 and each at 40 chars", () => {
    const out = sanitize({
      topic: "bulk topic here",
      keywords: Array.from({ length: 12 }, (_, i) => `kw${i}${"x".repeat(45)}`),
    });
    const keywords = out.keywords as string[];
    expect(keywords.length).toBe(8);
    expect(keywords.every((k) => k.length <= 40)).toBe(true);
  });

  it("TOPIC-AUTO: empty/short topic is ACCEPTED (processor smart-picks the title)", () => {
    // 2026-08-28b: topic became optional — an empty topic makes the
    // PROCESSOR pick a fresh title via pickSmartTopic (the blog pipeline's
    // topic brain), per owner directive «مفروض يختار العنوان بنفس نظام
    // التوليد». The sanitizer must pass it through as "" (no throw).
    expect(sanitize({}).topic).toBe("");
    expect(sanitize({ topic: "abc" }).topic).toBe("abc");
    expect(sanitize({ topic: "  " }).topic).toBe("");
  });

  it("accepts en language", () => {
    const out = sanitize({ topic: "creatine guide", language: "en" });
    expect(out.language).toBe("en");
  });
});

describe("articleSlugFromTitle — M15 slug law", () => {
  it("derives a lowercase-latin-hyphen slug from an English title", () => {
    expect(articleSlugFromTitle("Best Home Workout Guide!")).toBe("best-home-workout-guide");
  });

  it("falls back to a dated post-slug for Arabic-only titles", () => {
    const slug = articleSlugFromTitle("أفضل تمارين لحرق الدهون");
    expect(slug).toMatch(/^post-\d{12}$/);
  });

  it("strips Arabic characters from mixed titles down to the latin core", () => {
    const slug = articleSlugFromTitle("دليل Protein supplementation العربي");
    expect(slug).toBe("protein-supplementation");
  });

  it("never exceeds 80 chars (editor save validation)", () => {
    const slug = articleSlugFromTitle("x".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(80);
  });
});

describe("SEO-SLUG LAW (2026-08-28i) — sanitizeModelSlug", () => {
  it("keeps a clean latin model slug as-is", () => {
    expect(sanitizeModelSlug("best-home-workout-beginners")).toBe(
      "best-home-workout-beginners",
    );
  });

  it("cleans a messy model slug into the M15 latin-only law", () => {
    expect(sanitizeModelSlug("  Best Home Workout!  ")).toBe("best-home-workout");
    expect(sanitizeModelSlug("fat_loss--guide")).toBe("fat-loss-guide");
    expect(sanitizeModelSlug("-leading-and-trailing-")).toBe("leading-and-trailing");
  });

  it("REJECTS Arabic/non-latin slugs → forces the dated fallback net", () => {
    // The model MUST return an English slug; an Arabic one is unusable
    // under the M15 law and must degrade to "" (caller falls back to
    // articleSlugFromTitle → post-YYYYMMDDNNNN).
    expect(sanitizeModelSlug("أفضل-تمارين-للصدر")).toBe("");
    expect(sanitizeModelSlug("")).toBe("");
    expect(sanitizeModelSlug(null as unknown as string)).toBe("");
  });

  it("enforces the 80-char editor limit and 3-char minimum", () => {
    expect(sanitizeModelSlug("a".repeat(200)).length).toBeLessThanOrEqual(80);
    expect(sanitizeModelSlug("ab")).toBe("");
    expect(sanitizeModelSlug("abc")).toBe("abc");
  });
});

describe("IMAGE BUNDLE LAW (2026-08-28i) — sectionSubjects fallback queries", () => {
  it("extracts ## heading texts as last-resort image queries", () => {
    const md = [
      "## فوائد الكارديو الصباحي",
      "نص القسم الأول",
      "## *أخطاء شائعة* في التغذية",
      "نص القسم الثاني",
    ].join("\n");
    expect(sectionSubjects(md)).toEqual([
      "فوائد الكارديو الصباحي",
      "أخطاء شائعة في التغذية",
    ]);
  });

  it("honors the limit and skips short/garbage headings", () => {
    const md = "## ab\n\n## Real Section Heading Here\n\n## Another Good Section";
    expect(sectionSubjects(md, 1)).toEqual(["Real Section Heading Here"]);
  });

  it("is a no-op on empty or non-structured markdown", () => {
    expect(sectionSubjects("")).toEqual([]);
    expect(sectionSubjects(null as unknown as string)).toEqual([]);
    expect(sectionSubjects("just a paragraph, no headings")).toEqual([]);
  });
});
