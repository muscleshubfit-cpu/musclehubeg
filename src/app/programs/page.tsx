"use client";

import { useState, useMemo } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import {
  WORKOUT_PROGRAMS,
  LOCATION_LABELS,
  LEVEL_LABELS,
  GOAL_LABELS,
  filterPrograms,
  type ProgramLocation,
  type ProgramLevel,
  type ProgramGoal,
} from "@/lib/workout-programs";
import Image from "next/image";

/**
 * Workout programs grid — /programs (canonical EN) + /ar/programs mirror.
 * Accepts an optional `lang` prop: the /ar mirror passes lang="ar" to
 * force Arabic rendering (same pattern as ExercisesPage), otherwise the
 * page follows the user's toggle preference.
 */
export default function ProgramsPage({ lang: langProp }: { lang?: Lang } = {}) {
  const { lang: ctxLang } = useI18n();
  const lang = langProp ?? ctxLang;
  const isAr = lang === "ar";

  const [location, setLocation] = useState<ProgramLocation | "all">("all");
  const [level, setLevel] = useState<ProgramLevel | "all">("all");
  const [goal, setGoal] = useState<ProgramGoal | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterPrograms({ location, level, goal, search }),
    [location, level, goal, search],
  );

  const locations: (ProgramLocation | "all")[] = ["all", "home", "home-equipment", "gym"];
  const levels: (ProgramLevel | "all")[] = ["all", "beginner", "intermediate", "advanced"];
  const goals: (ProgramGoal | "all")[] = ["all", "general", "strength", "hypertrophy", "fat-loss", "endurance"];
  // Card links stay inside the current language's URL space (AR mirror keeps
  // users on /ar/programs/[slug] instead of bouncing to the EN canonical).
  const base = isAr ? "/ar/programs" : "/programs";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {isAr ? "برامج التدريب" : "Workout Programs"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr
              ? "برامج تدريبية جاهزة لكل المستويات والأهداف — منزل، جيم، أو معدات بسيطة."
              : "Ready-to-use training programs for all levels and goals — home, gym, or minimal equipment."}
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
              placeholder={isAr ? "ابحث عن برنامج..." : "Search programs..."}
              className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
            />
          </div>

          {/* Location pills */}
          <div>
            <p className="mb-2 text-xs font-medium text-[#6e6e73]">
              {isAr ? "مكان التمرين" : "Workout Location"}
            </p>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className={`rounded-full px-4 py-2 text-sm font-normal transition-all ${
                    location === loc
                      ? "bg-[#1d1d1f] text-white"
                      : "bg-[#f5f5f7] text-[#6e6e73] hover:text-[#1d1d1f]"
                  }`}
                >
                  {loc === "all"
                    ? isAr ? "الكل" : "All"
                    : `${LOCATION_LABELS[loc].emoji} ${isAr ? LOCATION_LABELS[loc].ar : LOCATION_LABELS[loc].en}`}
                </button>
              ))}
            </div>
          </div>

          {/* Level + Goal filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                {isAr ? "المستوى" : "Level"}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProgramLevel | "all")}
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
              >
                {levels.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv === "all"
                      ? isAr ? "كل المستويات" : "All levels"
                      : isAr ? LEVEL_LABELS[lv].ar : LEVEL_LABELS[lv].en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                {isAr ? "الهدف" : "Goal"}
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as ProgramGoal | "all")}
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0071e3]"
              >
                {goals.map((g) => (
                  <option key={g} value={g}>
                    {g === "all"
                      ? isAr ? "كل الأهداف" : "All goals"
                      : isAr ? GOAL_LABELS[g].ar : GOAL_LABELS[g].en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="mt-6 text-sm font-normal text-[#6e6e73]">
          {filtered.length} {isAr ? "برنامج" : "programs"}
        </p>

        {/* Programs grid */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-[#f5f5f7] p-12 text-center">
            <p className="text-base font-normal text-[#6e6e73]">
              {isAr ? "مفيش برامج مطابقة لبحثك" : "No programs match your search"}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((program) => (
              <a
                key={program.slug}
                href={`${base}/${program.slug}`}
                className="group overflow-hidden rounded-3xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
                  <Image
                    src={program.image}
                    alt={isAr ? program.imageAltAr : program.imageAltEn}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                {/* Content */}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071e3]">
                      {LOCATION_LABELS[program.location].emoji} {isAr ? LOCATION_LABELS[program.location].ar : LOCATION_LABELS[program.location].en}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${LEVEL_LABELS[program.level].color}15`,
                        color: LEVEL_LABELS[program.level].color,
                      }}
                    >
                      {isAr ? LEVEL_LABELS[program.level].ar : LEVEL_LABELS[program.level].en}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">
                    {isAr ? program.nameAr : program.nameEn}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs font-normal text-[#6e6e73]">
                    {isAr ? program.descriptionAr : program.descriptionEn}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs font-normal text-[#6e6e73]">
                    <span>{program.durationWeeks} {isAr ? "أسابيع" : "weeks"}</span>
                    <span>·</span>
                    <span>{program.daysPerWeek} {isAr ? "أيام/أسبوع" : "days/week"}</span>
                  </div>
                  <p className="mt-3 text-sm font-normal text-[#0071e3]">
                    {isAr ? "اعرف أكثر ›" : "Learn more ›"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
