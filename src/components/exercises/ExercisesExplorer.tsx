import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchX } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { ServerPagination } from "@/components/ServerPagination";
import { MembershipPromo, ExploreMore } from "@/components/PageBottomPromo";
import { ExercisesFilters } from "@/components/exercises/ExercisesFilters";
import {
  buildExercisesHref,
  type ExercisesQuery,
} from "@/components/exercises/url";
import {
  getExerciseImages,
  getFallbackSVG,
  getExerciseImageUrl,
} from "@/lib/exercise-images";
import { filterExercises } from "@/lib/exercises";
import {
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  EXERCISES_COUNT,
  type ExerciseCategory,
  type Equipment,
  type Level,
} from "@/lib/exercises-shared";

/**
 * SERVER-RENDERED exercises explorer (performance audit 2026-09-05).
 *
 * Previously a client component importing the 868-exercise / 1.6MB
 * array. Now the grid renders server-side from URL search params; the
 * array stays on the server; category pills + pagination are links;
 * only search + equipment/level selects are a small client island.
 */

const PAGE_SIZE = 20;

const CATEGORIES: (ExerciseCategory | "all")[] = [
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

export function ExercisesExplorer({
  lang,
  query,
}: {
  lang: "en" | "ar";
  query: ExercisesQuery;
}) {
  const isAr = lang === "ar";
  const base = isAr ? "/ar/exercises" : "/exercises";

  const filtered = filterExercises({
    // parseExercisesQuery validates values against their sets — casts are safe.
    category: query.cat as ExerciseCategory | "all",
    equipment: query.eq as Equipment | "all",
    level: query.lv as Level | "all",
    search: query.q,
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const visibleExercises = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters =
    query.cat !== "all" || query.eq !== "all" || query.lv !== "all" || query.q !== "";

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
          <p className="mt-2 text-sm font-normal text-[#86868b]">
            {EXERCISES_COUNT.toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
            {isAr ? "تمرين" : "exercises"}
          </p>
        </div>

        {/* Search + Filters */}
        <div className="mt-10 space-y-4">
          <ExercisesFilters lang={lang} query={query} base={base} />

          {/* Category pills — plain links, crawlable, zero-JS */}
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <ExerciseCategoryPill
                key={cat}
                cat={cat}
                isActive={query.cat === cat}
                isAr={isAr}
                href={
                  query.cat === cat
                    ? buildExercisesHref(base, query, { cat: "all", page: 1 })
                    : buildExercisesHref(base, query, { cat, page: 1 })
                }
              />
            ))}
          </div>
        </div>

        {/* Results count — anchor for scroll-back on page change */}
        <p id="results-top" className="mt-6 scroll-mt-24 text-sm font-normal text-[#6e6e73]">
          {filtered.length.toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
          {isAr ? "تمرين" : "exercises"}
        </p>

        {/* Exercises grid — server-rendered */}
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
            {hasFilters && (
              <Link
                href={base}
                className="mt-6 inline-block rounded-full bg-[#1d1d1f] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "إعادة ضبط الفلاتر" : "Reset filters"}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleExercises.map((exercise) => {
                const imgUrls = getExerciseImages(exercise.imageKey);
                return (
                  <a
                    key={exercise.slug}
                    href={`${base}/${exercise.slug}`}
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
            <ServerPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              isAr={isAr}
              buildHref={(n) => buildExercisesHref(base, query, { page: n })}
              className="mt-10"
            />
          </>
        )}

        {/* Promotional sections */}
        <MembershipPromo isAr={isAr} />
        <ExploreMore isAr={isAr} exclude="exercises" />
      </main>
    </div>
  );
}

// ─── Exercise category pill — link version of the old button ───
function ExerciseCategoryPill({
  cat,
  isActive,
  isAr,
  href,
}: {
  cat: ExerciseCategory | "all";
  isActive: boolean;
  isAr: boolean;
  href: string;
}) {
  const isAll = cat === "all";
  const label = isAll ? (isAr ? "الكل" : "All") : (isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en);
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? "true" : undefined}
      className={`group flex w-20 flex-col items-center gap-2 rounded-2xl p-2 transition-all ${
        isActive
          ? "bg-[#1d1d1f] text-white ring-2 ring-[#0071e3] ring-offset-2"
          : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-white hover:text-[#1d1d1f] hover:ring-1 hover:ring-[#d2d2d7]"
      }`}
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
    </Link>
  );
}
