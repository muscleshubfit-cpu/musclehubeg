-- ============================================================
-- RUN_ON_SUPABASE_0028_EVO_ANON_USAGE.sql
--
-- T-AI-DEEP-AUDIT-V2 (D3 fix, 2026-08-28): tamper-proof SERVER-SIDE
-- throttling for ANONYMOUS EVO chat traffic.
--
-- WHY: evo_chat_usage.user_id is a uuid FK to auth.users, so visitors
-- without an account had NO server-side quota at all — a scripted loop
-- could dispatch unlimited /api/ai/chat calls and bleed OpenRouter/Groq
-- credits (the old route documented this as "out of scope"). Anonymous
-- visitors now get the FREE tier daily limit (10/day) keyed by a
-- SALTED SHA-256 of the client IP. No raw IPs are ever stored.
--
-- DESIGN (mirrors 0022):
--   * One row per allowed anonymous dispatch. The SERVER inserts BEFORE
--     calling the AI provider (record-before-dispatch → burst-safe).
--   * RLS is ENABLED but NO policies — only the service_role key
--     (supabaseAdmin) can read/write. Nothing is browser-writable.
--   * anon_key text (hashed), NOT a uuid FK — anonymous visitors have
--     no auth.users row by definition.
--
-- OWNER MANUAL STEP (one-time): run this file in Supabase SQL Editor.
-- UNTIL THEN: /api/ai/chat anonymous checks fail OPEN (count 0) and
-- logging-in users are unaffected — the route degrades gracefully.
--
-- Raw link:
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0028_EVO_ANON_USAGE.sql
--
-- IDEMPOTENT: safe to re-run (IF NOT EXISTS everywhere).
-- AFTER APPLYING ON PRODUCTION: run  NOTIFY pgrst, 'reload schema';
-- ============================================================

CREATE TABLE IF NOT EXISTS public.evo_anon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_key text NOT NULL,
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evo_anon_usage_key_created
  ON public.evo_anon_usage (anon_key, created_at DESC);

ALTER TABLE public.evo_anon_usage ENABLE ROW LEVEL SECURITY;

-- NOTE: intentionally NO SELECT/INSERT/UPDATE/DELETE policies.
-- Rows carry only a salted IP hash (never a raw IP, never user data);
-- all reads/writes happen through the server-side service-role client.
-- Housekeeping (optional, run occasionally):
--   DELETE FROM public.evo_anon_usage WHERE created_at < now() - interval '30 days';
