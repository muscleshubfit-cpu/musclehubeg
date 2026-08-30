import type { Metadata } from "next";
import FoodsPage from "@/app/foods/page";

const SITE_URL = "https://musclehubeg.vercel.app";

/**
 * Arabic mirror of /foods.
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
  title: "قاعدة بيانات الأكلات",
  description:
    "أكلة 8,830+ بالسعرات والماكروز لكل 100 جرام — ابحث، فلتر، واحسب جرامك على Musclehubeg.",
  alternates: {
    canonical: "/ar/foods",
    languages: {
      en: `${SITE_URL}/foods`,
      ar: `${SITE_URL}/ar/foods`,
      "x-default": `${SITE_URL}/foods`,
    },
  },
};

export default function Page() {
  return <FoodsPage lang="ar" />;
}
