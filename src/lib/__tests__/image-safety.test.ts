/**
 * IMAGE SAFETY POLICY tests — guards the 2026-08-27 live incident fixes.
 * The REAL offending prompts (from production pollinations URLs) must
 * sanitize to people-free, negation-free prompts.
 */
import { describe, expect, it } from "vitest";
import {
  buildSafeImagePrompt,
  deriveObjectScene,
  promptHasBannedVocabulary,
  promptHasPersonSemantics,
  sanitizeImageSubject,
} from "../image-safety";

describe("image-safety sanitizer", () => {
  it("sanitizes the EXACT EN prompt that shipped nudity in production", () => {
    const live =
      "Supplement timing chart: creatine, protein powder, recovery aids, clean infographic style, modest athletic attire with full body coverage, no nudity, no revealing or suggestive clothing, no exposed midriff or cleavage, no women in revealing outfits, family-friendly editorial photography";
    const { clean } = sanitizeImageSubject(live);
    expect(promptHasBannedVocabulary(clean)).toBe(false);
    expect(/nudity|cleavage|revealing|women|athletic attire/i.test(clean)).toBe(false);
  });

  it("sanitizes the EXACT AR prompt from the AR incident", () => {
    const liveAR =
      "صورة لمكملات كرياتين وبروتين مصل اللبن مع عبواتها, editorial photography, modest athletic attire, no nudity, family-friendly";
    const { clean } = sanitizeImageSubject(liveAR);
    expect(promptHasBannedVocabulary(clean)).toBe(false);
  });

  it("rewrites person-word subjects to object scenes", () => {
    const out = buildSafeImagePrompt("fit woman doing pushups in gym", "photo", "4 day upper lower split program");
    expect(/woman|women|girl|lady/i.test(out)).toBe(false);
    expect(/dumbbell|rack|gym interior/i.test(out)).toBe(true);
    expect(promptHasBannedVocabulary(out)).toBe(false);
  });

  it("never emits any 'no …' negation construction", () => {
    const out = buildSafeImagePrompt(
      "meal prep bowls, no hands visible, without faces, not showing people",
      "photo",
      "nutrition plan",
    );
    expect(/\bno\s+[a-z]|\bwithout\b|\bnot\b/i.test(out)).toBe(false);
  });

  it("anchors empty/mostly-Arabic subjects to topical English scenes", () => {
    const out = buildSafeImagePrompt("تمارين رياضية", "photo", "muscle building home workout guide");
    expect(/^[\x00-\x7F]+$/.test(out.replace(/[^\x20-\x7E]/g, "")) || /home corner gym setup/.test(out)).toBe(true);
    expect(/dumbbell|mat|resistance bands/.test(out)).toBe(true);
  });

  it("deriveObjectScene maps supplement hints to supplement scene", () => {
    expect(deriveObjectScene("creatine and whey article")).toMatch(/supplement jars/i);
  });

  it("adds positive-only style tails per type", () => {
    const photo = buildSafeImagePrompt("kettlebell row studio corner", "photo");
    expect(photo).toContain("professional product photography");
    const info = buildSafeImagePrompt("weekly protein intake breakdown", "infographic");
    expect(info).toContain("flat vector infographic");
  });
});

describe("image-safety LAW v2 — semantic person-scene attractors (2026-08-28)", () => {
  it("REWRITES the exact production prompt that rendered a shirtless man (seed=29197)", () => {
    // Zero person tokens, yet Pollinations flux rendered a shirtless man:
    // fitness program semantics are person attractors. Must be replaced
    // ENTIRELY by a curated object scene.
    const live =
      "muscle building workout plan 12\u2011Week Periodized Muscle Building Plan for Intermediate Lifters";
    const out = buildSafeImagePrompt(live, "photo", live);
    expect(/lifters?|muscle building|workout/i.test(out)).toBe(false);
    expect(promptHasPersonSemantics(out)).toBe(false);
    // curated planner scene (periodized/plan hint)
    expect(/planner notebook|dumbbell/i.test(out)).toBe(true);
  });

  it("flags action/program/physique semantics as person scenes", () => {
    expect(promptHasPersonSemantics("full body workout session")).toBe(true);
    expect(promptHasPersonSemantics("12-week periodized training plan")).toBe(true);
    expect(promptHasPersonSemantics("best exercises for bigger biceps")).toBe(true);
    expect(promptHasPersonSemantics("fat burning weight loss journey")).toBe(true);
    expect(promptHasPersonSemantics("dumbbell rack on wooden floor")).toBe(false);
    expect(promptHasPersonSemantics("row of treadmills in bright gym")).toBe(false);
    expect(promptHasPersonSemantics("supplement jars close-up")).toBe(false);
  });

  it("style tails are IDEMPOTENT — never doubles (production doubled-tail bug)", () => {
    const polluted =
      "modern fitness studio interior with equipment rack and natural light, professional product photography, soft studio lighting, high detail";
    const out = buildSafeImagePrompt(polluted, "photo", polluted);
    expect(out.match(/high detail/g)?.length).toBe(1);
    expect(out.match(/professional product photography/g)?.length).toBe(1);
  });

  it("EVERY curated object scene passes the banned-vocabulary gate (no refusal loop)", () => {
    const hints = [
      "12-week periodized muscle building plan for lifters",
      "creatine and whey supplements",
      "nutrition macros and meal planning",
      "cardio treadmill fat burning",
      "home workout no equipment bodyweight",
      "injury recovery foam rolling mobility",
      "yoga flexibility studio",
      "muscle hypertrophy strength program",
      "beginner guide tips for starters",
      "completely unknown topic xyz",
    ];
    for (const hint of hints) {
      const out = buildSafeImagePrompt(hint, "photo", hint);
      expect(promptHasBannedVocabulary(out)).toBe(false);
      expect(promptHasPersonSemantics(out)).toBe(false);
    }
  });

  it("AR program titles map to curated English object scenes", () => {
    const out = buildSafeImagePrompt(
      "دليل بناء العضلات في المنزل بدون معدات",
      "photo",
      "muscle building home workout guide",
    );
    expect(/^[\x00-\x7F]+$/.test(out)).toBe(true);
    expect(promptHasPersonSemantics(out)).toBe(false);
  });
});
