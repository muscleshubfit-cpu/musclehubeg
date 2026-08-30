import { LandingView } from "@/components/views/LandingView";

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
 *   Metadata (Arabic title/description/OG/hreflang) comes from
 *   `src/app/ar/layout.tsx`.
 */
export default function Page() {
  return <LandingView />;
}
