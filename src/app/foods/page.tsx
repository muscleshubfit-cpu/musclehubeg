"use client";

import { useState, useMemo, useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import {
  FOODS,
  CATEGORY_LABELS,
  TAG_LABELS,
  filterFoods,
  type FoodCategory,
} from "@/lib/foods";

// Page size for incremental rendering. Rendering 8,830 food cards at once
// crashes the browser (white screen + tab unresponsive). We render the
// first PAGE_SIZE results immediately, then load more on scroll / button click.
const PAGE_SIZE = 60;

export default function FoodsPage({ lang: langProp }: { lang?: Lang } = {}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FoodCategory | "all">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [minProtein, setMinProtein] = useState<string>("");
  const [maxCarbs, setMaxCarbs] = useState<string>("");
  const [maxCalories, setMaxCalories] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Visible count — incrementally render the filtered foods to avoid
  // rendering 8,830 cards at once (which crashes the browser).
  // Reset to PAGE_SIZE whenever filters change.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  // Reset visible count when filters change (so user sees fresh results from the top).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category, activeTags, minProtein, maxCarbs, maxCalories]);

  const visibleFoods = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Infinite-scroll: load more when user scrolls near the bottom.
  useEffect(() => {
    if (!hasMore) return;
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 800;
      if (nearBottom) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore, filtered.length]);

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

          {/* Category pills — each shows a thumbnail image for that food category (Unsplash).
              Card-style: 80×80 image on top + label below, like a small tile. */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => {
              const isAll = cat === "all";
              const isActive = category === cat;
              const label = isAll ? (isAr ? "الكل" : "All") : (isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en);
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
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
                    <img
                      src={CATEGORY_LABELS[cat].image}
                      alt={label}
                      loading="lazy"
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const fallback = (e.target as HTMLImageElement).nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = "flex";
                      }}
                    />
                  )}
                  {!isAll && (
                    <span style={{ display: "none" }} className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0071e3]/10 text-2xl">
                      {CATEGORY_LABELS[cat].emoji}
                    </span>
                  )}
                  <span className="text-center text-[11px] font-medium leading-tight">
                    {label}
                  </span>
                </button>
              );
            })}
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

        {/* Results count */}
        <p className="mt-6 text-sm font-normal text-[#6e6e73]">
          {filtered.length} {isAr ? "أكلة" : "foods"}
        </p>

        {/* Foods grid — uses visibleFoods (slice) instead of filtered (full 8,830) */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <p className="text-base font-normal text-[#6e6e73]">
              {isAr ? "مفيش أكلات مطابقة لبحثك" : "No foods match your search"}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleFoods.map((food) => (
                <a
                  key={food.slug}
                  href={`/foods/${food.slug}`}
                  className="group rounded-3xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
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
            {/* Load more — manual fallback for infinite scroll (mobile users, slow connections, etc.) */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length))}
                  className="rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90"
                >
                  {isAr
                    ? `عرض المزيد (${visibleCount.toLocaleString()} من ${filtered.length.toLocaleString()})`
                    : `Load more (${visibleCount.toLocaleString()} of ${filtered.length.toLocaleString()})`}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
