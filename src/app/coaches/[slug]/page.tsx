import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachLandingContent } from "@/components/coach/CoachLandingContent";
import {
  fetchCoachLanding,
  coachDisplayName,
  resolveLandingCopy,
} from "@/lib/coach-landing-server";

/**
 * MULTI-COACH PHASE 2B — PUBLIC coach landing page, EN CANONICAL mirror.
 * Owner answer 3 (2026-08-29): each coach has a private-to-promote
 * public page — it is NEVER in any menu; the coach shares the URL
 * himself. Reachable while logged-out (published pages only).
 *
 * BILINGUAL MIRROR LAW (site convention, same as the blog):
 *   EN canonical: /coaches/{slug}      ← this file
 *   AR mirror:    /ar/coaches/{slug}   ← src/app/ar/coaches/[slug]
 * The language follows the URL (server-rendered, never localStorage);
 * LanguageToggle navigates between the two mirrors. Coach content that
 * was only written in one language falls back across mirrors (see
 * resolveLandingCopy).
 *
 * Migration 0031 created coach_pages; migration 0032 added the EN
 * content columns. Unknown or unpublished slugs → proper 404.
 */

export const revalidate = 300; // 5 min ISR — landing copy changes rarely
export const runtime = "nodejs";

const SITE_URL = "https://alkemos.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchCoachLanding(slug);

  if (!data) {
    return {
      title: "Page not found — Musclehubeg",
      robots: { index: false, follow: false },
    };
  }

  const copy = resolveLandingCopy(data, "en");
  const name = coachDisplayName(data, "en");
  const title = `${name} — ${copy.headline || "Certified coach on Musclehubeg"}`;
  const description =
    copy.bio.slice(0, 160) || `Book private coaching with ${name} on Musclehubeg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/coaches/${slug}`,
      languages: {
        en: `${SITE_URL}/coaches/${slug}`,
        ar: `${SITE_URL}/ar/coaches/${slug}`,
        "x-default": `${SITE_URL}/coaches/${slug}`,
      },
    },
    openGraph: {
      type: "profile",
      url: `${SITE_URL}/coaches/${slug}`,
      title,
      description,
      siteName: "Musclehubeg",
      locale: "en_US",
    },
  };
}

export default async function CoachLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchCoachLanding(slug);
  if (!data) notFound();

  return <CoachLandingContent data={data} lang="en" />;
}
