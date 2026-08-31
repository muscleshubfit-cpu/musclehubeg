-- ============================================================
-- 0023_pipeline_v2_statuses.sql
--
-- Blog pipeline v2 (owner directive 2026-08-27) — six AI phases:
--   P0 keyword/topic research → P1 outline → P2 content (1500-2500
--   words) → P3 images (modesty-guarded) → P4 quality review →
--   P5 publish (+ auto sitemap).
--
-- SCHEMA IMPACT: none required. `article_bundle` jsonb already stores
-- every phase artifact, and `status` is unconstrained text.
--
-- WHAT THIS MIGRATION DOES:
--   Any queue row stuck mid-flight in a LEGACY v1 status (the v1
--   step routes are removed by the same release) is marked FAILED so
--   the new P0 can start cleanly. Published/skipped rows are left as-is
--   (they are historical records).
--
-- IDEMPOTENT: safe to re-run (only touches legacy statuses).
-- AFTER APPLYING ON PRODUCTION: run  NOTIFY pgrst, 'reload schema';
-- ============================================================

UPDATE public.blog_generation_queue
SET status = 'failed',
    error_message = COALESCE(error_message || ' | ', '') ||
      'pipeline-v2: legacy v1 status superseded (' || status || ')'
WHERE status IN (
  'topic_picked',
  'researching',
  'research_done',
  'generating_en',
  'en_done',
  'generating_ar',
  'ar_done',
  'generating_links'
);

-- New-status index helper: the v2 runner polls nothing by status (it uses
-- exact queueId), but keep an index on updated layout for admin debugging.
CREATE INDEX IF NOT EXISTS idx_blog_queue_status_v2
  ON public.blog_generation_queue (status, created_at DESC);

NOTIFY pgrst, 'reload schema';

