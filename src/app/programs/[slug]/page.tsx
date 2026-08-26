import type { Metadata } from "next";
import { getProgramBySlug } from "@/lib/workout-programs";
import { getBreadcrumbSchema } from "@/lib/seo";
import ProgramDetailClient from "./ProgramDetailClient";

/**
 * Server component for program detail page.
 *
 * C22 fix: previously a "use client" component — could not export
 * generateMetadata. All program pages shared the same generic title
 * from programs/layout.tsx. Now generates per-page metadata +
 * JSON-LD Breadcrumb schema server-side.
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
      title: "Program Not Found — MuscleHubEG",
      robots: { index: false, follow: false },
    };
  }

  const title = `${program.nameEn} — Workout Program | MuscleHubEG`;
  const description = `${program.nameEn}: ${program.descriptionEn} ${program.days.length}-day ${program.level} program for ${program.goal}. ${program.location}.`;
  const url = `https://musclehubeg.vercel.app/programs/${program.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: program.image, width: 1200, height: 630 }],
      siteName: "MuscleHubEG",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [program.image],
    },
  };
}

export async function generateStaticParams() {
  // Pre-generate all program slugs at build time (small dataset — ~7 programs)
  const { WORKOUT_PROGRAMS } = await import("@/lib/workout-programs");
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
        { name: "Programs", url: "/programs" },
        { name: program.nameEn, url: `/programs/${program.slug}` },
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
      <ProgramDetailClient program={program ?? null} />
    </>
  );
}
