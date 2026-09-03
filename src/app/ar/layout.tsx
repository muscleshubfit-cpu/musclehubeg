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
    default: "Musclehubeg | منصة رياضية شاملة: تمارين وتغذية وكوتشينج اونلاين",
    template: "%s — Musclehubeg",
  },
  // Phase 117 completion (owner directive 2026-09-04): meta description
  // shortened to 150-160 chars (159) ending with the owner's verbatim CTA
  // («ابدأ رحلتك الرياضية الآن مع منصة التدريب الرقمية المتكاملة») — the
  // previous ~190-char version had no call to action. The three copies in
  // this file stay identical (this file's established pattern).
  description:
    "أكثر من 868 تمرينًا، 8830 أكلة بالقيم الغذائية، برامج جاهزة، حاسبات مجانية، ومدربون معتمدون مع EVO. ابدأ رحلتك الرياضية الآن مع منصة التدريب الرقمية المتكاملة.",
  openGraph: {
    title: "Musclehubeg | منصة رياضية شاملة: تمارين وتغذية وكوتشينج اونلاين",
    description:
      "أكثر من 868 تمرينًا، 8830 أكلة بالقيم الغذائية، برامج جاهزة، حاسبات مجانية، ومدربون معتمدون مع EVO. ابدأ رحلتك الرياضية الآن مع منصة التدريب الرقمية المتكاملة.",
    siteName: "Musclehubeg",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Musclehubeg | منصة رياضية شاملة: تمارين وتغذية وكوتشينج اونلاين",
    description:
      "أكثر من 868 تمرينًا، 8830 أكلة بالقيم الغذائية، برامج جاهزة، حاسبات مجانية، ومدربون معتمدون مع EVO. ابدأ رحلتك الرياضية الآن مع منصة التدريب الرقمية المتكاملة.",
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
