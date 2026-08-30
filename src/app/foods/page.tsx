"use client";

import { useState, useMemo, useEffect, useDeferredValue } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchX } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Pagination } from "@/components/Pagination";
import { MembershipPromo, ExploreMore } from "@/components/PageBottomPromo";
import {
  FOODS,
  CATEGORY_LABELS,
  TAG_LABELS,
  filterFoods,
  type FoodCategory,
} from "@/lib/foods";

// DELIVERY 0050: true pagination — owner asked for 20 foods per page with
// navigation buttons (replaces infinite scroll / load-more). Rendering
// thousands of food cards at once crashes low-end devices; 20/page keeps
// DOM size tiny and predictable.
const PAGE_SIZE = 20;

export default function FoodsPage({ lang: langProp }: { lang?: Lang } = {}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";

  const [search, setSearch] = useState("");
  // Read ?cat= param from URL (e.g. /foods?cat=protein) — set by landing page cards
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("cat") as FoodCategory | null;
  const [category, setCategory] = useState<FoodCategory | "all">(initialCat || "all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [minProtein, setMinProtein] = useState<string>("");
  const [maxCarbs, setMaxCarbs] = useState<string>("");
  const [maxCalories, setMaxCalories] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Current page (1-based) — true pagination, 20 cards per page.
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      filterFoods({
        category,
        tags: activeTags,
        search,
        minProtein: minProtein ? Number(minProtein) : undefined,
        maxCarbs: maxCarbs ? Number(maxCarbs) : undefined,
        maxCalories: maxCalories ? Number(maxCalories) : undefined,
      }),
    [search, category, activeTags, minProtein, maxCarbs, maxCalories],
  );

  // useDeferredValue: defers the heavy filter computation so the input
  // stays responsive even when filtering 8,830 foods. React 19 handles
  // this natively — the UI updates immediately, results arrive a tick later.
  const deferredFiltered = useDeferredValue(filtered);
  const isStale = deferredFiltered !== filtered;

  // Reset visible count when filters change (so user sees fresh results from the top).
  useEffect(() => {
    setPage(1);
  }, [search, category, activeTags, minProtein, maxCarbs, maxCalories]);

  const visibleFoods = useMemo(
    () => deferredFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [deferredFiltered, page],
  );

  // Page change: jump back to the top of the results list.
  const changePage = (next: number) => {
    setPage(next);
    requestAnimationFrame(() => {
      document.getElementById("results-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const categories: (FoodCategory | "all")[] = [
    "all",
    "protein",
    "carb",
    "fat",
    "vegetable",
    "fruit",
    "dairy",
    "nuts",
    "snack",
    "drink",
  ];

  const popularTags = ["high-protein", "low-carb", "keto-friendly", "vegan", "good-for-cutting", "good-for-bulking"];

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "مكتبة الأكلات" : "Food Library"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "ابحث عن الأكلات، شوف السعرات والماكروز، واحسب الجرامات اللي محتاجها."
              : "Search foods, see calories and macros, and calculate the grams you need."}
          </p>
        </div>

        {/* Search + Filters */}
        <div className="mt-10 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6e6e73]"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "ابحث عن أكلة..." : "Search foods..."}
              className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
            />
          </div>

          {/* Category pills — each shows a thumbnail image for that food category.
              Card-style: 80×80 image on top + label below, like a small tile.
              Uses conditional rendering (not display:none) for emoji fallback — better SEO + accessibility. */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <FoodCategoryPill
                key={cat}
                cat={cat}
                isActive={category === cat}
                isAr={isAr}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#6e6e73]">
              {isAr ? "تصفية:" : "Filter:"}
            </span>
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  activeTags.includes(tag)
                    ? "text-white"
                    : "bg-[#f5f5f7] text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
                style={
                  activeTags.includes(tag)
                    ? { backgroundColor: TAG_LABELS[tag]?.color || "#1d1d1f" }
                    : {}
                }
              >
                {isAr ? TAG_LABELS[tag]?.ar : TAG_LABELS[tag]?.en}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-normal text-[#0071e3] hover:opacity-70"
          >
            {isAr ? "فلاتر متقدمة (ماكروز)" : "Advanced filters (macros)"}
            {showAdvanced ? " ▲" : " ▼"}
          </button>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-[#f5f5f7] p-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  {isAr ? "حد أدنى للبروتين (g/100g)" : "Min protein (g/100g)"}
                </label>
                <input
                  type="number"
                  value={minProtein}
                  onChange={(e) => setMinProtein(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  {isAr ? "حد أقصى للكارب (g/100g)" : "Max carbs (g/100g)"}
                </label>
                <input
                  type="number"
                  value={maxCarbs}
                  onChange={(e) => setMaxCarbs(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e6e73]">
                  {isAr ? "حد أقصى للسعرات (kcal/100g)" : "Max calories (kcal/100g)"}
                </label>
                <input
                  type="number"
                  value={maxCalories}
                  onChange={(e) => setMaxCalories(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results count — anchor for scroll-back on page change */}
        <p id="results-top" className="mt-6 scroll-mt-24 text-sm font-normal text-[#6e6e73]">
          {deferredFiltered.length} {isAr ? "أكلة" : "foods"}
        </p>

        {/* Foods grid — uses visibleFoods (slice) instead of filtered (full 8,830) */}
        {deferredFiltered.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0071e3]/10">
              <SearchX className="h-8 w-8 text-[#0071e3]" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {isAr ? "لم نجد نتائج" : "No results found"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#6e6e73]">
              {isAr ? "جرّب تغيير الفلاتر أو البحث بكلمة مختلفة" : "Try adjusting your filters or search term"}
            </p>
            <button
              onClick={() => { setSearch(""); setCategory("all"); setActiveTags([]); setMinProtein(""); setMaxCarbs(""); setMaxCalories(""); }}
              className="mt-6 rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "إعادة ضبط الفلاتر" : "Reset filters"}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleFoods.map((food) => (
                <a
                  key={food.slug}
                  href={`/foods/${food.slug}`}
                  className="card-hover group rounded-3xl bg-[#f5f5f7]"
                >
                  {/* Content */}
                  <div className="p-3">
                    <span className="text-[10px] font-medium text-[#6e6e73]">
                      {isAr ? CATEGORY_LABELS[food.category].ar : CATEGORY_LABELS[food.category].en}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold tracking-tight">
                      {isAr ? food.nameAr : food.nameEn}
                    </h3>
                    {/* Macros per 100g */}
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-normal">
                      <div className="rounded bg-white px-1 py-0.5 text-center">
                        <span className="font-semibold text-[#0071e3]">{food.per100g.calories}</span>
                        <span className="text-[#6e6e73]"> kcal</span>
                      </div>
                      <div className="rounded bg-white px-1 py-0.5 text-center">
                        <span className="font-semibold text-[#34c759]">{food.per100g.protein}g</span>
                      </div>
                      <div className="rounded bg-white px-1 py-0.5 text-center">
                        <span className="font-semibold text-[#ff9500]">{food.per100g.carbs}g</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {/* DELIVERY 0050: shared pager (Phase 52 component) — 20 per page */}
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={deferredFiltered.length}
              onPageChange={changePage}
              isAr={isAr}
              className="mt-10"
            />
          </>
        )}

        {/* DELIVERY 0050: promotional sections at the bottom of the page */}
        <MembershipPromo isAr={isAr} />
        <ExploreMore isAr={isAr} exclude="foods" />
      </main>
    </div>
  );
}

// ─── Food category pill — uses conditional rendering (no display:none) ───
function FoodCategoryPill({
  cat,
  isActive,
  isAr,
  onClick,
}: {
  cat: FoodCategory | "all";
  isActive: boolean;
  isAr: boolean;
  onClick: () => void;
}) {
  const isAll = cat === "all";
  const label = isAll ? (isAr ? "الكل" : "All") : (isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en);
  return (
    <button
      onClick={onClick}
      className={`group flex w-20 flex-col items-center gap-2 rounded-2xl p-2 transition-all ${
        isActive
          ? "bg-[#1d1d1f] text-white ring-2 ring-[#0071e3] ring-offset-2"
          : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-white hover:text-[#1d1d1f] hover:ring-1 hover:ring-[#d2d2d7]"
      }`}
      aria-label={label}
      aria-pressed={isActive}
    >
      {isAll ? (
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0071e3] text-white text-sm font-bold">
          {isAr ? "الكل" : "All"}
        </span>
      ) : (
        <span className="relative block h-16 w-16">
          <ImageWithFallback
            src={CATEGORY_LABELS[cat].image}
            alt={label}
            fill
            className="rounded-xl object-cover ring-1 ring-black/5"
            fallbackElement={
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0071e3]/10 text-2xl">
                {CATEGORY_LABELS[cat].emoji}
              </span>
            }
          />
        </span>
      )}
      <span className="text-center text-[11px] font-medium leading-tight">
        {label}
      </span>
    </button>
  );
}
