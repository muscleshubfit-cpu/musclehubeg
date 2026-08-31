-- ============================================================
-- RUN_ON_SUPABASE_0054_REPAIR_MIGRATION_LEDGER.sql
-- Phase 61 — one-time repair: clear the CLI/integration migration
--             ledger so the GitHub integration can start clean.
--
-- WHY: every GitHub deployment fails with
--      "Remote migration versions not found in local migrations directory"
--      because supabase_migrations.schema_migrations contains old
--      versions that have no matching file in supabase/migrations.
--
-- SAFETY: this table is bookkeeping ONLY (a list of migration files
--      previously applied through the CLI). It contains NO product
--      data. All real tables/data were created via SQL Editor runs
--      and are NOT touched by this script. Nothing was ever applied
--      through this ledger in this project (verified: probe tables
--      never appeared), so clearing it cannot lose any schema.
--
-- RUN: Supabase Dashboard → SQL Editor → paste → Run → reply تم
-- ============================================================

-- 1) Show what is recorded (for the record/documentation)
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 2) Clear the ledger (bookkeeping only — no schema/data touched)
delete from supabase_migrations.schema_migrations;

-- 3) Verify: must return 0
select count(*) as remaining_rows
from supabase_migrations.schema_migrations;
