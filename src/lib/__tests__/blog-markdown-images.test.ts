/**
 * renderMarkdown BODY IMAGE regression test (owner bug 2026-08-28):
 * body images written as markdown `![alt](url)` by embedBodyImages /
 * embed-backfill rendered as BARE TEXT LINKS because renderMarkdown had
 * no image rule — the link regex consumed "[alt](url)" and left the "!".
 * The image rule MUST convert ![alt](url) → <img> BEFORE the link rule.
 */
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../blog";

describe("renderMarkdown body images", () => {
  it("renders ![alt](url) as an <img>, not a text link", () => {
    const md =
      "## Section One\n\nSome intro text.\n\n![dumbbell rack in modern gym](https://image.pollinations.ai/prompt/dumbbell%20rack?width=1024&height=576&nologo=true&seed=1&model=flux)\n\nMore text.";
    const html = renderMarkdown(md);
    expect(html).toMatch(/<img\s+src="https:\/\/image\.pollinations\.ai/);
    expect(html).not.toMatch(/!\[/);
    // must NOT degrade to a text link for the image URL
    expect(html).not.toMatch(/<a [^>]*href="https:\/\/image\.pollinations\.ai/);
  });

  it("renders multiple body images independently", () => {
    const md =
      "![first image](https://example.com/a.jpg)\n\ntext\n\n![second image](https://example.com/b.jpg)";
    const html = renderMarkdown(md);
    expect(html.match(/<img\s/g)?.length).toBe(2);
  });

  it("strips unsafe-scheme images entirely (XSS guard)", () => {
    const md = "![evil](javascript:alert(1))";
    const html = renderMarkdown(md);
    expect(html).not.toMatch(/<img/);
    expect(html).not.toMatch(/javascript:/);
  });

  it("still renders regular links after the image rule ran", () => {
    const md = "see [the docs](https://example.com/docs) for more";
    const html = renderMarkdown(md);
    expect(html).toMatch(/<a href="https:\/\/example\.com\/docs"/);
    expect(html).not.toMatch(/<img/);
  });
});
