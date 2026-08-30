import type { Metadata } from "next";

/**
 * HOMEPAGE metadata — owner of the "/" canonical + hreflang cluster.
 *
 * FULL-SITE AUDIT FIX (2026-08-30): the homepage previously inherited
 * its alternates from the ROOT metadata (src/app/metadata.ts). That
 * root block had to be removed because it LEAKED onto every page
 * without its own metadata (see the comment there). But the homepage
 * itself is a "use client" page (OAuth toast effect), so it cannot
 * export metadata directly — this server layout in the (home) route
 * group owns it instead, same pattern as the tool pages.
 *
 * Hreflang codes are "en"/"ar" (+ x-default) — matching /ar and every
 * other per-page declaration. The old en-US/ar-EG codes from the root
 * block conflicted with them (mixed codes invalidate the cluster).
 *
 * Route group means the URL stays "/" — no redirect, no path change.
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "https://musclehubeg.vercel.app",
    languages: {
      en: "https://musclehubeg.vercel.app",
      ar: "https://musclehubeg.vercel.app/ar",
      "x-default": "https://musclehubeg.vercel.app",
    },
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
