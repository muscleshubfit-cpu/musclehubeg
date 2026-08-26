-- ============================================================
-- 0022_evo_chat_usage.sql
--
-- Tamper-proof server-side EVO chat usage ledger.
--
-- WHY: /api/ai/chat previously counted a user's daily messages from the
-- `chat_messages` table — rows written by the BROWSER via fire-and-forget
-- inserts (audit finding G1/G2). A scripted client that skips the insert,
-- or any path that deletes the user's chat_messages, could bypass or reset
-- the daily limit while still consuming OpenRouter/Groq credits.
--
-- DESIGN:
--   * One row per allowed EVO chat dispatch. The SERVER inserts BEFORE
--     calling the AI provider (record-before-dispatch → burst-safe).
--   * RLS is ENABLED but NO policies grant INSERT/UPDATE/DELETE to users —
--     only the service_role key (supabaseAdmin) can write. Users cannot
--     create, modify, or delete their own usage evidence.
--   * SELECT is granted to the row owner so users/clients could later show
--     "messages used today" in UI without exposing other users' rows.
--
-- IDEMPOTENT: safe to re-run (IF NOT EXISTS everywhere).
-- AFTER APPLYING ON PRODUCTION: run  NOTIFY pgrst, 'reload schema';
-- ============================================================

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
-- Writes happen exclusively through the server-side service-role client
-- (RLS BYPASS), making the ledger tamper-proof from the browser.
