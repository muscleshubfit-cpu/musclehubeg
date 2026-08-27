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
