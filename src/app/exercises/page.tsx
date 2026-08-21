"use client";

import { useState, useMemo } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { getExerciseImages, getFallbackSVG } from "@/lib/exercise-images";
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

export default function ExercisesPage({ lang: langProp }: { lang?: Lang } = {}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";

  const [category, setCategory] = useState<ExerciseCategory | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterExercises({ category, equipment, level, search }),
    [category, equipment, level, search],
  );

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

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-2 text-sm font-normal transition-all ${
                  category === cat
                    ? "bg-[#1d1d1f] text-white"
                    : "bg-[#f5f5f7] text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {cat === "all"
                  ? isAr ? "الكل" : "All"
                  : `${CATEGORY_LABELS[cat].emoji} ${isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}`}
              </button>
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

        {/* Results count */}
        <p className="mt-6 text-sm font-normal text-[#6e6e73]">
          {filtered.length} {isAr ? "تمرين" : "exercises"}
        </p>

        {/* Exercises grid */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <p className="text-base font-normal text-[#6e6e73]">
              {isAr ? "مفيش تمارين مطابقة لبحثك" : "No exercises match your search"}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((exercise) => {
              const imgUrls = getExerciseImages(exercise.imageKey);
              return (
                <a
                  key={exercise.slug}
                  href={`/exercises/${exercise.slug}`}
                  className="group overflow-hidden rounded-3xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
                >
                  {/* Images — show both side by side */}
                  <div className="aspect-[4/3] w-full overflow-hidden bg-white">
                    {imgUrls.length > 0 ? (
                      <div className="grid h-full grid-cols-2 gap-0.5">
                        {imgUrls.slice(0, 2).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`${isAr ? exercise.nameAr : exercise.nameEn} ${idx + 1}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getFallbackSVG(exercise.category);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <img
                        src={getFallbackSVG(exercise.category)}
                        alt={isAr ? exercise.nameAr : exercise.nameEn}
                        className="h-full w-full object-contain"
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
        )}
      </main>
    </div>
  );
}
