/**
 * scripts/blog-runner/embed-post-images.mts
 *
 * BODY IMAGE BACKFILL (2026-08-27): every article published BEFORE the
 * BODY IMAGE EMBEDDING LAW has featured_image (cover) only — P3's 3–5
 * sourced images were generated but positions 2..N were never inserted
 * into the article body. This runner backfills published posts:
 *
 *   for each published post whose BODY has no images:
 *     1. source up to 2 NEW people-free topical object images through
 *        the SAME safety pipeline (fetchFeaturedImage → image-safety.ts)
 *     2. insert them into the markdown at `##` section boundaries via
 *        src/lib/blog-images.ts → embedBodyImages()
 *        (featured_image stays the cover, passed as images[0] so it is
 *        never duplicated in the body)
 *     3. update blog_posts.content
 *
 * IDEMPOTENT: posts whose body already contains an image URL are skipped
 * (the `no pollinations/unsplash/etc in body` pre-filter), so re-running
 * never double-inserts. Reuses the pure embedBodyImages for zero drift
 * between pipeline and backfill behavior.
 *
 * NOTE ON PACING: the workflow runs this right AFTER the remediation
 * sweep (which hits Pollinations heavily) — the 20s/25s pauses below are
 * mandatory, a 2026-08-27 run without them sourced 1/8 images.
 *
 * USAGE (inside GHA remediate-blog-images.yml):
 *   npx --no-install tsx scripts/blog-runner/embed-post-images.mts
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { supabaseAdmin } from "../../src/lib/supabase/admin";
import { fetchFeaturedImage, embedBodyImages } from "../../src/lib/blog-images";

const BODY_IMAGE_MARK = "![";
const MAX_BACKFILL_IMAGES = 2;

// Pollinations rate-limits rapid same-IP requests (429s are swallowed by
// the fetch helpers as "no image sourced"). The 2026-08-27 17:19 run
// proved it: right after the remediation sweep hammered ~12 URLs, this
// step could source only 1 image across 4 posts. Stay polite:
// PACE_MS between sourcing calls + one retry per subject after a pause.
const PACE_MS = 20_000;
const RETRY_PAUSE_MS = 25_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bodyHasImage(content: string): boolean {
  // Any markdown image in the body (covers all pipeline sources:
  // pollinations AI, unsplash, pexels, pixabay).
  return typeof content === "string" && content.includes(BODY_IMAGE_MARK);
}

async function embedPublishedPosts(): Promise<void> {
  let embedded = 0;
  let skipped = 0;

  for (let from = 0; ; from += 50) {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, focus_keyword, language, featured_image, cover_alt, content")
      .eq("is_published", true)
      .not("featured_image", "is", null)
      .range(from, from + 49);
    if (error) throw new Error(`blog_posts select failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const p of data as any[]) {
      const content: string = p.content || "";
      if (bodyHasImage(content)) {
        skipped += 1;
        continue;
      }
      const hint = `${p.focus_keyword || ""} ${p.title || ""}`.trim() || "fitness equipment";
      // Two DIFFERENT people-free subject variations → distinct sections.
      // SCENE DIVERSITY LAW: each body slot carries its own variationKey
      // so the curated scene variant + photo style rotate per position.
      const subjects = [
        `${hint} — equipment and gear still life`,
        `${hint} — gym interior scene`,
      ];
      const sourced: Array<{ url: string; alt?: string; credit?: string } | null> = [];
      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i];
        const vKey = `${p.slug}-body-${i + 1}`;
        let img = await fetchFeaturedImage(s, { variationKey: vKey });
        if (!img) {
          await sleep(RETRY_PAUSE_MS);
          img = await fetchFeaturedImage(s, { variationKey: vKey });
        }
        if (img) sourced.push(img);
        await sleep(PACE_MS);
      }
      if (sourced.length === 0) {
        console.warn(`⚠ ${p.language}/${p.slug}: no images could be sourced — skipped`);
        skipped += 1;
        continue;
      }
      // images[0] slot = the existing COVER so embedBodyImages never
      // duplicates it into the body; sourced images fill positions 1..N.
      const cover = { url: p.featured_image as string, alt: p.cover_alt || p.title || "" };
      const next = embedBodyImages(content, [cover, ...sourced]);
      if (next === content) {
        skipped += 1;
        continue;
      }
      const { error: updErr } = await supabaseAdmin
        .from("blog_posts")
        .update({ content: next })
        .eq("id", p.id);
      if (updErr) throw new Error(`update post ${p.slug} failed: ${updErr.message}`);
      embedded += 1;
      console.log(`✓ embedded ${sourced.length} body image(s) into ${p.language}/${p.slug}`);
    }
    if ((data as any[]).length < 50) break;
  }

  console.log(`[embed-post-images] DONE · embedded=${embedded} skipped=${skipped}`);
}

async function main(): Promise<void> {
  console.log("[embed-post-images] starting BODY IMAGE backfill …");
  await embedPublishedPosts();
}

main().catch((e) => {
  console.error("❌ [embed-post-images] FATAL:", e?.message || e);
  process.exit(1);
});
