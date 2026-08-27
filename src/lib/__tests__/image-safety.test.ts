/**
 * IMAGE SOURCE POLICY v3 tests — PEXELS-FIRST REAL PHOTOGRAPHY.
 * Owner directive (2026-08-28): normal people ALLOWED in photos,
 * nudity/immodesty NEVER; Pollinations AI generation retired.
 * Guards the query sanitizer, alt-text screening, and rotation.
 */
import { describe, expect, it } from "vitest";
import {
  sanitizeImageQuery,
  hasNsfwVocabulary,
  hasImmodestSignal,
  hashKey,
  pickResultIndex,
} from "../image-safety";

describe("image-safety v3 — query sanitizer (people OK / NSFW never)", () => {
  it("KEEPS normal-people fitness wording (owner law change 2026-08-28)", () => {
    const { query, nsfwRemoved } = sanitizeImageQuery(
      "fit woman doing pushups in gym",
    );
    expect(query).toMatch(/woman/i);
    expect(query).toMatch(/pushups/i);
    expect(nsfwRemoved).toBe(false);
  });

  it("strips NSFW vocabulary from queries", () => {
    const { query, nsfwRemoved, changed } = sanitizeImageQuery(
      "gym workout nude model sexy poses",
    );
    expect(nsfwRemoved).toBe(true);
    expect(changed).toBe(true);
    expect(query).not.toMatch(/nude|sexy/i);
    expect(query).toMatch(/gym workout/i);
  });

  it("strips negation constructions (poison for keyword search)", () => {
    const { query } = sanitizeImageQuery(
      "meal prep bowls no hands visible without faces",
    );
    expect(query).not.toMatch(/\bno\s+[a-z]|\bwithout\b/i);
    expect(query).toMatch(/meal prep bowls/i);
  });

  it("sanitizes the EXACT legacy incident prompt down to a safe query", () => {
    const live =
      "Supplement timing chart: creatine, protein powder, recovery aids, clean infographic style, modest athletic attire with full body coverage, no nudity, no revealing or suggestive clothing, family-friendly editorial photography";
    const { query } = sanitizeImageQuery(live);
    expect(hasNsfwVocabulary(query)).toBe(false);
    expect(/\bno\s+[a-z]|\bwithout\b/i.test(query)).toBe(false);
    expect(query).toMatch(/supplement|creatine|protein/i);
  });

  it("strips Arabic NSFW + negation words", () => {
    const { query } = sanitizeImageQuery("تمارين رياضية بدون معدات عاري");
    expect(hasNsfwVocabulary(query)).toBe(false);
    expect(query).not.toMatch(/بدون/);
    expect(query).toMatch(/تمارين رياضية/);
  });

  it("caps query length for keyword-search friendliness", () => {
    const long = "gym workout equipment ".repeat(30);
    const { query } = sanitizeImageQuery(long);
    expect(query.length).toBeLessThanOrEqual(120);
  });
});

describe("image-safety v3 — result screening", () => {
  it("flags NSFW alt-texts for rejection", () => {
    expect(hasNsfwVocabulary("sexy fitness model")).toBe(true);
    expect(hasNsfwVocabulary("امرأة عارية في الجيم")).toBe(true);
    expect(hasNsfwVocabulary("athletes training in modern gym")).toBe(false);
    expect(hasNsfwVocabulary("healthy meal prep bowls")).toBe(false);
  });

  it("v3.1: catches the LIVE immodest case that shipped to production", () => {
    // Pexels cover alt on /blog/4-day-upper-lower-hypertrophy-split —
    // the photo was a shirtless man's bare back (owner: «لا عرى»).
    const liveAlt =
      "Black and white image of a man flexing his muscles, showcasing strength and masculinity.";
    expect(hasImmodestSignal(liveAlt)).toBe(true);
    expect(hasNsfwVocabulary(liveAlt)).toBe(false); // NSFW list alone missed it
  });

  it("v3.1: keeps normal clothed-athlete wording (people OK law)", () => {
    expect(hasImmodestSignal("Adult male performing bench press in a gym")).toBe(false);
    expect(hasImmodestSignal("A muscular man in a tank top exercises with dumbbells")).toBe(false);
    expect(hasImmodestSignal("woman running on treadmill in sportswear")).toBe(false);
    expect(hasImmodestSignal("shirtless bodybuilder posing on stage")).toBe(true);
    expect(hasImmodestSignal("close-up of male torso and six pack")).toBe(true);
    expect(hasImmodestSignal("woman doing abs workout on a mat")).toBe(true);
  });

  it("v3.1: strips immodest tokens from search queries too", () => {
    const { query } = sanitizeImageQuery("bodybuilder six pack abs training");
    expect(hasImmodestSignal(query)).toBe(false);
    expect(query).toMatch(/training/i);
  });
});

describe("image-safety v3 — deterministic result rotation", () => {
  it("pickResultIndex stays in bounds and is stable per key", () => {
    for (let i = 0; i < 20; i++) {
      const idx = pickResultIndex(6, `post-${i}`);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(6);
      expect(pickResultIndex(6, `post-${i}`)).toBe(idx);
    }
  });

  it("rotation spreads across the result pool (diversity)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 24; i++) seen.add(pickResultIndex(6, `slot-${i}`));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it("no variationKey → first (most relevant) result", () => {
    expect(pickResultIndex(6)).toBe(0);
    expect(pickResultIndex(0, "any")).toBe(0);
  });

  it("hashKey is deterministic", () => {
    expect(hashKey("abc")).toBe(hashKey("abc"));
    expect(hashKey("abc")).not.toBe(hashKey("abd"));
  });
});
