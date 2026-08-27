/**
 * scripts/blog-runner/remediate-images.mts
 *
 * ONE-OFF (re-runnable safely) REMEDIATION for the 2026-08-27 image-safety
 * incident: every blog post / queue bundle still holding a Pollinations
 * URL built from the retired "modesty-negation" prompts gets its images
 * REGENERATED as PEOPLE-FREE topical object scenes and rewritten in DB.
 *
 * LAW: src/lib/image-safety.ts — people-free subjects only, zero negations.
 * All old pollinations URLs contain banned tokens by construction
 * ("no nudity", clothing wording), so re-generation is unconditional.
 *
 * USAGE (inside GHA remediate-blog-images.yml):
 *   npx --no-install tsx scripts/blog-runner/remediate-images.mts
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { supabaseAdmin } from "../../src/lib/supabase/admin";
import { buildSafeImagePrompt } from "../..//src/lib/image-safety";

type SourcedImage = { url: string; alt?: string; credit?: string };

let rebuilt = 0;
let kept = 0;

function randSeed(): number {
  return Math.floor(Math.random() * 100000);
}

/**
 * Build a NEW safe pollinations URL. Deterministically rejects returning
 * the old one (fresh seed always differs in payload).
 *
 * SCENE DIVERSITY LAW (2026-08-28): variationKey = `${rowId}-${slot}`
 * rotates the curated scene variant + photographic style so every
 * rebuilt image is a distinct composition (owner: «كل الصور نفس الصور»).
 */
function rebuildPollinationsUrl(oldUrl: string, hint: string, variationKey: string): string {
  const m = oldUrl.match(/^https:\/\/image\.pollinations\.ai\/prompt\/([^?]+)\?(.*)$/);
  let w = 1024;
  let h = 576;
  if (m?.[2]) {
    const params = new URLSearchParams(m[2]);
    const wp = parseInt(params.get("width") || "", 10);
    const hp = parseInt(params.get("height") || "", 10);
    if (wp > 0) w = wp;
    if (hp > 0) h = hp;
  }
  const safePrompt = buildSafeImagePrompt(hint || "fitness equipment", "photo", hint, variationKey);
  rebuilt += 1;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=${w}&height=${h}&nologo=true&safe=true&enhance=false&seed=${randSeed()}&model=flux`;
}

function isPollinations(u: string): boolean {
  return typeof u === "string" && u.startsWith("https://image.pollinations.ai/");
}

async function remediatePosts(): Promise<void> {
  // Paginate across ALL published posts touching pollinations anywhere.
  for (let from = 0; ; from += 100) {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, focus_keyword, language, featured_image, cover_alt, content")
      .or(
        "featured_image.ilike.%pollinations.ai/prompt/%,content.ilike.%pollinations.ai/prompt/%",
      )
      .range(from, from + 99);
    if (error) throw new Error(`blog_posts select failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const p of data as any[]) {
      const hint = `${p.focus_keyword || ""} ${p.title || ""}`.trim();
      const patch: Record<string, unknown> = {};

      if (isPollinations(p.featured_image)) {
        // FIRST image slot is the COVER → anchor fully on article topic.
        patch.featured_image = rebuildPollinationsUrl(p.featured_image, hint, `${p.id}-cover`);
      }

      if (typeof p.content === "string" && p.content.includes("image.pollinations.ai")) {
        let slot = 0;
        patch.content = p.content.replace(
          /https:\/\/image\.pollinations\.ai\/prompt\/[^)"\s\\]+/g,
          (u: string) => {
            slot += 1;
            return rebuildPollinationsUrl(u, hint, `${p.id}-body-${slot}`);
          },
        );
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
      console.log(`✓ remediated post ${p.language}/${p.slug} (${Object.keys(patch).join(", ")})`);
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
        q.article_bundle.includes("image.pollinations.ai"),
    );

    for (const q of batch) {
      let bundle: any;
      try {
        bundle = JSON.parse(q.article_bundle);
      } catch {
        continue;
      }
      if (!Array.isArray(bundle?.images)) continue;
      const hint = `${q.focus_keyword || ""} ${q.topic || ""}`.trim();
      let changed = false;
      let slot = 0;
      bundle.images = bundle.images.map((img: SourcedImage) => {
        if (img && isPollinations(img.url)) {
          changed = true;
          slot += 1;
          return { ...img, url: rebuildPollinationsUrl(img.url, hint, `${q.id}-${slot}`) };
        }
        return img;
      });
      if (!changed) continue;
      const { error: updErr } = await supabaseAdmin
        .from("blog_generation_queue")
        .update({ article_bundle: JSON.stringify(bundle) })
        .eq("id", q.id);
      if (updErr) throw new Error(`update queue ${q.id} failed: ${updErr.message}`);
      console.log(`✓ remediated queue ${q.id} (${bundle.images.length} images)`);
    }
    if ((data as any[]).length < 100) break;
  }
}

async function main(): Promise<void> {
  console.log("[remediate-images] starting IMAGE SAFETY sweep …");
  await remediateQueueBundles();
  await remediatePosts();
  console.log(
    `[remediate-images] DONE · rebuilt=${rebuilt} untouched_rows=${kept}`,
  );
}

main().catch((e) => {
  console.error("❌ [remediate-images] FATAL:", e?.message || e);
  process.exit(1);
});
