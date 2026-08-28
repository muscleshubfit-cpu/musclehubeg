import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { fetchFeaturedImage } from "@/lib/blog-images";

/**
 * Backfill featured images for published blog posts that don't have one.
 *
 * POST /api/blog/fetch-images   (coach-only)
 * → { updated, failed, total, details: [{ title, status, image? }] }
 *
 * OWNER DEEP-AUDIT FIX (2026-08-28): this endpoint was ORPHANED (no UI
 * caller) and predated IMAGE SOURCE LAW v3.1 — it hit Pexels raw with NO
 * query sanitization, NO alt-text modesty screening, and stored the
 * heavyweight src.large variant. One call could have reintroduced exactly
 * the shirtless-cover class of incident v3.1 exists to prevent. It is now
 * a thin loop over `fetchFeaturedImage()` — the SAME pipeline the cron
 * pipeline uses (sanitizeImageQuery → Pexels → NSFW/immodest alt screening
 * → deterministic rotation → compressed landscape CDN variant) — and is
 * wired into BlogAdminView as the "fill missing covers" button.
 *
 * NOTE: posts that ALREADY have a featured_image are never touched —
 * re-sourcing existing covers stays the job of the GHA remediate runner.
 */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  // Coach-only — writes to blog_posts using the service-role key.
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  if (!pexelsKey) {
    return NextResponse.json({ error: "PEXELS_API_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, title, language, focus_keyword, featured_image, cover_alt")
    .eq("is_published", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only posts WITHOUT a cover are candidates.
  const needsImage = (posts || []).filter((p: any) => !p.featured_image);
  const results: any[] = [];
  let updated = 0;
  let failed = 0;

  for (const post of needsImage) {
    const query = (post.focus_keyword || post.title || "").trim();
    if (!query) {
      results.push({ title: post.title, status: "skipped — no query" });
      continue;
    }

    try {
      // v3.1 pipeline: sanitized query → Pexels primary (Unsplash/Pixabay
      // failover) → alt-screened → rotated pool pick → light CDN variant.
      const photo = await fetchFeaturedImage(query, {
        variationKey: `${post.id}-cover-backfill`,
      });

      if (!photo) {
        failed++;
        results.push({ title: post.title, status: "no safe photo found" });
        continue;
      }

      const { error: updErr } = await supabase
        .from("blog_posts")
        .update({ featured_image: photo.url, cover_alt: photo.alt })
        .eq("id", post.id);

      if (updErr) {
        failed++;
        results.push({ title: post.title, status: updErr.message });
      } else {
        updated++;
        results.push({ title: post.title, status: "updated", image: photo.url });
      }
      // Small pacing so a large backfill stays polite to the search APIs.
      await new Promise((r) => setTimeout(r, 400));
    } catch (e: any) {
      failed++;
      results.push({ title: post.title, status: e.message });
    }
  }

  return NextResponse.json({ updated, failed, total: needsImage.length, details: results });
}
