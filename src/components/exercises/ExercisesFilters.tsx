"use client";

/**
 * Interactive filter inputs for the server-rendered exercises list.
 *
 * Owns ONLY the search input (debounced) and the equipment/level
 * selects (navigate on change). Category pills are plain links
 * rendered server-side.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildExercisesHref,
  type ExercisesQuery,
} from "@/components/exercises/url";
import {
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  type Equipment,
  type Level,
} from "@/lib/exercises-shared";

const EQUIPMENT_OPTIONS: (Equipment | "all")[] = [
  "all",
  "barbell",
  "dumbbell",
  "bodyweight",
  "cable",
  "machine",
  "kettlebell",
  "none",
];

const LEVEL_OPTIONS: (Level | "all")[] = ["all", "beginner", "intermediate", "advanced"];

export function ExercisesFilters({
  lang,
  query,
  base,
}: {
  lang: "en" | "ar";
  query: ExercisesQuery;
  base: string;
}) {
  const isAr = lang === "ar";
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  useEffect(() => {
    setSearch(query.q);
  }, [query.q]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const href = buildExercisesHref(base, { ...query, q: search, page: 1 });
      if (href !== window.location.pathname + window.location.search) {
        router.replace(href, { scroll: false });
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  const goto = (over: Partial<ExercisesQuery>) => {
    router.replace(buildExercisesHref(base, { ...query, ...over, page: 1 }), {
      scroll: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6e6e73]"
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
          placeholder={isAr ? "ابحث عن تمرين..." : "Search exercises..."}
          aria-label={isAr ? "ابحث في مكتبة التمارين" : "Search the exercise library"}
          className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
        />
      </div>

      {/* Equipment + Level filters — navigate on change */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="exercise-equipment" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
            {isAr ? "المعدات" : "Equipment"}
          </label>
          <select
            id="exercise-equipment"
            value={query.eq}
            onChange={(e) => goto({ eq: e.target.value })}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
          >
            {EQUIPMENT_OPTIONS.map((eq) => (
              <option key={eq} value={eq}>
                {eq === "all"
                  ? isAr ? "كل المعدات" : "All equipment"
                  : isAr ? EQUIPMENT_LABELS[eq].ar : EQUIPMENT_LABELS[eq].en}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="exercise-level" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
            {isAr ? "المستوى" : "Level"}
          </label>
          <select
            id="exercise-level"
            value={query.lv}
            onChange={(e) => goto({ lv: e.target.value })}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
          >
            {LEVEL_OPTIONS.map((lv) => (
              <option key={lv} value={lv}>
                {lv === "all"
                  ? isAr ? "كل المستويات" : "All levels"
                  : isAr ? LEVEL_LABELS[lv].ar : LEVEL_LABELS[lv].en}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
