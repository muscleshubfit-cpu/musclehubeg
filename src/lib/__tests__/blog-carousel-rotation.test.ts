/**
 * HOMEPAGE BLOG CAROUSEL SELECTION canaries (Phase 118 — owner directive
 * 2026-09-04: «تنويع لقسم المقالات المميزة، وأن يستبعد فقط ما يُعرض
 * حاليًا في قسم أحدث المقالات»).
 *
 * selectHomeBlogCarousels() replaced the old seed-invariant char-sum
 * "daily shuffle" that froze the featured carousel for weeks. These tests
 * lock in the contract:
 *   - featured NEVER overlaps what latest shows at the same moment;
 *   - featured genuinely changes from day to day (the old bug);
 *   - the rotation systematically covers the whole pool;
 *   - selection is deterministic within a single day;
 *   - a post that left the latest carousel may resurface in featured;
 *   - small/empty blogs degrade gracefully.
 */
import { describe, it, expect } from "vitest";
import {
  selectHomeBlogCarousels,
  HOME_LATEST_COUNT,
  HOME_FEATURED_COUNT,
  type BlogPost,
} from "../blog";

/** Minimal valid BlogPost factory (dates ascending per id by default). */
function makePost(id: string, publishedAt: string): BlogPost {
  return {
    id,
    language: "en",
    title: `Post ${id}`,
    slug: `post-${id}`,
    excerpt: null,
    content: "content",
    meta_title: null,
    meta_description: null,
    focus_keyword: null,
    keywords: [],
    category: "nutrition",
    tags: [],
    featured_image: null,
    cover_alt: null,
    reading_time: 3,
    author: "a",
    published_at: publishedAt,
    updated_at: publishedAt,
    is_published: true,
    faq_json: null,
    schema_json: null,
    linked_post_id: null,
    created_at: publishedAt,
  };
}

/** 30 posts, newest = p29 … oldest = p00 (ISO dates a day apart). */
function makePosts(n: number): BlogPost[] {
  return Array.from({ length: n }, (_, i) =>
    makePost(`p${String(i).padStart(2, "0")}`, `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
  );
}

describe("selectHomeBlogCarousels — latest section (unchanged behavior)", () => {
  it("latest = the newest HOME_LATEST_COUNT posts, newest first", () => {
    const posts = makePosts(30);
    const { latest } = selectHomeBlogCarousels(posts, 0);
    expect(latest.map((p) => p.id)).toEqual([
      "p29", "p28", "p27", "p26", "p25", "p24", "p23", "p22",
    ]);
    expect(latest.length).toBe(HOME_LATEST_COUNT);
  });

  it("re-sorts defensively when the caller passes oldest-first input", () => {
    const posts = makePosts(20).slice().reverse();
    const { latest } = selectHomeBlogCarousels(posts, 0);
    expect(latest[0].id).toBe("p19");
    expect(latest.length).toBe(8);
  });
});

describe("selectHomeBlogCarousels — the Phase 118 contract", () => {
  it("featured never overlaps what latest shows at the same moment (any day)", () => {
    const posts = makePosts(30);
    for (let day = 0; day < 40; day++) {
      const { latest, featured } = selectHomeBlogCarousels(posts, day);
      const latestIds = new Set(latest.map((p) => p.id));
      expect(featured.every((p) => !latestIds.has(p.id))).toBe(true);
    }
  });

  it("REGRESSION (the frozen-carousel bug): featured changes from day to day", () => {
    const posts = makePosts(30);
    const day0 = selectHomeBlogCarousels(posts, 0).featured.map((p) => p.id);
    const day1 = selectHomeBlogCarousels(posts, 1).featured.map((p) => p.id);
    const day2 = selectHomeBlogCarousels(posts, 2).featured.map((p) => p.id);
    expect(day0).not.toEqual(day1);
    expect(day1).not.toEqual(day2);
    // With a 22-post pool, consecutive windows are fully disjoint (22 ≥ 12).
    expect(day0.filter((id) => day1.includes(id))).toHaveLength(0);
  });

  it("rotation systematically covers the WHOLE pool — no post is starved", () => {
    const posts = makePosts(30);
    const { latest } = selectHomeBlogCarousels(posts, 0);
    const poolIds = new Set(posts.map((p) => p.id).filter((id) => !latest.some((p) => p.id === id)));
    const seen = new Set<string>();
    for (let day = 0; day < 40; day++) {
      selectHomeBlogCarousels(posts, day).featured.forEach((p) => seen.add(p.id));
    }
    // Every pool post got featured exposure within the cycle.
    poolIds.forEach((id) => expect(seen.has(id)).toBe(true));
    // And featured NEVER pulled anything from the latest slice.
    latest.forEach((p) => expect(seen.has(p.id)).toBe(false));
  });

  it("deterministic within a day — same inputs, same output", () => {
    const posts = makePosts(25);
    const a = selectHomeBlogCarousels(posts, 1234);
    const b = selectHomeBlogCarousels(posts, 1234);
    expect(a.featured).toEqual(b.featured);
    expect(a.latest).toEqual(b.latest);
  });

  it("a post that LEFT the latest carousel may resurface in featured", () => {
    // p00 was THE only post → it WAS in latest…
    const smallBlog = makePosts(1);
    const early = selectHomeBlogCarousels(smallBlog, 0);
    expect(early.latest.map((p) => p.id)).toEqual(["p00"]);

    // …then 25 newer posts pushed it out of latest. It is eligible for
    // featured again (only the CURRENT overlap is excluded — «فقط»).
    const grown = [...smallBlog, ...Array.from({ length: 25 }, (_, i) =>
      makePost(`n${String(i).padStart(2, "0")}`, `2026-03-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
    )];
    let resurfaced = false;
    for (let day = 0; day < 20 && !resurfaced; day++) {
      resurfaced = selectHomeBlogCarousels(grown, day).featured.some((p) => p.id === "p00");
    }
    expect(resurfaced).toBe(true);
  });
});

