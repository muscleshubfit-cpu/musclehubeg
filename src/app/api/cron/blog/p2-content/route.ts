import { NextRequest, NextResponse } from "next/server";
import { generateFullArticle, countWords } from "@/lib/blog-pipeline";
import type { LanguageResearch, } from "@/lib/blog-research";
import type { OutlinePlan } from "@/lib/blog-pipeline";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * PIPELINE V2 · PHASE 2 — Full content generation (1500–2500 words),
 * per language from its own outline + FAQ set. Canonical executor is the
 * native GitHub Actions runner (no 60s cap); the route keeps maxDuration
 * 300 for direct manual pings.
 *
 * GET /api/cron/blog/p2-content?queueId=<uuid>
 *   statuses: outlined → writing_en → en_written → writing_ar → ar_written
 */
async function writeLang(
  lang: "en" | "ar",
  bundle: any,
): Promise<{ markdown: string; words: number; source: string }> {
  const outline: OutlinePlan | undefined = bundle.outline?.[lang];
  const research: LanguageResearch | undefined = bundle.research0?.[lang];
  if (!outline || !research) throw new Error(`p2: missing ${lang} outline/research artifacts`);
  const r = await generateFullArticle(lang, outline, research);
  return { markdown: r.markdown, words: r.wordCount, source: r.source };
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId)
    return NextResponse.json({ error: "Missing queueId query parameter" }, { status: 400 });

  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data)
      return NextResponse.json({ ok: false, queueId, skipped: true, reason: "queue_item_not_found" }, { status: 404 });
    qi = data;

    const REPROCESSABLE = new Set(["outlined", "writing_en", "en_written", "writing_ar", "ar_written"]);
    if (!REPROCESSABLE.has(qi.status) && qi.status !== "failed") {
      if (qi.status === "images_done" || qi.status === "reviewed" || qi.status === "published")
        return NextResponse.json({ ok: true, step: "p2", queueId: qi.id, idempotent: true });
      return NextResponse.json(
        { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
        { status: 409 },
      );
    }

    const parseBundle = () => (qi!.article_bundle ? JSON.parse(qi!.article_bundle) : {});
    let bundle = parseBundle();
    const results: Record<string, unknown> = {};

    // ── EN pass (skipped when already done — resumable after crash) ──
    if (!bundle.content_en?.markdown && qi.status !== "ar_written") {
      const upd1 = await updateQueueItem(qi.id, { status: "writing_en" });
      if (upd1) throw new Error(upd1);
      const en = await writeLang("en", bundle);
      bundle = parseBundle();
      bundle.content_en = en;
      const upd2 = await updateQueueItem(qi.id, {
        status: "en_written",
        article_bundle: JSON.stringify(bundle),
      });
      if (upd2) throw new Error(upd2);
      results.en = { words: en.words, source: en.source };
    } else {
      results.en = { resumed: true };
    }

    // ── AR pass ──────────────────────────────────────────────────
    if (!bundle.content_ar?.markdown) {
      const upd3 = await updateQueueItem(qi.id, { status: "writing_ar" });
      if (upd3) throw new Error(upd3);
      bundle = parseBundle();
      const ar = await writeLang("ar", bundle);
      bundle = parseBundle();
      bundle.content_ar = ar;
      const upd4 = await updateQueueItem(qi.id, {
        status: "ar_written",
        article_bundle: JSON.stringify(bundle),
      });
      if (upd4) throw new Error(upd4);
      results.ar = { words: ar.words, source: ar.source };
    } else {
      results.ar = { resumed: true };
    }

    // Quality signal only — P4 is responsible for expanding short drafts.
    const wcEn = countWords((parseBundle().content_en?.markdown) || "");
    const wcAr = countWords((parseBundle().content_ar?.markdown) || "");

    return NextResponse.json({ ok: true, step: "p2", queueId: qi.id, ...results, wcEn, wcAr });
  } catch (e: any) {
    console.error("[blog/p2-content] Error:", e?.message || e);
    if (queueId) await markQueueItemFailed(queueId, `p2: ${e?.message || "Unknown"}`);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
