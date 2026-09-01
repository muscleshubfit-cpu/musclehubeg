/**
 * FREE-TOOL INTERNAL LINKING canaries (owner SEO directive, 2026-09-01).
 *
 * insertToolLinks() is the deterministic guarantee that every generated
 * article links readers to the matching free tools (calorie/macro/BMI/
 * body-fat calculators, water tracker, meal planner, hub pages).
 * These tests lock in the contract: language-aware triggers, first
 * occurrence only, max 3 links, idempotent, never inside an existing
 * markdown link, never on headings/tables/quotes.
 */
import { describe, it, expect } from "vitest";
import { insertToolLinks } from "../blog-tool-links";

describe("insertToolLinks — EN", () => {
  it("wraps the first natural mention with the matching tool link", () => {
    const md =
      "Intro paragraph about training. You must control your daily calories to lose fat. More text here about progress and macros later.";
    const { md: out, inserted } = insertToolLinks(md, "en");
    expect(out).toContain("[calories](/tools/calorie-calculator)");
    expect(inserted.map((i) => i.tool)).toContain("calorie-calculator");
  });

  it("caps at 3 tool links per article", () => {
    const md =
      "Tracking calories daily matters. A meal plan keeps you consistent. Watch your macros too. Body fat percentage also matters. Hydration and water intake matter. Check your BMI as well. Good exercises help. A workout program ties it together.";
    const { md: out, inserted } = insertToolLinks(md, "en");
    expect(inserted.length).toBe(3);
    const links = out.match(/\]\((\/tools\/[^)]+|\/meal-planner|\/programs|\/exercises|\/foods)\)/g) || [];
    expect(links.length).toBe(3);
  });

  it("is idempotent — a second pass inserts nothing new", () => {
    const md = "You should track your calories every day and follow a solid meal plan for best results.";
    const first = insertToolLinks(md, "en");
    const second = insertToolLinks(first.md, "en");
    expect(second.inserted.length).toBe(0);
    expect(second.md).toBe(first.md);
  });

  it("skips a tool already linked by the model (P4 review output)", () => {
    const md = "Track your [calories](/tools/calorie-calculator) daily for fat loss results now.";
    const { inserted } = insertToolLinks(md, "en");
    expect(inserted.map((i) => i.tool)).not.toContain("calorie-calculator");
  });

  it("never wraps text inside an existing markdown link", () => {
    const md = "Read our [guide to counting calories the right way](/blog/count-calories) today for results.";
    const { md: out } = insertToolLinks(md, "en");
    // The anchor inside the existing link must remain untouched.
    expect(out).toContain("[guide to counting calories the right way](/blog/count-calories)");
    expect(out).not.toContain("[[");
  });

  it("does not link headings, tables, blockquotes or images", () => {
    const md = [
      "## Calories and macros overview",
      "",
      "| Item | Value |",
      "| --- | --- |",
      "| calories | 2000 |",
      "",
      "> drink water daily quote line stays plain",
      "",
      "A normal sentence mentioning calories here gets the link.",
    ].join("\n");
    const { md: out } = insertToolLinks(md, "en");
    expect(out).toContain("## Calories and macros overview");
    expect(out).toContain("| calories | 2000 |");
    expect(out).toContain("> drink water daily quote line stays plain");
    expect(out).toContain("A normal sentence mentioning [calories](/tools/calorie-calculator) here");
  });
});

describe("insertToolLinks — AR", () => {
  it("wraps Arabic trigger phrases (سعرات / خطة غذائية)", () => {
    const md =
      "مقدمة عن التمرين والتغذية. للتحكم في وزنك لازم تحسب سعراتك اليومية بدقة، وتلتزم بخطة غذائية واضحة تناسب هدفك على المدى الطويل.";
    const { md: out, inserted } = insertToolLinks(md, "ar");
    expect(out).toContain("](/tools/calorie-calculator)");
    expect(out).toContain("](/meal-planner)");
    expect(inserted.length).toBeGreaterThanOrEqual(2);
  });

  it("is idempotent for Arabic too", () => {
    const md = "احسب سعراتك اليومية لتحقيق هدفك واتبع خطة غذائية مناسبة لجسمك ونشاطك اليومي.";
    const first = insertToolLinks(md, "ar");
    const second = insertToolLinks(first.md, "ar");
    expect(second.inserted.length).toBe(0);
    expect(second.md).toBe(first.md);
  });
});

describe("insertToolLinks — safety", () => {
  it("returns input untouched for very short content", () => {
    const md = "calories";
    const { md: out, inserted } = insertToolLinks(md, "en");
    expect(out).toBe(md);
    expect(inserted.length).toBe(0);
  });

  it("only produces site-internal tool URLs", () => {
    const md =
      "Track calories, follow a meal plan, and measure body fat to see real progress over several consistent weeks.";
    const { inserted } = insertToolLinks(md, "en");
    for (const link of inserted) {
      expect(link.url).toMatch(/^\/(tools\/|meal-planner|programs|exercises|foods)/);
    }
  });
});
