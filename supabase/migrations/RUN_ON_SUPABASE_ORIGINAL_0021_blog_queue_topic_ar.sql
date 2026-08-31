-- ============================================================
-- 0021_blog_queue_topic_ar.sql
--
-- Back-fill the EN/AR-separated blog pipeline columns on
-- `blog_generation_queue`.
--
-- WHY: step1-pick inserts `topic_ar` and `focus_keyword_ar` (EN/AR
-- separation feature) but NO prior migration created these columns — they
-- were only added ad-hoc (or not at all) on production. A fresh Supabase
-- project from migrations alone would break Step 1 with PGRST204, stalling
-- the whole pipeline. This is the same drift class previously seen with
-- `generated_at` (MH-QUEUE-HANDOFF-007).
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS — safe to re-run.
-- AFTER APPLYING ON PRODUCTION: run  NOTIFY pgrst, 'reload schema';
-- ============================================================

ALTER TABLE public.blog_generation_queue
  ADD COLUMN IF NOT EXISTS topic_ar text DEFAULT '';

ALTER TABLE public.blog_generation_queue
  ADD COLUMN IF NOT EXISTS focus_keyword_ar text DEFAULT '';
