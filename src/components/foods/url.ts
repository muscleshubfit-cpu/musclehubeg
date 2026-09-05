/**
 * URL-state helpers for the public foods list (client + server safe).
 *
 * The foods list is SERVER-RENDERED (performance audit 2026-09-05):
 * filters live in the URL (?cat=protein&q=…&tags=…&page=2), the grid
 * is rendered server-side, and the search/macro inputs push new URLs.
 * These helpers build those URLs consistently from both sides.
 */

export type FoodsQuery = {
  cat: string;
  q: string;
  tags: string[];
  minp: string;
  maxc: string;
  maxcal: string;
  page: number;
};

export const EMPTY_FOODS_QUERY: FoodsQuery = {
  cat: "all",
  q: "",
  tags: [],
  minp: "",
  maxc: "",
  maxcal: "",
  page: 1,
};

const FOOD_CATEGORIES = new Set([
  "protein",
  "carb",
  "fat",
  "vegetable",
  "fruit",
  "dairy",
  "nuts",
  "snack",
  "drink",
]);

/** Parses + validates raw searchParams into a FoodsQuery. */
export function parseFoodsQuery(
  sp: Record<string, string | string[] | undefined>,
): FoodsQuery {
  const one = (k: string): string => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0] ?? "";
    return v ?? "";
  };
  const cat = one("cat");
  const tagsRaw = one("tags");
  const pageRaw = parseInt(one("page"), 10);
  return {
    cat: FOOD_CATEGORIES.has(cat) ? cat : "all",
    q: one("q").slice(0, 60),
    tags: tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6)
      : [],
    minp: one("minp").replace(/[^\d.]/g, "").slice(0, 5),
    maxc: one("maxc").replace(/[^\d.]/g, "").slice(0, 5),
    maxcal: one("maxcal").replace(/[^\d.]/g, "").slice(0, 5),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

/**
 * Serializes a FoodsQuery into a relative href (no trailing ? when
 * everything is default). `over` lets callers override one field
 * (e.g. the pager overriding page, a tag toggle flipping tags).
 */
export function buildFoodsHref(
  base: string,
  q: FoodsQuery,
  over: Partial<FoodsQuery> = {},
): string {
  const merged = { ...q, ...over };
  const params = new URLSearchParams();
  if (merged.cat !== "all") params.set("cat", merged.cat);
  if (merged.q) params.set("q", merged.q);
  if (merged.tags.length > 0) params.set("tags", merged.tags.join(","));
  if (merged.minp) params.set("minp", merged.minp);
  if (merged.maxc) params.set("maxc", merged.maxc);
  if (merged.maxcal) params.set("maxcal", merged.maxcal);
  if (merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
