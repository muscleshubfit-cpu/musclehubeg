-- ============================================================================
-- 0063 — SCHEMA DRIFT BACKFILL (Phase 96 migration audit, 2026-09-02)
-- ============================================================================
-- WHY THIS FILE EXISTS
--   The Phase 96 audit (scripts/migration_audit.py) cross-checked ALL 73
--   migration files against src/lib/supabase/types.ts (the mirror of the
--   LIVE production schema). Result: 4 objects are LIVE in production and
--   actively used by app code, but NO migration file in this repo defines
--   them. They were created ad-hoc on Supabase during the Phase 5 era
--   (already suspected — see AGENTS.md §6 «meal_plans, plan_swaps,
--   progress_photos, coach_presence» note) and never backfilled.
--     1. public.plan_swaps        — used by refund.ts (7-day refund
--                                   eligibility), data/plans.ts, tier-limits.ts
--     2. public.coach_presence    — used by data/coach.ts (online/offline)
--     3. public.progress_photos   — used by data/progress.ts (photo uploads)
--     4. public.referrals.last_seen — nullable timestamptz
--   Consequence if left unfixed: a fresh environment rebuilt from this repo
--   would MISS all four — refunds, coach presence and progress photos would
--   crash there. On PRODUCTION this file is a guaranteed NO-OP (every object
--   already exists; IF NOT EXISTS / IF NOT EXISTS everywhere).
--
-- COLUMN TYPES come from src/lib/supabase/types.ts (generated FROM the live
-- database) — not from guesswork. Relationships:[] in the mirror proves
-- production has NO FK constraints on these tables — faithfully mirrored
-- (adding FKs the live DB does not have would change behavior).
--
-- DELIBERATE OMISSION — RLS/POLICIES (deviation from §6 documented):
--   §6 mandates RLS policies for new tables. These tables are NOT new on
--   production, and the live policy/RLS state cannot be read from here —
--   blind `drop policy / create policy` statements could ALTER live
--   behavior, which the owner explicitly forbids. Production is untouched
--   by this file; the companion script `supabase/migrations/
--   VERIFY_SCHEMA_DRIFT.sql` (owner runs once in the SQL Editor) prints the
--   REAL RLS + policy state so policies are reconciled FROM TRUTH in a
--   follow-up migration if any gap is found.
-- Safe to re-run. No data is modified or removed.
-- ============================================================================

-- ---------------------------------------------------------------
-- 1) plan_swaps — plan regeneration / swap ledger (refund input)
-- ---------------------------------------------------------------
create table if not exists public.plan_swaps (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  plan_id    uuid,
  swap_type  text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 2) coach_presence — coach online/offline heartbeat
-- ---------------------------------------------------------------
create table if not exists public.coach_presence (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null,
  status    text not null,
  last_seen timestamptz not null
);

-- ---------------------------------------------------------------
-- 3) progress_photos — member progress photo tracker
--    (file_path points into the `progress-photos` storage bucket,
--     taken_on is a calendar date — data/progress.ts writes date strings)
-- ---------------------------------------------------------------
create table if not exists public.progress_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  file_path  text not null,
  taken_on   date not null,
  note       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 4) referrals.last_seen — nullable timestamptz (legacy ad-hoc column)
-- ---------------------------------------------------------------
alter table public.referrals
  add column if not exists last_seen timestamptz;

-- ---------------------------------------------------------------
-- 5) Reload PostgREST schema cache (fresh environments only; no-op
--    on production where nothing changed)
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';
