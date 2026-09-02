import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * PUBLIC — active coach ads for the homepage «مدربون مميزون» strip
 * (0037 «أعلن معنا»). Returns the coaches with a RUNNING ad subscription:
 * profile identity + public landing page link. No auth, no writes —
 * anonymous visitors (including logged-out homepage) may read it.
 *
 * Ads are time-boxed (ends_at > now, status = active) and capped —
 * the strip stays small and honest. Coaches without a published public
 * page still appear (the card links to /coaching as a fallback) so the
 * ad they paid for never silently disappears.
 */

export const revalidate = 60; // ISR — fresh enough, cheap on the DB

export async function GET() {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data: ads, error } = await supabaseAdmin
    .from("coach_ads")
    .select("coach_id, ends_at")
    .eq("status", "active")
    .gt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(8);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      // 0037 not applied yet — an empty strip, never an error page.
      return NextResponse.json({ coaches: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!ads || ads.length === 0) {
    return NextResponse.json({ coaches: [] });
  }

  const coachIds = Array.from(new Set(ads.map((a) => a.coach_id)));
  const [profilesRes, pagesRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", coachIds),
    // 0046 REVIEW GATE — only APPROVED pages get the public link/headline.
    // Defensive: before migration 0046 the column is missing (42703) →
    // retry without the filter (pre-0046 behaviour).
    (async () => {
      const gated = await supabaseAdmin
        .from("coach_pages")
        .select("coach_id, slug, headline, photo_url, is_published, review_status")
        .in("coach_id", coachIds)
        .eq("is_published", true)
        .eq("review_status", "approved");
      if (!gated.error) return gated;
      if ((gated.error as { code?: string }).code === "42703") {
        return supabaseAdmin
          .from("coach_pages")
          .select("coach_id, slug, headline, photo_url, is_published")
          .in("coach_id", coachIds)
          .eq("is_published", true);
      }
      return gated;
    })(),
  ]);

  const profiles = new Map(
    ((profilesRes.data ?? []) as Array<Record<string, unknown>>).map((p) => [String(p.id), p]),
  );
  const pages = new Map(
    ((pagesRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((p) => [String(p.coach_id), p]),
  );

  const coaches = ads
    .map((ad) => {
      const prof = profiles.get(String(ad.coach_id));
      if (!prof) return null; // deleted coach — skip the slot
      const page = pages.get(String(ad.coach_id));
      return {
        slug: page?.slug ?? null,
        name: (prof.full_name as string) || "",
        headline: (page?.headline as string) || "",
        photo: (page?.photo_url as string) || (prof.avatar_url as string) || null,
        ends_at: ad.ends_at,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ coaches });
}