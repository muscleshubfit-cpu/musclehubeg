import type { Metadata } from "next";
import MembershipsPage from "@/app/memberships/page";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic mirror of /memberships.
 *
 * Passes `lang="ar"` to force Arabic rendering, regardless of the user's
 * localStorage language preference. This matches the established pattern
 * used by `/ar/blog/page.tsx` → `<BlogListPage lang="ar" />`,
 * `/ar/exercises/page.tsx`, and `/ar/foods/page.tsx`.
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
  title: "العضويات والباقات",
  description:
    "باقات Musclehubeg: مجاني، Premium ($14.99)، Pro ($29.99)، وكوتشينج ($39.99) — EVO غير محدود، خطط تدريب وتغذية، ومتابعة أسبوعية.",
  alternates: {
    canonical: "/ar/memberships",
    languages: {
      en: `${SITE_URL}/memberships`,
      ar: `${SITE_URL}/ar/memberships`,
      "x-default": `${SITE_URL}/memberships`,
    },
  },
};

export default function Page() {
  return <MembershipsPage lang="ar" />;
}
