-- =====================================================================
--  MuscleHubEG — Unified Run Script for Migrations 0021 + 0022
--
--  Applies:
--    0021 — blog_generation_queue.topic_ar + focus_keyword_ar
--           (EN/AR topic-separation columns, fixes PGRST204 hard-fail)
--    0022 — evo_chat_usage tamper-proof server-side ledger
--           (server counts EVO daily usage — browser can no longer
--            fake or reset the limit)
--
--  IDEMPOTENT: safe to re-run (IF NOT EXISTS / DROP+CREATE everywhere).
--
--  How to run:
--    1. Open: https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy/sql/new
--    2. Paste this entire file.
--    3. Click Run.
--    4. Check the VERIFY block output at the bottom:
--       all four flags must be true / >= 1.
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════
--  MIGRATION 0021 — Blog queue EN/AR topic columns
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.blog_generation_queue
  ADD COLUMN IF NOT EXISTS topic_ar text DEFAULT '';

ALTER TABLE public.blog_generation_queue
  ADD COLUMN IF NOT EXISTS focus_keyword_ar text DEFAULT '';

-- ═══════════════════════════════════════════════════════════════
--  MIGRATION 0022 — Tamper-proof EVO chat usage ledger
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.evo_chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evo_chat_usage_user_created
  ON public.evo_chat_usage (user_id, created_at DESC);

ALTER TABLE public.evo_chat_usage ENABLE ROW LEVEL SECURITY;

-- Read-your-own-usage only (optional client visibility).
DROP POLICY IF EXISTS "users_select_own_usage" ON public.evo_chat_usage;
CREATE POLICY "users_select_own_usage"
  ON public.evo_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

-- NOTE: intentionally NO INSERT / UPDATE / DELETE policies.
-- Writes happen exclusively through the server-side service-role key
-- (RLS bypass), so users cannot create, modify, or delete their own
-- usage evidence from the browser.

-- ═══════════════════════════════════════════════════════════════
--  POSTGREST SCHEMA RELOAD
-- ═══════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
--  VERIFY — expected result row:
--   topic_ar_ok = t · focus_keyword_ar_ok = t
--   evo_chat_usage_ok = 1 · select_policy_ok = 1
-- ═══════════════════════════════════════════════════════════════

SELECT
  (SELECT count(*) > 0 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_generation_queue'
      AND column_name = 'topic_ar')                  AS topic_ar_ok,
  (SELECT count(*) > 0 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_generation_queue'
      AND column_name = 'focus_keyword_ar')          AS focus_keyword_ar_ok,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'evo_chat_usage')             AS evo_chat_usage_ok,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evo_chat_usage'
      AND policyname = 'users_select_own_usage')     AS select_policy_ok;
