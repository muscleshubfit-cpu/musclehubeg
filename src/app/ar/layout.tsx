import type { Metadata } from "next";

/**
 * Arabic nested layout.
 *
 * Provides Arabic-specific SEO metadata for all /ar/* routes:
 *   - Arabic title + description for search engines
 *   - og:locale = ar_EG for social sharing
 *   - hreflang alternates pointing to EN + AR versions
 *
 * The root `<html lang dir>` attributes are set by `src/app/layout.tsx`
 * via `resolveLocale()` reading the `x-pathname` header from middleware.
 *
 * The `<div dir="rtl" lang="ar">` wrapper is RETAINED as a defensive
 * safety net for deeply-nested components / third-party libraries.
 */

export const metadata: Metadata = {
  title: {
    default: "Musclehubeg — منصة اللياقة والتغذية الشاملة",
    template: "%s — Musclehubeg",
  },
  description:
    "منصة Musclehubeg لللياقة والتغذية: مكتبة تمارين (868+)، برامج تدريب، حاسبات لياقة مجانية، قاعدة بيانات أطعمة (8,830+)، مدونة رياضية، وكوتشينج أونلاين مع محرك EVO الذكي.",
  openGraph: {
    title: "Musclehubeg — منصة اللياقة والتغذية الشاملة",
    description:
      "868+ تمرين، برامج تدريب جاهزة، حاسبات لياقة مجانية، 8,830+ أكلة بالسعرات والماكروز، مدونة رياضية علمية، وكوتشينج أونلاين مع محرك EVO الذكي.",
    siteName: "Musclehubeg",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Musclehubeg — منصة اللياقة والتغذية",
    description:
      "868+ تمرين، برامج تدريب، حاسبات مجانية، 8,830+ أكلة، مدونة رياضية، وكوتشينج أونلاين مع EVO AI.",
  },
  // NOTE: NO `alternates` here (homepage AR mirror follow-up, 2026-08-30).
  // Next.js metadata inheritance is field-level: an `alternates` block in
  // this nested layout is inherited verbatim by EVERY /ar/* child page,
  // which made /ar/blog, /ar/exercises, /ar/foods and /ar/memberships
  // declare the HOMEPAGE canonical + hreflang (telling Google they are
  // duplicates of /ar). Each Arabic page now declares its own canonical +
  // languages in its own `metadata` export (see the pages' files), same
  // pattern as `src/app/ar/coaches/[slug]/page.tsx`.
};

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" lang="ar">{children}</div>;
}
