import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Auto-fetch featured images for all published blog posts that don't have one.
 * Uses Pexels API to search for images matching the article's focus keyword or title.
 *
 * POST /api/blog/fetch-images
 * Body: { key: "fetch-images-2026" }
 */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if ((body.key || "") !== "fetch-images-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Filter to only posts without a featured_image
  const needsImage = (posts || []).filter((p: any) => !p.featured_image);
  const results: any[] = [];
  let updated = 0;
  let failed = 0;

  for (const post of needsImage) {
    const query = (post.focus_keyword || post.title || "").trim();
    if (!query) {
      results.push({ title: post.title, status: "skipped" });
      continue;
    }

    try {
      const searchRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(10_000) },
      );
      let photo = null;
      if (searchRes.ok) {
        const data = await searchRes.json();
        photo = data?.photos?.[0];
      }
      // Try broader query
      if (!photo) {
        const broad = post.title.split(" ").slice(0, 3).join(" ");
        const retryRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(broad)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(10_000) },
        );
        if (retryRes.ok) {
          const data = await retryRes.json();
          photo = data?.photos?.[0];
        }
      }

      if (!photo) {
        failed++;
        results.push({ title: post.title, status: "no photo found" });
        continue;
      }

      const imageUrl = photo.src?.large || photo.src?.medium || photo.src?.original;
      const alt = photo.alt || query;

      const { error: updErr } = await supabase
        .from("blog_posts")
        .update({ featured_image: imageUrl, cover_alt: alt })
        .eq("id", post.id);

      if (updErr) {
        failed++;
        results.push({ title: post.title, status: updErr.message });
      } else {
        updated++;
        results.push({ title: post.title, status: "updated", image: imageUrl });
      }
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      failed++;
      results.push({ title: post.title, status: e.message });
    }
  }

  return NextResponse.json({ updated, failed, total: needsImage.length, details: results });
}
