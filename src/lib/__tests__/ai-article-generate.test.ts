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

describe("article_generate — registry", () => {
  it("is a registered job type behind the coach gate", () => {
    expect(isAiJobType("article_generate")).toBe(true);
    expect(JOB_GATE.article_generate).toBe("coach");
  });
});

describe("article_generate — sanitizeJobPayload", () => {
  it("keeps the whitelisted fields with clamps", () => {
    const out = sanitizeJobPayload("article_generate", {
      topic: "أفضل تمارين ضغط للصدر",
      language: "ar",
      tone: "تحفيزي",
      audience: "مبتدئين",
      category: "تمارين",
      keywords: ["ضغط", " ", "صدر", 123 as any],
      evil: "https://javascript:alert(1)",
    });
    expect(out.topic).toBe("أفضل تمارين ضغط للصدر");
    expect(out.language).toBe("ar");
    expect(out.tone).toBe("تحفيزي");
    expect(out.audience).toBe("مبتدئين");
    expect(out.keywords).toEqual(["ضغط", "صدر"]); // non-string entries are dropped
    expect((out as any).evil).toBeUndefined();
  });

  it("defaults language to ar and keywords to []", () => {
    const out = sanitizeJobPayload("article_generate", { topic: "protein timing basics" });
    expect(out.language).toBe("ar");
    expect(out.keywords).toEqual([]);
  });

  it("caps keywords at 8 and each at 40 chars", () => {
    const out = sanitizeJobPayload("article_generate", {
      topic: "bulk topic here",
      keywords: Array.from({ length: 12 }, (_, i) => `kw${i}${"x".repeat(45)}`),
    });
    expect(out.keywords.length).toBe(8);
    expect((out.keywords as string[]).every((k) => k.length <= 40)).toBe(true);
  });

  it("TOPIC-AUTO: empty/short topic is ACCEPTED (processor smart-picks the title)", () => {
    // 2026-08-28b: topic became optional — an empty topic makes the
    // PROCESSOR pick a fresh title via pickSmartTopic (the blog pipeline's
    // topic brain), per owner directive «مفروض يختار العنوان بنفس نظام
    // التوليد». The sanitizer must pass it through as "" (no throw).
    expect(sanitizeJobPayload("article_generate", {}).topic).toBe("");
    expect(sanitizeJobPayload("article_generate", { topic: "abc" }).topic).toBe("abc");
    expect(sanitizeJobPayload("article_generate", { topic: "  " }).topic).toBe("");
  });

  it("accepts en language", () => {
    const out = sanitizeJobPayload("article_generate", { topic: "creatine guide", language: "en" });
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
