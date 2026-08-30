import type { Metadata } from "next";
import ExercisesPage from "@/app/exercises/page";

const SITE_URL = "https://musclehubeg.vercel.app";

/**
 * Arabic mirror of /exercises.
 *
 * Passes `lang="ar"` to force Arabic rendering, regardless of the user's
 * localStorage language preference. This matches the established pattern
 * used by `/ar/blog/page.tsx` → `<BlogListPage lang="ar" />`.
 *
 * The page is wrapped by `src/app/ar/layout.tsx`'s `<div dir="rtl" lang="ar">`
 * for proper RTL rendering, and by `src/middleware.ts`'s `Content-Language:
 * ar-EG` header for crawler language attribution.
 *
 * Homepage AR mirror follow-up (2026-08-30): own title + canonical +
 * hreflang so Google indexes THIS url (the ar/layout alternates block was
 * removed — it leaked the homepage signals onto every /ar/* child).
 */
export const metadata: Metadata = {
  title: "مكتبة التمارين",
  description:
    "مكتبة 868+ تمرين بالصور والشرح ثنائي اللغة ومستويات الصعوبة — عضلات، أجهزة، وتمارين منزلية على Musclehubeg.",
  alternates: {
    canonical: "/ar/exercises",
    languages: {
      en: `${SITE_URL}/exercises`,
      ar: `${SITE_URL}/ar/exercises`,
      "x-default": `${SITE_URL}/exercises`,
    },
  },
};

export default function Page() {
  return <ExercisesPage lang="ar" />;
}
