import { NextRequest, NextResponse } from "next/server";
import { buildOutline, pickTopicIndex, type OutlinePlan } from "@/lib/blog-pipeline";
import type { LanguageResearch } from "@/lib/blog-research";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  requireRowLang,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getRecentPostsByLanguage, isDuplicateTopic } from "@/lib/blog-topics";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * PIPELINE V3 · PHASE 1 — Topic choice + detailed outline (ONE language).
 * The row's `language` column decides everything. Picks ONE of the 5
 * researched topics (model-ranked + hard duplicate guard against THIS
 * language's recent posts) then builds: SEO title, subtitle, meta
 * description, slug base, 5-7 H2 outline, LSI keywords and a 3-5 image
 * plan. Bundle stays FLAT: { research0, outline }.
 *
 * GET /api/cron/blog/p1-outline?queueId=<uuid>
 */
async function guardDuplicate(
  lang: "en" | "ar",
  candidates: string[],
): Promise<string> {
  const idx = await pickTopicIndex(lang, candidates);
  let topic = candidates[idx] ?? candidates[0];
  try {
    const recent = await getRecentPostsByLanguage(lang, 100);
    if (recent.some((p) => isDuplicateTopic(topic, topic, [p]).duplicate)) {
      topic =
        candidates.find(
          (t) => !recent.some((p) => isDuplicateTopic(t, t, [p]).duplicate),
        ) ?? topic;
    }
  } catch {
    /* dup-guard is best-effort */
  }
  return topic;
}

function pickKeyword(r: LanguageResearch, topic: string): string {
  const lower = topic.toLowerCase();
  const hit = r.keywords.find(
    (k) =>
      lower.includes(k.keyword.toLowerCase()) ||
      k.keyword.toLowerCase().includes(lower),
  );
  return hit?.keyword || r.keywords[0]?.keyword || topic.slice(0, 60);
}

export async function GET(request: NextRequest) {
  // M6 (audit 2026-09-07): constant-time CRON_SECRET check.
  if (!verifyCronAuth(request))
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

    const lang = requireRowLang(qi);

    const statusErr = validateQueueStatus(qi, "researched");
    if (statusErr) {
      if (qi.status === "outlined")
        return NextResponse.json({ ok: true, step: "p1", queueId: qi.id, lang, idempotent: true });
      if (qi.status !== "failed")
        return NextResponse.json(
          { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
          { status: 409 },
        );
      console.warn(`[blog/p1-outline] Re-processing previously failed item ${qi.id}`);
    }

    // FLAT artifact — V3 rows carry exactly ONE language's research.
    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};
    const r0 = bundle.research0 as LanguageResearch | undefined;
    if (!r0?.topics?.length) {
      throw new Error("research0 artifact missing on queue item — rerun p0-research");
    }

    const topic = await guardDuplicate(lang, r0.topics);
    const outlineResult = await buildOutline(lang, topic, r0);

    const updatedBundle = JSON.stringify({
      ...bundle,
      outline: outlineResult.outline,
    });

    const updateErr = await updateQueueItem(qi.id, {
      topic,
      // Reporting convenience for AR rows only — EN pipeline leaves the
      // legacy columns untouched.
      ...(lang === "ar" ? { topic_ar: topic } : {}),
      focus_keyword: pickKeyword(r0, topic),
      ...(lang === "ar" ? { focus_keyword_ar: pickKeyword(r0, topic) } : {}),
      status: "outlined",
      article_bundle: updatedBundle,
    });
    if (updateErr) throw new Error(updateErr);

    const o: OutlinePlan = outlineResult.outline;
    return NextResponse.json({
      ok: true,
      step: "p1",
      queueId: qi.id,
      lang,
      title: o.title,
      sections: o.sections.length,
      lsi: o.lsiKeywords.length,
      imagePlan: o.imagePlan.length,
      source: outlineResult.source,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[blog/p1-outline] Error:", msg);
    if (queueId) await markQueueItemFailed(queueId, `p1: ${msg || "Unknown"}`);
    return NextResponse.json({ error: msg || "Failed" }, { status: 500 });
  }
}
