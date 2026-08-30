"use client";

import { useState, useMemo, useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { getExerciseImages, getFallbackSVG, getExerciseImageUrl } from "@/lib/exercise-images";
import { SearchX } from "lucide-react";
import Image from "next/image";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Pagination } from "@/components/Pagination";
import { MembershipPromo, ExploreMore } from "@/components/PageBottomPromo";
import {
  EXERCISES,
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  filterExercises,
  type ExerciseCategory,
  type Equipment,
  type Level,
} from "@/lib/exercises";

// DELIVERY 0050: true pagination — owner asked for 20 exercises per page
// with navigation buttons (replaces infinite scroll / load-more).
const PAGE_SIZE = 20;

export default function ExercisesPage({ lang: langProp }: { lang?: Lang } = {}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";

  const [category, setCategory] = useState<ExerciseCategory | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [search, setSearch] = useState("");

  // Current page (1-based) — true pagination, 20 cards per page.
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => filterExercises({ category, equipment, level, search }),
    [category, equipment, level, search],
  );

  // Reset to the first page whenever filters change (fresh results from top).
  useEffect(() => {
    setPage(1);
  }, [category, equipment, level, search]);

  const visibleExercises = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // Page change: jump back to the top of the results list.
  const changePage = (next: number) => {
    setPage(next);
    // Scroll the results header into view so the user sees the new page start.
    requestAnimationFrame(() => {
      document.getElementById("results-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const categories: (ExerciseCategory | "all")[] = [
    "all",
    "chest",
    "back",
    "shoulders",
    "legs",
    "biceps",
    "triceps",
    "core",
    "cardio",
  ];

  const equipmentOptions: (Equipment | "all")[] = [
    "all",
    "barbell",
    "dumbbell",
    "bodyweight",
    "cable",
    "machine",
    "kettlebell",
    "none",
  ];

  const levelOptions: (Level | "all")[] = ["all", "beginner", "intermediate", "advanced"];

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "مكتبة التمارين" : "Exercise Library"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "تصفّح تمارين احترافية مع شرح كامل، عضلات مستهدفة، ومستوى الصعوبة."
              : "Browse professional exercises with full instructions, target muscles, and difficulty levels."}
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
              placeholder={isAr ? "ابحث عن تمرين..." : "Search exercises..."}
              className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
            />
          </div>

          {/* Category pills — card-style with 64×64 thumbnail image on top + label below.
              Each card represents a category using a representative exercise image from the library.
              Uses conditional rendering (not display:none) for emoji fallback — better SEO + accessibility. */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <ExerciseCategoryPill
                key={cat}
                cat={cat}
                isActive={category === cat}
                isAr={isAr}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>

          {/* Equipment + Level filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                {isAr ? "المعدات" : "Equipment"}
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value as Equipment | "all")}
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq === "all"
                      ? isAr ? "كل المعدات" : "All equipment"
                      : isAr ? EQUIPMENT_LABELS[eq].ar : EQUIPMENT_LABELS[eq].en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                {isAr ? "المستوى" : "Level"}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level | "all")}
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
              >
                {levelOptions.map((lv) => (
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

        {/* Results count — anchor for scroll-back on page change */}
        <p id="results-top" className="mt-6 scroll-mt-24 text-sm font-normal text-[#6e6e73]">
          {filtered.length} {isAr ? "تمرين" : "exercises"}
        </p>

        {/* Exercises grid — uses visibleExercises (slice) instead of filtered (full 868) */}
        {filtered.length === 0 ? (
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
              onClick={() => { setSearch(""); setCategory("all"); setEquipment("all"); setLevel("all"); }}
              className="mt-6 rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "إعادة ضبط الفلاتر" : "Reset filters"}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleExercises.map((exercise) => {
                const imgUrls = getExerciseImages(exercise.imageKey);
                return (
                  <a
                    key={exercise.slug}
                    href={`/exercises/${exercise.slug}`}
                    className="card-hover group overflow-hidden rounded-3xl bg-[#f5f5f7]"
                  >
                    {/* Images — show both side by side */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
                      {imgUrls.length > 0 ? (
                        <div className="grid h-full grid-cols-2 gap-0.5">
                          {imgUrls.slice(0, 2).map((url, idx) => (
                            <div key={idx} className="relative">
                              <ImageWithFallback
                                src={url}
                                alt={`${isAr ? exercise.nameAr : exercise.nameEn} ${idx + 1}`}
                                fill
                                className="object-contain"
                                fallbackSrc={getFallbackSVG(exercise.category)}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Image
                          src={getFallbackSVG(exercise.category)}
                          alt={isAr ? exercise.nameAr : exercise.nameEn}
                          fill
                          className="object-contain"
                        />
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071e3]">
                          {isAr ? CATEGORY_LABELS[exercise.category].ar : CATEGORY_LABELS[exercise.category].en}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${LEVEL_LABELS[exercise.level].color}15`,
                            color: LEVEL_LABELS[exercise.level].color,
                          }}
                        >
                          {isAr ? LEVEL_LABELS[exercise.level].ar : LEVEL_LABELS[exercise.level].en}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight">
                        {isAr ? exercise.nameAr : exercise.nameEn}
                      </h3>
                      <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                        {isAr ? "المعدات: " : "Equipment: "}
                        {isAr ? EQUIPMENT_LABELS[exercise.equipment].ar : EQUIPMENT_LABELS[exercise.equipment].en}
                      </p>
                      <p className="mt-3 text-sm font-normal text-[#0071e3]">
                        {isAr ? "اعرف أكثر ›" : "Learn more ›"}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
            {/* DELIVERY 0050: shared pager (Phase 52 component) — 20 per page */}
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={changePage}
              isAr={isAr}
              className="mt-10"
            />
          </>
        )}

        {/* DELIVERY 0050: promotional sections at the bottom of the page */}
        <MembershipPromo isAr={isAr} />
        <ExploreMore isAr={isAr} exclude="exercises" />
      </main>
    </div>
  );
}

// ─── Exercise category pill — uses conditional rendering (no display:none) ───
function ExerciseCategoryPill({
  cat,
  isActive,
  isAr,
  onClick,
}: {
  cat: ExerciseCategory | "all";
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
            src={getExerciseImageUrl(CATEGORY_LABELS[cat].image)}
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
