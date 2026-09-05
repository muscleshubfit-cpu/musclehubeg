import type { Metadata } from "next";
import { getProgramBySlug, WORKOUT_PROGRAMS } from "@/lib/workout-programs";
import { getExerciseMinisBySlugs } from "@/lib/exercises";
import { getBreadcrumbSchema } from "@/lib/seo";
import ProgramDetailClient from "@/app/programs/[slug]/ProgramDetailClient";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic mirror of /programs/[slug].
 *
 * Own Arabic metadata (canonical /ar/programs/[slug] + hreflang pair) and
 * renders the SAME ProgramDetailClient with lang="ar" forced — identical
 * training content, forced Arabic, RTL via src/app/ar/layout.tsx.
 * Same pattern as the /ar/blog/[slug] mirror.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = getProgramBySlug(slug);

  if (!program) {
    return {
      title: "البرنامج غير موجود — Alkemos",
      robots: { index: false, follow: false },
    };
  }

  const title = `${program.nameAr} — برنامج تدريب | Alkemos`;
  const description = `${program.nameAr}: ${program.descriptionAr}`;
  const url = `${SITE_URL}/ar/programs/${program.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/ar/programs/${program.slug}`,
      languages: {
        en: `${SITE_URL}/programs/${program.slug}`,
        ar: url,
        "x-default": `${SITE_URL}/programs/${program.slug}`,
      },
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: program.image, width: 1200, height: 630 }],
      siteName: "Alkemos",
      locale: "ar_EG",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [program.image],
    },
  };
}

export function generateStaticParams() {
  return WORKOUT_PROGRAMS.map((p) => ({ slug: p.slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);

  const breadcrumbSchema = program
    ? getBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Programs", url: "/ar/programs" },
        { name: program.nameEn, url: `/ar/programs/${program.slug}` },
      ])
    : null;

  return (
    <>
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <ProgramDetailClient
        program={program ?? null}
        exerciseIndex={
          program
            ? getExerciseMinisBySlugs(
                program.days.flatMap((d) => d.exercises.map((ex) => ex.exerciseSlug)),
              )
            : {}
        }
        lang="ar"
      />
    </>
  );
}
