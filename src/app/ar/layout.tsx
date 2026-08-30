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
  alternates: {
    // Homepage AR mirror fix (2026-08-30): /ar is now a real page —
    // declare its own canonical so Google indexes the Arabic URL itself
    // (previously /ar redirected to / and had no canonical at all).
    canonical: "/ar",
    languages: {
      "en": "https://musclehubeg.vercel.app",
      "ar": "https://musclehubeg.vercel.app/ar",
    },
  },
};

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" lang="ar">{children}</div>;
}
