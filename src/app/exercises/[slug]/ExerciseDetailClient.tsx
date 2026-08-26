"use client";

import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import { getExerciseImages, getFallbackSVG } from "@/lib/exercise-images";
import {
  getRelatedExercises,
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  type Exercise,
} from "@/lib/exercises";
import { ArrowLeft, Dumbbell, Target, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Client component for exercise detail page.
 * Receives the exercise + slug as props from the server component
 * (which generates metadata + JSON-LD schemas server-side).
 */
export default function ExerciseDetailClient({
  exercise,
  slug,
}: {
  exercise: Exercise | null;
  slug: string;
}) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  if (!exercise) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <SiteHeader variant="landing" />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isAr ? "التمرين غير موجود" : "Exercise not found"}
          </h1>
          <a
            href="/exercises"
            className="mt-6 inline-block rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white"
          >
            {isAr ? "العودة للمكتبة" : "Back to library"}
          </a>
        </main>
      </div>
    );
  }

  const imgUrls = getExerciseImages(exercise.imageKey);
  const imgUrl = imgUrls[0] || null;
  const related = getRelatedExercises(exercise);
  const categoryLabel = isAr ? CATEGORY_LABELS[exercise.category].ar : CATEGORY_LABELS[exercise.category].en;
  const levelLabel = isAr ? LEVEL_LABELS[exercise.level].ar : LEVEL_LABELS[exercise.level].en;
  const equipmentLabel = isAr ? EQUIPMENT_LABELS[exercise.equipment].ar : EQUIPMENT_LABELS[exercise.equipment].en;

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Back link */}
        <a
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-normal text-[#0071e3] hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {isAr ? "كل التمارين" : "All exercises"}
        </a>

        {/* Header */}
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Images — show both (start + end position) */}
          <div className="overflow-hidden rounded-3xl bg-[#f5f5f7]">
            <div className="grid grid-cols-2 gap-1">
              {imgUrls.length > 0 ? (
                imgUrls.map((url, idx) => (
                  <div key={idx} className="aspect-square w-full">
                    <img
                      src={url}
                      alt={`${isAr ? exercise.nameAr : exercise.nameEn} — ${idx === 0 ? (isAr ? "البداية" : "Start") : (isAr ? "النهاية" : "End")}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackSVG(exercise.category);
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 aspect-square w-full">
                  <img
                    src={getFallbackSVG(exercise.category)}
                    alt={isAr ? exercise.nameAr : exercise.nameEn}
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>
            {/* Labels under images */}
            {imgUrls.length > 1 && (
              <div className="grid grid-cols-2 gap-1 px-2 pb-2 pt-1">
                <p className="text-center text-[10px] font-normal text-[#6e6e73]">{isAr ? "البداية" : "Start"}</p>
                <p className="text-center text-[10px] font-normal text-[#6e6e73]">{isAr ? "النهاية" : "End"}</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
                {categoryLabel}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${LEVEL_LABELS[exercise.level].color}15`,
                  color: LEVEL_LABELS[exercise.level].color,
                }}
              >
                {levelLabel}
              </span>
              <span className="rounded-full bg-[#6e6e73]/10 px-3 py-1 text-xs font-medium text-[#6e6e73]">
                {equipmentLabel}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {isAr ? exercise.nameAr : exercise.nameEn}
            </h1>
            <p className="mt-1 text-base font-normal text-[#6e6e73]" dir="ltr">
              {isAr ? exercise.nameEn : exercise.nameAr}
            </p>

            {/* Target muscles */}
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-[#0071e3]" />
                {isAr ? "العضلات المستهدفة" : "Target Muscles"}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {exercise.primaryMuscles.map((m, i) => (
                  <span key={i} className="rounded-lg bg-[#0071e3]/10 px-3 py-1 text-xs font-normal text-[#0071e3]">
                    {m}
                  </span>
                ))}
                {exercise.secondaryMuscles.map((m, i) => (
                  <span key={`s${i}`} className="rounded-lg bg-[#6e6e73]/10 px-3 py-1 text-xs font-normal text-[#6e6e73]">
                    {m}
                  </span>
                ))}
              </div>
              {exercise.secondaryMuscles.length > 0 && (
                <p className="mt-2 text-xs font-normal text-[#6e6e73]">
                  {isAr ? "الأزرق = أساسي · الرمادي = مساعد" : "Blue = primary · Gray = secondary"}
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="mt-8 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-4">
              <p className="text-sm font-normal text-[#1d1d1f]">
                {isAr
                  ? "عايز خطة تمارين مخصصة بناءً على مستواك وأهدافك؟"
                  : "Want a personalized workout plan based on your level and goals?"}
              </p>
              <a
                href="/memberships"
                className="mt-3 inline-block rounded-full bg-[#0071e3] px-5 py-2 text-xs font-normal text-white hover:opacity-90"
              >
                {isAr ? "احصل على خطة مخصصة ›" : "Get a personalized plan ›"}
              </a>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <section className="mt-10 rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Dumbbell className="h-5 w-5 text-[#0071e3]" />
            {isAr ? "خطوات التنفيذ" : "How to perform"}
          </h2>
          <ol className="mt-4 space-y-3">
            {(isAr ? exercise.instructionsAr : exercise.instructionsEn).map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0071e3] text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-base font-normal leading-relaxed text-[#1d1d1f]">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Tips */}
        <section className="mt-6 rounded-3xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-6 md:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <AlertCircle className="h-5 w-5 text-[#ff9500]" />
            {isAr ? "نصائح مهمة" : "Important tips"}
          </h2>
          <ul className="mt-4 space-y-2">
            {(isAr ? exercise.tipsAr : exercise.tipsEn).map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff9500]" />
                <p className="text-base font-normal leading-relaxed text-[#1d1d1f]">{tip}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Share buttons */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4">
          <p className="text-sm font-medium text-[#1d1d1f]">
            {isAr ? "شارك التمرين ده" : "Share this exercise"}
          </p>
          <ShareButtons
            title={isAr ? `${exercise.nameAr} | MuscleHubEG` : `${exercise.nameEn} | MuscleHubEG`}
            text={isAr ? exercise.instructionsAr[0] : exercise.instructionsEn[0]}
          />
        </div>

        {/* Related exercises */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              {isAr ? "تمارين مشابهة" : "Related exercises"}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((rel) => {
                const relImgUrls = getExerciseImages(rel.imageKey);
                const relImg = relImgUrls[0] || null;
                return (
                  <a
                    key={rel.slug}
                    href={`/exercises/${rel.slug}`}
                    className="group overflow-hidden rounded-2xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
                  >
                    <div className="aspect-square w-full bg-white">
                      {relImg ? (
                        <img
                          src={relImg}
                          alt={isAr ? rel.nameAr : rel.nameEn}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackSVG(rel.category);
                          }}
                        />
                      ) : (
                        <img
                          src={getFallbackSVG(rel.category)}
                          alt={isAr ? rel.nameAr : rel.nameEn}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold">{isAr ? rel.nameAr : rel.nameEn}</p>
                      <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                        {isAr ? LEVEL_LABELS[rel.level].ar : LEVEL_LABELS[rel.level].en}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
