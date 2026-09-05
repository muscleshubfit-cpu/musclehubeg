import { NextRequest, NextResponse } from "next/server";
import { FOODS } from "@/lib/foods";

/**
 * GET /api/food-search?q=chicken+breast
 *
 * Unified food search combining:
 *   1. Our local food database (FOODS array — hand-curated + USDA import)
 *   2. Open Food Facts (for commercial products with images)
 *
 * Returns unified results with consistent format.
 * Open Food Facts results include product images.
 *
 * BUG HISTORY (Phase 99, 2026-09-02): commit 00d6dfa ("remove source
 * names") find-replaced the REAL domain world.openfoodfacts.org into the
 * nonexistent world.product-database.org — DNS fails instantly (HTTP 000)
 * and the external half of this search died SILENTLY. Restored 2026-09-02.
 */

type SearchResult = {
  name: string;
  source: "local" | "openfoodfacts";
  slug?: string;
  url?: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  image?: string;
  brand?: string;
};

/** Shape of an Open Food Facts product row that this endpoint consumes. */
type OffProduct = {
  product_name?: string | null;
  code?: string | null;
  brands?: string | null;
  image_front_small_url?: string | null;
  nutriments?: Record<string, number> | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const q = query.trim().toLowerCase();

  // 1. Search local database
  const localResults: SearchResult[] = FOODS.filter(
    (f) =>
      f.nameAr.toLowerCase().includes(q) ||
      f.nameEn.toLowerCase().includes(q),
  )
    .slice(0, 10)
    .map((f) => ({
      name: f.nameEn,
      source: "local" as const,
      slug: f.slug,
      url: `/foods/${f.slug}`,
      per100g: f.per100g,
    }));

  // 2. Search Open Food Facts (if query is long enough)
  let offResults: SearchResult[] = [];
  if (q.length >= 3) {
    try {
      const offUrl = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(
        query,
      )}&page_size=10&fields=product_name,brands,nutriments,image_front_small_url,code`;

      // Open Food Facts API policy REQUIRES an identifying User-Agent —
      // the default undici UA gets blocked (503/403) by their bot shield.
      const offRes = await fetch(offUrl, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "Alkemos/1.0 (https://alkemos.com; contact via site support)",
          Accept: "application/json",
        },
      });

      if (offRes.ok) {
        const offData = await offRes.json();
        const products: OffProduct[] = offData.products || [];

        offResults = products
          .filter((p) => {
            // Only include products with nutrition data
            const n = p.nutriments || {};
            return n["energy-kcal_100g"] || n["proteins_100g"];
          })
          .map((p) => {
            const n = p.nutriments || {};
            return {
              name: p.product_name || p.code || "Unknown",
              source: "openfoodfacts" as const,
              brand: p.brands || undefined,
              image: p.image_front_small_url || undefined,
              per100g: {
                calories: Math.round(n["energy-kcal_100g"] || 0),
                protein: Math.round((n["proteins_100g"] || 0) * 10) / 10,
                carbs: Math.round((n["carbohydrates_100g"] || 0) * 10) / 10,
                fat: Math.round((n["fat_100g"] || 0) * 10) / 10,
              },
            };
          })
          .slice(0, 10);
      }
    } catch (e) {
      console.error("[api/food-search] Open Food Facts failed:", e);
    }
  }

  // 3. Merge results — local first, then Open Food Facts
  const all = [...localResults, ...offResults];

  return NextResponse.json({
    results: all,
    count: all.length,
    localCount: localResults.length,
    offCount: offResults.length,
  });
}
