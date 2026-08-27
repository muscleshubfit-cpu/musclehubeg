/**
 * scripts/blog-runner/remediate-images.mts
 *
 * IMAGE SOURCE MIGRATION (re-runnable safely), owner directive
 * 2026-08-28: «استبدل خطوه الصور تماما الى PEXELS_API_KEY» —
 * every blog post / queue bundle still holding a Pollinations AI URL
 * gets its images REPLACED with real Pexels stock photography
 * (normal people allowed, NSFW screened), rewritten in DB.
 *
 * LAW: src/lib/image-safety.ts v3 + src/lib/blog-images.ts
 * (Pexels primary; deterministic result rotation per (row, slot) so
 * migrated images stay diverse).
 *
 * USAGE (inside GHA remediate-blog-images.yml):
 *   npx --no-install tsx scripts/blog-runner/remediate-images.mts
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PEXELS_API_KEY
 */
import { supabaseAdmin } from "../../src/lib/supabase/admin";
import { fetchFeaturedImage } from "../../src/lib/blog-images";
import { hasNsfwVocabulary, hasImmodestSignal } from "../../src/lib/image-safety";

type SourcedImage = { url: string; alt?: string; credit?: string };

let rebuilt = 0;
let kept = 0;
let failed = 0;
let rescreened = 0;

function isPollinations(u: string): boolean {
  return typeof u === "string" && u.startsWith("https://image.pollinations.ai/");
}

/** v3.1 modesty screen for STORED alt-texts. */
function altUnsafe(alt?: string | null): boolean {
  if (!alt) return false;
  return hasNsfwVocabulary(alt) || hasImmodestSignal(alt);
}

/** One-off jitter key for corrective re-picks (not first-sourcing). */
function jitterKey(base: string): string {
  return `${base}-r${Date.now() % 100000}`;
}

/**
 * Source a REPLACEMENT stock photo for one legacy AI URL.
 * Returns null when Pexels (+ fallbacks) cannot serve a result — the
 * legacy URL is then left untouched rather than deleted.
 */
async function sourceReplacement(hint: string, variationKey: string): Promise<SourcedImage> {
  const img = await fetchFeaturedImage(hint || "gym fitness equipment", { variationKey });
  if (img) rebuilt += 1;
  else failed += 1;
  return img;
}

/** Replace every pollinations URL / immodest-alt image inside markdown. */
async function sanitizeContentImages(
  content: string,
  hint: string,
  rowId: string,
): Promise<string> {
  const mdImgRe = /!\[([^\]]*)\]\((https?:[^)\s]+)\)/g;
  const matches = [...content.matchAll(mdImgRe)];
  if (matches.length === 0) return content;

  let out = content;
  let slot = 0;
  for (const m of matches) {
    slot += 1;
    const [, alt, url] = m;
    const flagged = isPollinations(url) || altUnsafe(alt);
    if (!flagged) continue;
    const img = await sourceReplacement(hint, jitterKey(`${rowId}-body-${slot}`));
    if (img) {
      const safeAlt = (img.alt || alt || "fitness").replace(/[[\]]/g, "").trim();
      out = out.replace(m[0], `![${safeAlt}](${img.url})`);
    }
  }
  return out;
}

