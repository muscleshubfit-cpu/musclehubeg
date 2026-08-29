import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachLandingContent } from "@/components/coach/CoachLandingContent";
import {
  fetchCoachLanding,
  coachDisplayName,
  resolveLandingCopy,
} from "@/lib/coach-landing-server";

/**
 * MULTI-COACH PHASE 2B — PUBLIC coach landing page, AR MIRROR.
 * Owner answer 3 (2026-08-29): each coach has a private-to-promote
 * public page — it is NEVER in any menu; the coach shares the URL
 * himself. Reachable while logged-out (published pages only).
 *
 * BILINGUAL MIRROR LAW (site convention, same as /ar/blog/[slug]):
 *   EN canonical: /coaches/{slug}
 *   AR mirror:    /ar/coaches/{slug}   ← this file
 * Root layout + middleware already serve `lang="ar" dir="rtl"` for
 * /ar/* via the x-pathname header; this page renders Arabic chrome and
 * resolves coach content with the cross-language fallback (AR copy, or
 * EN copy when the coach only wrote English). Unknown or unpublished
 * slugs → proper 404.
 */

export const revalidate = 300; // 5 min ISR — landing copy changes rarely
export const runtime = "nodejs";

const SITE_URL = "https://musclehubeg.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchCoachLanding(slug);

  if (!data) {
    return {
      title: "الصفحة غير موجودة — Musclehubeg",
      robots: { index: false, follow: false },
    };
  }

  const copy = resolveLandingCopy(data, "ar");
  const name = coachDisplayName(data, "ar");
  const title = `${name} — ${copy.headline || "مدرب معتمد على Musclehubeg"}`;
  const description =
    copy.bio.slice(0, 160) || `احجز متابعة خاصة مع ${name} على Musclehubeg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/ar/coaches/${slug}`,
      languages: {
        en: `${SITE_URL}/coaches/${slug}`,
        ar: `${SITE_URL}/ar/coaches/${slug}`,
        "x-default": `${SITE_URL}/coaches/${slug}`,
      },
    },
    openGraph: {
      type: "profile",
      url: `${SITE_URL}/ar/coaches/${slug}`,
      title,
      description,
      siteName: "Musclehubeg",
      locale: "ar_EG",
    },
  };
}

export default async function CoachLandingPageAr({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchCoachLanding(slug);
  if (!data) notFound();

  return <CoachLandingContent data={data} lang="ar" />;
}
