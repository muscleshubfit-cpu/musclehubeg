import { FoodsExplorer } from "@/components/foods/FoodsExplorer";
import { parseFoodsQuery } from "@/components/foods/url";

/**
 * Food Library list (EN) — SERVER-RENDERED.
 *
 * Performance audit 2026-09-05: this page used to be a "use client"
 * component importing the full 8,830-food array (a ~3MB JS chunk on
 * every visit). It is now a server component: the grid, category
 * pills, tag toggles and pagination all render from URL search params
 * on the server; only the search/macro inputs are a small client
 * island (FoodsFilters). Layout metadata (canonical/hreflang/OG) is
 * declared by src/app/foods/layout.tsx.
 */
export default async function FoodsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  return <FoodsExplorer lang="en" query={parseFoodsQuery(sp)} />;
}
