import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExerciseBySlug, getRelatedExercises } from "@/lib/exercises";
import { getHowToSchema, getBreadcrumbSchema } from "@/lib/seo";
import { CATEGORY_LABELS, EQUIPMENT_LABELS, LEVEL_LABELS } from "@/lib/exercises";
import ExerciseDetailClient from "./ExerciseDetailClient";

/**
 * Server component for exercise detail page.
 *
 * C22 fix: previously this was a "use client" component, so it could
 * not export generateMetadata. All 868 exercise pages shared the
 * same generic title from exercises/layout.tsx. Now the server
 * component generates per-page metadata + JSON-LD schemas, then
 * renders the client component for interactivity.
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
      title: "Exercise Not Found — Musclehubeg",
      robots: { index: false, follow: false },
    };
  }

  const title = `${exercise.nameEn} — Proper Form & Instructions | Musclehubeg`;
  const description = `Learn how to perform ${exercise.nameEn} with proper form. Target muscles: ${exercise.primaryMuscles.join(", ")}. Equipment: ${EQUIPMENT_LABELS[exercise.equipment].en}. Level: ${LEVEL_LABELS[exercise.level].en}.`;
  const url = `https://musclehubeg.vercel.app/exercises/${exercise.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      // hreflang pair (2026-09-01): reciprocal declaration with the AR
      // mirror /ar/exercises/[slug] (which declares the same pair).
      languages: {
        en: url,
        ar: `https://musclehubeg.vercel.app/ar/exercises/${exercise.slug}`,
        "x-default": url,
      },
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Musclehubeg",
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export async function generateStaticParams() {
  // Pre-generate all 868 exercise slugs at build time for SSG
  const { EXERCISES } = await import("@/lib/exercises");
  return EXERCISES.map((ex) => ({ slug: ex.slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);

  // Generate JSON-LD schemas server-side so they're in the initial HTML
  const exerciseSchema = exercise
    ? getHowToSchema({
        name: exercise.nameEn,
        description: `Exercise for ${exercise.primaryMuscles.join(", ")} with ${exercise.equipment}`,
        steps: exercise.instructionsEn,
        tool: [exercise.equipment],
      })
    : null;

  const breadcrumbSchema = exercise
    ? getBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Exercises", url: "/exercises" },
        { name: exercise.nameEn, url: `/exercises/${exercise.slug}` },
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
      />
    </>
  );
}
