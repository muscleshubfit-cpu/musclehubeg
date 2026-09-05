import type { Metadata } from "next";
import { getExerciseBySlug, getRelatedExercises, EXERCISES, EQUIPMENT_LABELS, LEVEL_LABELS } from "@/lib/exercises";
import { getHowToSchema, getBreadcrumbSchema } from "@/lib/seo";
import ExerciseDetailClient from "@/app/exercises/[slug]/ExerciseDetailClient";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic mirror of /exercises/[slug] — SEO 404 FIX (2026-09-01).
 *
 * Previously /ar/exercises/<slug> returned a hard 404 while the Arabic
 * listing page (and the EN mirror) linked into it. This server component
 * resolves the SAME bilingual library row (src/lib/exercises.ts, 868
 * exercises with native nameAr/instructionsAr/tipsAr fields — the same
 * data layer that powers the EN pages; no separate Supabase fetch is
 * needed) and renders it fully in Arabic.
 *
 * Own Arabic metadata: canonical /ar/exercises/[slug] + hreflang pair +
 * og:locale ar_EG — the exact pattern of /ar/programs/[slug].
 * generateStaticParams pre-builds all 868 Arabic pages (SSG parity with
 * the EN route) so crawlers always get instant 200s.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);

  if (!exercise) {
    return {
      title: "التمرين غير موجود",
      robots: { index: false, follow: false },
    };
  }

  // NOTE: no "| Musclehubeg" suffix — the /ar layout title template appends
  // the brand automatically (avoids "— Musclehubeg — Musclehubeg").
  const title = `${exercise.nameAr} — طريقة الأداء الصحيحة والخطوات`;
  const description = `تعلّم كيف تؤدي تمرين ${exercise.nameAr} بأداء صحيح. العضلات المستهدفة: ${exercise.primaryMuscles.join("، ")}. المعدات: ${EQUIPMENT_LABELS[exercise.equipment].ar}. المستوى: ${LEVEL_LABELS[exercise.level].ar}.`;
  const url = `${SITE_URL}/ar/exercises/${exercise.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/ar/exercises/${exercise.slug}`,
      languages: {
        en: `${SITE_URL}/exercises/${exercise.slug}`,
        ar: url,
        "x-default": `${SITE_URL}/exercises/${exercise.slug}`,
      },
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Musclehubeg",
      locale: "ar_EG",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export async function generateStaticParams() {
  // SSG parity with /exercises/[slug]: pre-build all 868 Arabic pages.
  return EXERCISES.map((ex) => ({ slug: ex.slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);

  // JSON-LD in ARABIC — HowTo steps from instructionsAr + Arabic breadcrumb.
  const exerciseSchema = exercise
    ? getHowToSchema({
        name: exercise.nameAr,
        description: `تمرين للعضلات ${exercise.primaryMuscles.join("، ")} باستخدام ${EQUIPMENT_LABELS[exercise.equipment].ar}`,
        steps: exercise.instructionsAr,
        tool: [exercise.equipment],
      })
    : null;

  const breadcrumbSchema = exercise
    ? getBreadcrumbSchema([
        { name: "الرئيسية", url: "/ar" },
        { name: "التمارين", url: "/ar/exercises" },
        { name: exercise.nameAr, url: `/ar/exercises/${exercise.slug}` },
      ])
    : null;

  return (
    <>
      {exerciseSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(exerciseSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <ExerciseDetailClient
        exercise={exercise ?? null}
        slug={slug}
        related={exercise ? getRelatedExercises(exercise) : []}
        lang="ar"
      />
    </>
  );
}
