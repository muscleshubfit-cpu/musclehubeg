import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachLandingContent } from "@/components/coach/CoachLandingContent";
import {
  fetchCoachLandingForPreview,
} from "@/lib/coach-landing-server";
import { getAuthUserFromHeaders } from "@/lib/auth-server";

/**
 * PHASE 58 — STAFF-ONLY PREVIEW of a coach public page, BEFORE approval.
 *
 * Owner bug report: «معاينة الصفحة العامة من الادمن قبل الموافقة بتروح
 * صفحة ٤٠٤» — the review console linked to the PUBLIC mirror
 * /coaches/{slug}, which 404s every non-approved page ON PURPOSE (the
 * 0046 review gate + the 0048 RLS fix keep pending content away from
 * anonymous visitors). The fix is NOT to open that gate — it is a
 * separate, session-guarded preview surface:
 *
 *   admin  → may preview ANY coach page (pending / rejected / unpublished)
 *   coach  → may preview ONLY his own page (his editor's preview buttons)
 *   anyone else (incl. logged-out) → proper 404
 *
 * The data comes from fetchCoachLandingForPreview (service role, no
 * publish/review gates); authorization happens HERE, server-side, from
 * the session cookies. robots noindex — this surface must never be
 * indexed or shared.
 */

export const dynamic = "force-dynamic"; // session-aware — never cache/ISR
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Preview — Alkemos",
  robots: { index: false, follow: false },
};

export default async function CoachPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;

  // 1) Session guard — logged-out visitors get the same 404 as strangers.
  const user = await getAuthUserFromHeaders();
  if (!user) notFound();

  // 2) Load the page WITHOUT the publish/review gates.
  const data = await fetchCoachLandingForPreview(slug);
  if (!data) notFound();

  // 3) Authorization: admin sees every page; a coach only HIS OWN row.
  const isAdmin = user.role === "admin";
  const isOwner = data.coach_id != null && data.coach_id === user.id;
  if (!isAdmin && !isOwner) notFound();

  // 4) Language follows ?lang= (the public mirrors are unreachable for
  //    non-approved pages, so the LanguageToggle can't be used here).
  const lang: "en" | "ar" = langParam === "ar" ? "ar" : "en";

  return <CoachLandingContent data={data} lang={lang} preview />;
}
