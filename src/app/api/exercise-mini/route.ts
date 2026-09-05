import { NextResponse } from "next/server";
import { EXERCISES } from "@/lib/exercises";
import type { ExerciseMini } from "@/lib/exercises-shared";

/**
 * GET /api/exercise-mini — the 868-exercise library as MINI records.
 *
 * BUNDLE LAW (performance audit 2026-09-05): authenticated plan/coach
 * views previously imported the full 1.6MB exercises.ts client-side
 * just to enrich plan tables (image + category + slug per row). They
 * now lazy-fetch this endpoint ONCE per session (~30KB gzipped) via
 * src/lib/exercise-lookup.ts — the full array (instructions, tips,
 * muscles) never reaches the browser.
 *
 * Response is static data — cached 24h client-side.
 */
export async function GET() {
  const exercises: ExerciseMini[] = EXERCISES.map((e) => ({
    slug: e.slug,
    nameAr: e.nameAr,
    nameEn: e.nameEn,
    category: e.category,
    imageKey: e.imageKey,
  }));
  return NextResponse.json(
    { exercises },
    {
      headers: {
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
