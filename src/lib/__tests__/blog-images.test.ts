/**
 * BODY IMAGE EMBEDDING LAW canaries — src/lib/blog-images.ts → embedBodyImages().
 *
 * Regression context (2026-08-27): P3 sourced 3–5 images per article but P5
 * published only images[0] (featured cover) — positions 2..N were dropped and
 * every live article rendered as a wall of text with zero in-body images.
 */
import { describe, it, expect } from "vitest";
import { embedBodyImages, MAX_BODY_IMAGES } from "@/lib/blog-images";

const COVER = "https://image.pollinations.ai/prompt/cover?seed=1";
const IMG1 = "https://image.pollinations.ai/prompt/body-one?seed=2";
const IMG2 = "https://image.pollinations.ai/prompt/body-two?seed=3";
const IMG3 = "https://image.pollinations.ai/prompt/body-three?seed=4";
const IMG4 = "https://image.pollinations.ai/prompt/body-four?seed=5";

const DOC = [
  "Intro paragraph before any section.",
  "",
  "## First Section",
  "",
  "Text A",
  "",
  "## Second Section",
  "",
  "Text B",
  "",
  "## Third Section",
  "",
  "Text C",
  "",
  "## Fourth Section",
  "",
  "Text D",
].join("\n");

const img = (url: string, alt = "alt text") => ({ url, alt, credit: "AI Generated" });

describe("embedBodyImages", () => {
  it("inserts images[1..N] under evenly spaced headings and NEVER the cover", () => {
    const out = embedBodyImages(DOC, [img(COVER), img(IMG1), img(IMG2)]);
    expect(out).toContain(`![alt text](${IMG1})`);
    expect(out).toContain(`![alt text](${IMG2})`);
    expect(out).not.toContain(COVER); // cover never duplicated into body
    // still exactly one insertion per used image
    expect((out.match(/!\[alt text\]/g) || []).length).toBe(2);
    // each insertion sits right AFTER a ## heading line
    const lines = out.split("\n");
    lines.forEach((l, i) => {
      if (l.includes(IMG1) || l.includes(IMG2)) {
        const prev = lines.slice(0, i).reverse().find((x) => x.trim() !== "") || "";
        expect(prev.startsWith("## ")).toBe(true);
      }
    });
  });

  it("is idempotent — a second pass inserts nothing new", () => {
    const once = embedBodyImages(DOC, [img(COVER), img(IMG1), img(IMG2)]);
    const twice = embedBodyImages(once, [img(COVER), img(IMG1), img(IMG2)]);
    expect(twice).toBe(once);
  });

  it("is a strict no-op when the markdown has no ## headings", () => {
    const flat = "Just a paragraph.\n\nAnother paragraph.";
    expect(embedBodyImages(flat, [img(COVER), img(IMG1), img(IMG2)])).toBe(flat);
  });

  it("ignores ## lines inside fenced code blocks", () => {
    const fenced = [
      "## Real Section",
      "",
      "```",
      "## not a heading",
      "```",
      "",
      "## Another Real Section",
      "",
      "Text",
    ].join("\n");
    const out = embedBodyImages(fenced, [img(COVER), img(IMG1)]);
    expect(out).toContain(IMG1);
    // insertion must be after one of the REAL headings only
    const lines = out.split("\n");
    const idx = lines.findIndex((l) => l.includes(IMG1));
    const prev = lines.slice(0, idx).reverse().find((x) => x.trim() !== "") || "";
    expect(prev.startsWith("## ")).toBe(true);
    expect(prev).not.toContain("not a heading");
  });

  it("strips markdown-unsafe brackets from alt text", () => {
    const out = embedBodyImages(DOC, [img(COVER), img(IMG1, "rack [heavy] duty")]);
    expect(out).toContain("![rack heavy duty]");
    expect(out).not.toContain("[heavy]");
  });

  it("skips null/empty entries and caps at maxImages", () => {
    const out = embedBodyImages(
      DOC,
      [img(COVER), null, undefined, img(IMG1), img(IMG2), img(IMG3), img(IMG4)],
      MAX_BODY_IMAGES,
    );
    // candidates = first 3 usable after cover: IMG1, IMG2, IMG3 — IMG4 dropped
    expect(out).toContain(IMG1);
    expect(out).toContain(IMG2);
    expect(out).toContain(IMG3);
    expect(out).not.toContain(IMG4);
  });

  it("returns the input unchanged when there are no body candidates", () => {
    expect(embedBodyImages(DOC, [img(COVER)])).toBe(DOC);
    expect(embedBodyImages(DOC, [])).toBe(DOC);
    expect(embedBodyImages(DOC, [null, null])).toBe(DOC);
  });
});
