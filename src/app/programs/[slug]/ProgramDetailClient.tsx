"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  getRelatedPrograms,
  LOCATION_LABELS,
  LEVEL_LABELS,
  GOAL_LABELS,
  type WorkoutProgram,
} from "@/lib/workout-programs";
import { getExerciseImages, getFallbackSVG } from "@/lib/exercise-images";
import { EXERCISES } from "@/lib/exercises";
import { ArrowLeft, Clock, Calendar, Dumbbell, Coffee } from "lucide-react";

/**
 * Client component for program detail page.
 * Receives the program as a prop from the server component
 * (which generates metadata + JSON-LD schemas server-side).
 */
export default function ProgramDetailClient({ program }: { program: WorkoutProgram | null }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [activeDay, setActiveDay] = useState(0);

  if (!program) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <SiteHeader variant="landing" />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isAr ? "البرنامج غير موجود" : "Program not found"}
          </h1>
          <a
            href="/programs"
            className="mt-6 inline-block rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white"
          >
            {isAr ? "العودة للبرامج" : "Back to programs"}
          </a>
        </main>
      </div>
    );
  }

  const related = getRelatedPrograms(program);
  const locationLabel = isAr ? LOCATION_LABELS[program.location].ar : LOCATION_LABELS[program.location].en;
  const levelLabel = isAr ? LEVEL_LABELS[program.level].ar : LEVEL_LABELS[program.level].en;
  const goalLabel = isAr ? GOAL_LABELS[program.goal].ar : GOAL_LABELS[program.goal].en;
  const shareTitle = isAr ? program.nameAr : program.nameEn;
  const shareText = isAr ? program.descriptionAr : program.descriptionEn;

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Back link */}
        <a
          href="/programs"
          className="inline-flex items-center gap-1.5 text-sm font-normal text-[#0071e3] hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {isAr ? "كل البرامج" : "All programs"}
        </a>

        {/* Header */}
        <div className="mt-6 overflow-hidden rounded-3xl bg-[#f5f5f7]">
          <div className="aspect-[16/9] w-full">
            <img
              src={program.image}
              alt={isAr ? program.imageAltAr : program.imageAltEn}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
                {LOCATION_LABELS[program.location].emoji} {locationLabel}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${LEVEL_LABELS[program.level].color}15`,
                  color: LEVEL_LABELS[program.level].color,
                }}
              >
                {levelLabel}
              </span>
              <span className="rounded-full bg-[#6e6e73]/10 px-3 py-1 text-xs font-medium text-[#6e6e73]">
                {goalLabel}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {isAr ? program.nameAr : program.nameEn}
            </h1>
            <p className="mt-2 text-base font-normal text-[#6e6e73]" dir="auto">
              {isAr ? program.descriptionEn : program.descriptionAr}
            </p>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#0071e3]" />
                  <span className="text-xs font-medium text-[#6e6e73]">
                    {isAr ? "المدة" : "Duration"}
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {program.durationWeeks} {isAr ? "أسابيع" : "weeks"}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0071e3]" />
                  <span className="text-xs font-medium text-[#6e6e73]">
                    {isAr ? "التكرار" : "Frequency"}
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {program.daysPerWeek} {isAr ? "أيام/أسبوع" : "days/week"}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-white p-4 sm:col-span-1">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-[#0071e3]" />
                  <span className="text-xs font-medium text-[#6e6e73]">
                    {isAr ? "الهدف" : "Goal"}
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold">{goalLabel}</p>
              </div>
            </div>

            {/* Share buttons */}
            <div className="mt-6">
              <ShareButtons title={shareTitle} text={shareText} />
            </div>
          </div>
        </div>

        {/* Weekly schedule */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {isAr ? "الجدول الأسبوعي" : "Weekly Schedule"}
          </h2>
          <div className="mt-4 space-y-4">
            {program.days.map((day) => (
              <div
                key={day.day}
                className={`rounded-3xl p-6 ${
                  day.isRest ? "bg-[#ff9500]/5 border border-[#ff9500]/20" : "bg-[#f5f5f7]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                      {day.day}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">
                        {isAr ? day.titleAr : day.titleEn}
                      </h3>
                      {day.isRest && (
                        <p className="text-xs font-normal text-[#ff9500]">
                          {isAr ? "يوم راحة — استرح أو امشي" : "Rest day — relax or walk"}
                        </p>
                      )}
                    </div>
                  </div>
                  {!day.isRest && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6e6e73]">
                      {day.exercises.length} {isAr ? "تمارين" : "exercises"}
                    </span>
                  )}
                </div>

                {/* Exercises list */}
                {!day.isRest && (
                  <div className="mt-4 space-y-2">
                    {day.exercises.map((ex, i) => {
                      // Try to find the exercise in our DB to get its image
                      const exerciseData = EXERCISES.find((e) => e.slug === ex.exerciseSlug);
                      const imgUrls = exerciseData ? getExerciseImages(exerciseData.imageKey) : [];
                      return (
                        <a
                          key={i}
                          href={`/exercises/${ex.exerciseSlug}`}
                          className="block overflow-hidden rounded-2xl bg-white transition-colors hover:bg-[#fafafa]"
                        >
                          {/* Exercise image — ABOVE the text, full width */}
                          {imgUrls.length > 0 && (
                            <div className="flex h-24 w-full items-center justify-center gap-1 bg-[#f5f5f7]">
                              {imgUrls.slice(0, 2).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`${isAr ? ex.nameAr : ex.nameEn} ${idx + 1}`}
                                  className="h-full w-1/2 object-contain"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getFallbackSVG(exerciseData?.category || "default");
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {/* Exercise info — below the image */}
                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {isAr ? ex.nameAr : ex.nameEn}
                              </p>
                              <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                                {ex.sets} × {ex.reps}
                              </p>
                            </div>
                            {/* Rest */}
                            <div className="shrink-0 text-end">
                              <p className="text-xs font-normal text-[#6e6e73]">
                                {isAr ? "راحة" : "Rest"}
                              </p>
                              <p className="text-xs font-medium" dir="ltr">
                                {isAr ? ex.restAr : ex.restEn}
                              </p>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}

                {day.isRest && (
                  <div className="mt-3 flex items-center gap-2 text-[#ff9500]">
                    <Coffee className="h-4 w-4" />
                    <p className="text-sm font-normal">
                      {isAr ? "خد راحة، الجسم بيحتاجها للتعافي" : "Take a rest — your body needs it to recover"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 rounded-3xl bg-[#f5f5f7] p-6 text-center text-[#1d1d1f] md:p-8">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {isAr ? "عايز خطة مخصصة ليك؟" : "Want a personalized plan?"}
          </h2>
          <p className="mt-2 text-sm font-normal text-gray-300">
            {isAr
              ? "منصة MuscleHubEG بتعمل خطط مخصصة بناءً على أهدافك ومستواك."
              : "MuscleHubEG creates personalized plans based on your goals and level."}
          </p>
          <a
            href="/memberships"
            className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
          >
            {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
          </a>
        </section>

        {/* Related programs */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "برامج مشابهة" : "Related programs"}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((rel) => (
                <a
                  key={rel.slug}
                  href={`/programs/${rel.slug}`}
                  className="group overflow-hidden rounded-2xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
                >
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={rel.image}
                      alt={isAr ? rel.imageAltAr : rel.imageAltEn}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold">{isAr ? rel.nameAr : rel.nameEn}</p>
                    <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                      {isAr ? LEVEL_LABELS[rel.level].ar : LEVEL_LABELS[rel.level].en} · {rel.durationWeeks} {isAr ? "أسابيع" : "wks"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
