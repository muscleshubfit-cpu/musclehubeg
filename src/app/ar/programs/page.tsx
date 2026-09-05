import type { Metadata } from "next";
import ProgramsPage from "@/app/programs/page";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic mirror of /programs (workout training programs).
 *
 * Passes `lang="ar"` to force Arabic rendering regardless of the user's
 * localStorage preference — same established pattern as /ar/exercises
 * (→ <ExercisesPage lang="ar" />) and /ar/blog (→ <BlogListPage lang="ar" />).
 *
 * Rendered inside src/app/ar/layout.tsx's <div dir="rtl" lang="ar"> and
 * tagged Content-Language: ar-EG by the middleware for crawlers.
 */
export const metadata: Metadata = {
  title: "برامج التدريب",
  description:
    "برامج تدريب جاهزة لكل المستويات والأهداف — برامج منزلية بدون معدات، برامج دمبل، وبرامج جيم كاملة بالجدول الأسبوعي وشرح كل تمرين على Alkemos.",
  alternates: {
    canonical: "/ar/programs",
    languages: {
      en: `${SITE_URL}/programs`,
      ar: `${SITE_URL}/ar/programs`,
      "x-default": `${SITE_URL}/programs`,
    },
  },
};

export default function Page() {
  return <ProgramsPage lang="ar" />;
}
