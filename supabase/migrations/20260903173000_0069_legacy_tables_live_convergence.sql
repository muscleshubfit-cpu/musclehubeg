-- =====================================================================
-- 0069 — LEGACY TABLES LIVE CONVERGENCE (Phase 105)
-- =====================================================================
-- Incident lineage (why this exists):
--   Phase 5 created coach_presence + progress_photos AD-HOC on production.
--   0063 (schema_drift_backfill) re-declared them from the WRONG types.ts
--   mirror (coach_presence: user_id/status · progress_photos:
--   file_path/taken_on/note). On PRODUCTION 0063 was a deliberate no-op
--   (tables already existed), so the mirror fiction stayed invisible until
--   Phase 99-run proved the LIVE columns:
--     coach_presence   : id · coach_id · last_seen · updated_at
--     progress_photos  : id · user_id · photo_url · taken_at · created_at
--   That fiction aborted 0066 v1 with 42703, halted the whole pipeline at
--   0064 v1 (two phantom index columns), and kept the app's photo list +
--   presence helpers silently broken (Phase 105 fixes the app side).
--
-- What this migration does:
--   1. PRODUCTION: every statement is a no-op (add column if not exists /
--      drop column if exists — the live tables already have the target
--      shape) and the data-copy block is information_schema-gated — zero
--      touching.
--   2. FRESH environments: 0063 created the two tables with the WRONG
--      mirror columns — this converges them to the proven LIVE shape so
--      mirror ↔ migrations finally agree (types.ts Phase 105).
--      NOTE (honest limitation): a truly fresh pipeline still halts at
--      0064 v2 (its indexes reference taken_at/coach_id BEFORE this file
--      runs — old migrations are immutable per INDEX LAW). Fresh installs
--      need the bootstrap pre-step documented in the clean-copy kit; on
--      any environment where 0064 succeeded (i.e. prod-shaped tables),
--      this file is a pure no-op safety net.
--
-- Style law (Phase 105): every ALTER stays on ONE line at top level so
-- scripts/migration_audit.py (line-oriented) sees the effective shape —
-- only the guarded data-copy UPDATEs live inside the dollar-quoted block.
--
-- Safety: idempotent both directions · auth.users untouched · RLS
-- untouched (0064/0065 policies reference user_id on progress_photos
-- which EXISTS live and survives here).
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) widen to the LIVE shape first (no-op on production)
-- ---------------------------------------------------------------
alter table public.coach_presence add column if not exists coach_id uuid;
alter table public.coach_presence add column if not exists updated_at timestamptz;
alter table public.progress_photos add column if not exists photo_url text;
alter table public.progress_photos add column if not exists taken_at timestamptz;

-- ---------------------------------------------------------------
-- 2) copy legacy data ONLY where the phantom mirror columns still exist
--    (fresh 0063-shaped tables). On production every guard is false.
--    The 0064 v1 lesson: NEVER reference a column unconditionally.
-- ---------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'coach_presence'
      and column_name = 'user_id'
  ) then
    update public.coach_presence set coach_id = user_id where coach_id is null;
    update public.coach_presence set updated_at = last_seen where updated_at is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'progress_photos'
      and column_name = 'file_path'
  ) then
    update public.progress_photos set photo_url = file_path where photo_url is null;
    update public.progress_photos set taken_at = taken_on::timestamptz where taken_at is null and taken_on is not null;
  end if;
end $$;

-- ---------------------------------------------------------------
-- 3) drop the phantom mirror columns (no-op on production — they do not
--    exist there; drops run AFTER the copy above on fresh environments).
--    The note column never stored anything anywhere (the app's insert
--    failed silently — Phase 105), so dropping it loses nothing.
-- ---------------------------------------------------------------
alter table public.coach_presence drop column if exists user_id;
alter table public.coach_presence drop column if exists status;
alter table public.progress_photos drop column if exists file_path;
alter table public.progress_photos drop column if exists taken_on;
alter table public.progress_photos drop column if exists note;

-- ---------------------------------------------------------------
-- 4) refresh PostgREST schema cache (idempotent)
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';

-- =====================================================================
-- VERIFY (fresh-converged environment — expect |1|1|1|1|):
--   select count(*) from information_schema.columns
--    where table_name='coach_presence' and column_name='coach_id'      → 1
--   select count(*) from information_schema.columns
--    where table_name='coach_presence' and column_name='status'        → 0
--   select count(*) from information_schema.columns
--    where table_name='progress_photos' and column_name='photo_url'    → 1
--   select count(*) from information_schema.columns
--    where table_name='progress_photos' and column_name='file_path'    → 0
-- On PRODUCTION every probe matches BEFORE and AFTER (pure no-op).
-- =====================================================================
