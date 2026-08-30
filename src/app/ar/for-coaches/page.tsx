"use client";

/**
 * AR MIRROR of /for-coaches — same bilingual recruitment page.
 * The page component is fully bilingual inline (useI18n is URL-first
 * since the homepage AR mirror fix), so under /ar/* it renders its
 * Arabic content with `lang="ar" dir="rtl"` chrome automatically.
 *
 * This route exists to give that Arabic content its own INDEXABLE
 * Arabic URL with Arabic-first metadata + reciprocal hreflang with
 * the EN page (src/app/for-coaches/layout.tsx) — the /ar/about & /ar/faq
 * pattern (Phase 44).
 */
export { default } from "@/app/for-coaches/page";
