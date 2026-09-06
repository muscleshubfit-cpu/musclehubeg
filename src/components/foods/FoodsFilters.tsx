"use client";

/**
 * Interactive filter inputs for the server-rendered foods list.
 *
 * The heavy grid is rendered SERVER-SIDE; this tiny client component
 * owns ONLY the free-text inputs (search + advanced macros) and syncs
 * them into the URL (debounced 400ms) so the server re-renders the
 * filtered grid. Category pills and tag toggles are plain links —
 * no JavaScript needed for them. The advanced panel uses <details>
 * (zero-JS disclosure).
 *
 * Props mirror the current URL state so React re-initializes the
 * inputs when navigation changes them (e.g. back/forward, tag toggles).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildFoodsHref, type FoodsQuery } from "@/components/foods/url";

export function FoodsFilters({
  lang,
  query,
  base,
}: {
  lang: "en" | "ar";
  query: FoodsQuery;
  base: string;
}) {
  const isAr = lang === "ar";
  const router = useRouter();

  const [search, setSearch] = useState(query.q);
  const [minProtein, setMinProtein] = useState(query.minp);
  const [maxCarbs, setMaxCarbs] = useState(query.maxc);
  const [maxCalories, setMaxCalories] = useState(query.maxcal);

  // Re-sync local input state when the URL changes externally
  // (tag/category navigation resets page, but inputs should reflect URL).
  useEffect(() => {
    setSearch(query.q);
    setMinProtein(query.minp);
    setMaxCarbs(query.maxc);
    setMaxCalories(query.maxcal);
  }, [query.q, query.minp, query.maxc, query.maxcal]);

  // Debounced URL sync — one navigation per burst of typing.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next: FoodsQuery = {
        ...query,
        q: search,
        minp: minProtein,
        maxc: maxCarbs,
        maxcal: maxCalories,
        page: 1, // any input change restarts from the first page
      };
      const href = buildFoodsHref(base, next);
      if (href !== window.location.pathname + window.location.search) {
        router.replace(href, { scroll: false });
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search, minProtein, maxCarbs, maxCalories]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? "ابحث عن أكلة..." : "Search foods..."}
          aria-label={isAr ? "ابحث في مكتبة الأكلات" : "Search the food library"}
          className="w-full rounded-full border border-[var(--edge)] bg-[var(--tint)] ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[var(--chrome-edge)]"
        />
      </div>

      {/* Advanced filters — <details> keeps this zero-JS until opened */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text)] hover:opacity-70 [&::-webkit-details-marker]:hidden">
          {isAr ? "فلاتر متقدمة (ماكروز)" : "Advanced filters (macros)"}
          <span className="ms-1 inline-block group-open:hidden">▼</span>
          <span className="ms-1 hidden group-open:inline">▲</span>
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-[var(--tint)] p-4 border border-[var(--edge)] sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]" htmlFor="food-min-protein">
              {isAr ? "حد أدنى للبروتين (g/100g)" : "Min protein (g/100g)"}
            </label>
            <input
              id="food-min-protein"
              type="number"
              inputMode="decimal"
              value={minProtein}
              onChange={(e) => setMinProtein(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-[var(--edge)] bg-[var(--card)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--chrome-edge)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]" htmlFor="food-max-carbs">
              {isAr ? "حد أقصى للكارب (g/100g)" : "Max carbs (g/100g)"}
            </label>
            <input
              id="food-max-carbs"
              type="number"
              inputMode="decimal"
              value={maxCarbs}
              onChange={(e) => setMaxCarbs(e.target.value)}
              placeholder="100"
              className="w-full rounded-lg border border-[var(--edge)] bg-[var(--card)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--chrome-edge)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]" htmlFor="food-max-calories">
              {isAr ? "حد أقصى للسعرات (kcal/100g)" : "Max calories (kcal/100g)"}
            </label>
            <input
              id="food-max-calories"
              type="number"
              inputMode="decimal"
              value={maxCalories}
              onChange={(e) => setMaxCalories(e.target.value)}
              placeholder="500"
              className="w-full rounded-lg border border-[var(--edge)] bg-[var(--card)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--chrome-edge)]"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