describe("selectHomeBlogCarousels — degradation & edge cases", () => {
  it("empty blog → both carousels empty (section stays hidden)", () => {
    const { latest, featured } = selectHomeBlogCarousels([], 0);
    expect(latest).toEqual([]);
    expect(featured).toEqual([]);
  });

  it("tiny blog (5 posts) → latest keeps the half-cap so featured survives", () => {
    const { latest, featured } = selectHomeBlogCarousels(makePosts(5), 0);
    expect(latest.length).toBe(3); // min(8, ceil(5/2))
    expect(featured.length).toBe(2);
    const latestIds = new Set(latest.map((p) => p.id));
    expect(featured.every((p) => !latestIds.has(p.id))).toBe(true);
  });

  it("pool ≤ HOME_FEATURED_COUNT → featured shows the entire pool", () => {
    // 12 posts: latest = min(8, ceil(12/2)) = 6 → pool = 6 → all featured.
    const posts = makePosts(12);
    const { latest, featured } = selectHomeBlogCarousels(posts, 0);
    expect(latest.length).toBe(6);
    const latestIds = new Set(latest.map((p) => p.id));
    const poolIds = posts.map((p) => p.id).filter((id) => !latestIds.has(id));
    expect(featured.map((p) => p.id).sort()).toEqual(poolIds.sort());
  });

  it("null published_at falls back to created_at (no post dropped)", () => {
    const posts = makePosts(10);
    posts[9] = { ...posts[9], published_at: null }; // p09 → falls back to created_at (same instant)
    const { latest, featured } = selectHomeBlogCarousels(posts, 0);
    expect(latest.length).toBe(5); // min(8, ceil(10/2))
    // p09 still sorts as the newest via its created_at fallback.
    expect(latest[0].id).toBe("p09");
    const latestIds = new Set(latest.map((p) => p.id));
    expect(featured.every((p) => !latestIds.has(p.id))).toBe(true);
  });

  it("negative dayIndex does not crash (defensive Math.abs)", () => {
    const posts = makePosts(30);
    expect(() => selectHomeBlogCarousels(posts, -7)).not.toThrow();
    const { featured } = selectHomeBlogCarousels(posts, -7);
    expect(featured.length).toBe(HOME_FEATURED_COUNT);
  });
});
