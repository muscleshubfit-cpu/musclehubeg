-- =====================================================================
--  MuscleHubEG — Unified Run Script for Migration 0023
--
--  Applies:
--    0023 — Blog pipeline v2 housekeeping: marks queue rows stuck in
--           legacy v1 statuses as FAILED before switching to the new
--           six-phase pipeline (P0 research → P5 publish). No other
--           schema change is needed (article_bundle jsonb covers all
--           phase artifacts).
--
--  IDEMPOTENT: safe to re-run.
--
--  How to run:
--    1. Open: https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy/sql/new
--    2. Paste this entire file.
--    3. Click Run.
--    4. Check the VERIFY output at the bottom:
--       stale_legacy_rows must be 0 · idx_ok must be 1.
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════
--  MIGRATION 0023 — Legacy v1 queue cleanup + status index
-- ═══════════════════════════════════════════════════════════════

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

CREATE INDEX IF NOT EXISTS idx_blog_queue_status_v2
  ON public.blog_generation_queue (status, created_at DESC);

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
--  VERIFY — expected result row:
--   stale_legacy_rows = 0 · idx_ok = 1
-- ═══════════════════════════════════════════════════════════════

SELECT
  (SELECT count(*) FROM public.blog_generation_queue
    WHERE status IN ('topic_picked','researching','research_done',
                     'generating_en','en_done','generating_ar',
                     'ar_done','generating_links'))      AS stale_legacy_rows,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_blog_queue_status_v2')        AS idx_ok;
