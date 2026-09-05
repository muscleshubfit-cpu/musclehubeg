import { ExercisesExplorer } from "@/components/exercises/ExercisesExplorer";
import { parseExercisesQuery } from "@/components/exercises/url";

/**
 * Exercise Library list (EN) — SERVER-RENDERED.
 *
 * Performance audit 2026-09-05: this page used to be a "use client"
 * component importing the 868-exercise / 1.6MB array. Now the grid,
 * category pills and pagination render on the server from URL search
 * params; only the search + equipment/level selects are a small client
 * island. Layout metadata (canonical/hreflang/OG) is declared by
 * src/app/exercises/layout.tsx.
 */
export default async function ExercisesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  return <ExercisesExplorer lang="en" query={parseExercisesQuery(sp)} />;
}
