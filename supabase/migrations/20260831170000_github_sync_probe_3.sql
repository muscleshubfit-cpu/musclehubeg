-- ============================================================
-- 20260831170000_github_sync_probe_3.sql
-- Phase 61 — probe #3: first merge test WITH config.toml present.
-- Safe marker only (row id=3). Expect rows 1+2+3 after backfill.
-- ============================================================

insert into public.gh_sync_probe (id, note)
values (3, 'github-sync-probe-3 2026-08-31 — merge after config.toml added')
on conflict (id) do nothing;