async function remediatePosts(): Promise<void> {
  // Paginate across ALL published posts with ANY remote imagery.
  for (let from = 0; ; from += 100) {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, focus_keyword, language, featured_image, cover_alt, content")
      .or(
        "featured_image.ilike.%pollinations.ai/prompt/%,content.ilike.%pollinations.ai/prompt/%,featured_image.ilike.%images.pexels.com%,featured_image.ilike.%images.unsplash.com%",
      )
      .range(from, from + 99);
    if (error) throw new Error(`blog_posts select failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const p of data as any[]) {
      const hint = `${p.focus_keyword || ""} ${p.title || ""}`.trim() || "gym fitness workout";
      const patch: Record<string, unknown> = {};

      if (isPollinations(p.featured_image) || altUnsafe(p.cover_alt)) {
        // FIRST image slot is the COVER → anchor fully on article topic.
        const cover = await sourceReplacement(hint, jitterKey(`${p.id}-cover`));
        if (cover) {
          patch.featured_image = cover.url;
          if (cover.alt) patch.cover_alt = cover.alt.slice(0, 300);
          if (altUnsafe(p.cover_alt)) rescreened += 1;
        }
      }

      if (typeof p.content === "string" && /![^]*\]\(https?:/.test(p.content)) {
        const next = await sanitizeContentImages(p.content, hint, p.id);
        if (next !== p.content) patch.content = next;
      }

      if (Object.keys(patch).length === 0) {
        kept += 1;
        continue;
      }
      const { error: updErr } = await supabaseAdmin
        .from("blog_posts")
        .update(patch)
        .eq("id", p.id);
      if (updErr) throw new Error(`update post ${p.slug} failed: ${updErr.message}`);
      console.log(`✓ migrated post ${p.language}/${p.slug} (${Object.keys(patch).join(", ")})`);
    }
    if ((data as any[]).length < 100) break;
  }
}

async function remediateQueueBundles(): Promise<void> {
  for (let from = 0; ; from += 100) {
    // NOTE: article_bundle is JSONB — `like/ilike` on it raises
    // "operator does not exist: jsonb ~~ unknown". Filter client-side.
    const { data, error } = await supabaseAdmin
      .from("blog_generation_queue")
      .select("id, focus_keyword, topic, article_bundle")
      .not("article_bundle", "is", null)
      .range(from, from + 99);
    if (error) throw new Error(`queue select failed: ${error.message}`);
    if (!data || data.length === 0) break;

    const batch = (data as any[]).filter(
      (q) => typeof q.article_bundle === "string" &&
        (q.article_bundle.includes("image.pollinations.ai") ||
          /"alt"\s*:\s*"[^"]*(?:flexing|shirtless|bodybuilder|six.?pack|torso|topless|swimsuit|bikini|nude|naked|sexy|underwear|lingerie)/i.test(q.article_bundle)),
    );

    for (const q of batch) {
      let bundle: any;
      try {
        bundle = JSON.parse(q.article_bundle);
      } catch {
        continue;
      }
      if (!Array.isArray(bundle?.images)) continue;
      const hint = `${q.focus_keyword || ""} ${q.topic || ""}`.trim() || "gym fitness workout";
      let changed = false;
      let slot = 0;
      const nextImages: SourcedImage[] = [];
      for (const img of bundle.images) {
        if (img && (isPollinations(img.url) || altUnsafe(img.alt))) {
          slot += 1;
          const rep = await sourceReplacement(hint, jitterKey(`${q.id}-${slot}`));
          if (rep) {
            changed = true;
            if (altUnsafe(img.alt)) rescreened += 1;
            nextImages.push({ ...img, ...rep });
            continue;
          }
        }
        nextImages.push(img);
      }
      if (!changed) continue;
      bundle.images = nextImages;
      const { error: updErr } = await supabaseAdmin
        .from("blog_generation_queue")
        .update({ article_bundle: JSON.stringify(bundle) })
        .eq("id", q.id);
      if (updErr) throw new Error(`update queue ${q.id} failed: ${updErr.message}`);
      console.log(`✓ migrated queue ${q.id} (${nextImages.length} images)`);
    }
    if ((data as any[]).length < 100) break;
  }
}

async function main(): Promise<void> {
  if (!process.env.PEXELS_API_KEY) {
    console.error(
      "❌ [remediate-images] PEXELS_API_KEY is NOT set — Pexels is the PRIMARY source; aborting to avoid degrading posts to fallback-only imagery.",
    );
    process.exit(1);
  }
  console.log("[remediate-images] starting PEXELS MIGRATION + MODESTY RESCREEN …");
  await remediateQueueBundles();
  await remediatePosts();
  console.log(
    `[remediate-images] DONE · migrated=${rebuilt} rescreened=${rescreened} untouched_rows=${kept} failed=${failed}`,
  );
}

main().catch((e) => {
  console.error("❌ [remediate-images] FATAL:", e?.message || e);
  process.exit(1);
});
