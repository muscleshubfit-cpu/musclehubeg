-- ============================================================
-- RUN_ON_SUPABASE_0026_LANG_SPLIT.sql
--
-- OWNER DIRECTIVE (2026-08-27): EN and AR article generation are
-- now FULLY SEPARATE pipelines — 3 articles/day per language, at
-- each language's own optimal publish times. One queue row from
-- today represents ONE article in ONE language.
--
-- SCHEMA IMPACT:
--   1. NEW COLUMN  `language` ('en' | 'ar') on blog_generation_queue.
--   2. Legacy dual-language rows (one row carrying BOTH languages in
--      its bundle) are marked 'failed' so the new single-language
--      routes never try to reprocess a mixed artifact — same policy
--      as 0023 for legacy v1 rows.
--   3. Published / skipped rows are historical records: left as-is,
--      tagged with their publication language for admin reporting
--      (en_post_id present → 'en', otherwise 'ar').
--
-- IDEMPOTENT: safe to re-run.
-- AFTER APPLYING ON PRODUCTION: run  NOTIFY pgrst, 'reload schema';
--   (already included as the final statement).
-- ============================================================

-- 1) New column ---------------------------------------------------
ALTER TABLE public.blog_generation_queue
  ADD COLUMN IF NOT EXISTS language text;

-- Tag every legacy row so nothing stays NULL after this migration.
UPDATE public.blog_generation_queue
SET language = CASE WHEN en_post_id IS NULL AND ar_post_id IS NOT NULL
                    THEN 'ar' ELSE 'en' END
WHERE language IS NULL;

-- 2) Supersede unfinished LEGACY dual-language work ---------------
--    (any row still mid-flight belongs to the old coupled pipeline)
UPDATE public.blog_generation_queue
SET status = 'failed',
    error_message = COALESCE(error_message || ' | ', '') ||
      'lang-split-2026-08-27: legacy dual-language pipeline superseded'
WHERE status IN (
  'researched', 'outlined',
  'writing_en', 'en_written', 'writing_ar', 'ar_written',
  'images_done', 'reviewed'
);

-- 3) Per-language index helper (admin debugging + audits) ---------
CREATE INDEX IF NOT EXISTS idx_blog_queue_language_v3
  ON public.blog_generation_queue (language, created_at DESC);

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFY (run this SELECT after applying — expected result):
--   • every row shows language = 'en' or 'ar' (no NULL/empty)
--   • no rows remain in legacy mid-flight statuses listed above
-- ============================================================
-- SELECT language, status, count(*) AS rows
-- FROM public.blog_generation_queue
-- GROUP BY language, status
-- ORDER BY language NULLS FIRST, status;

