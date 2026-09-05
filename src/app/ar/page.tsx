import type { Metadata } from "next";
import { LandingView } from "@/components/views/LandingView";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic home page — REAL page (was: redirect("/")).
 *
 * History / why this exists:
 *   This page used to be a one-line `redirect("/")`. The i18n provider
 *   then "guessed" the language from localStorage / browser settings, so:
 *     - Google crawled /ar (declared in hreflang) and found an empty
 *       redirect shell → the Arabic homepage was never indexed.
 *     - A visitor with a non-Arabic browser who explicitly opened /ar
 *       landed on the English homepage.
 *
 *   Fix (homepage AR mirror, 2026-08-30):
 *     - /ar now renders the real LandingView.
 *     - The I18nProvider is URL-aware (see `src/lib/i18n.tsx`): the root
 *       layout passes `urlLocale` resolved from the `x-pathname` header,
 *       so the SERVER renders Arabic strings for /ar (no flash, SEO sees
 *       full Arabic content).
 *     - The language toggle still works: on /ar it navigates to "/" and
 *       persists the choice in localStorage (MIRROR_ROUTES in
 *       `LanguageToggle.tsx`).
 *
 *   Metadata: title/description/OG defaults come from
 *   `src/app/ar/layout.tsx`; the alternates live HERE (not in the
 *   layout) so only the homepage declares the homepage canonical —
 *   sibling /ar/* pages declare their own (follow-up fix: the layout
 *   block was leaking to every child page).
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "/ar",
    languages: {
      en: `${SITE_URL}/`,
      ar: `${SITE_URL}/ar`,
      "x-default": `${SITE_URL}/`,
    },
  },
};

export default function Page() {
  return <LandingView />;
}
