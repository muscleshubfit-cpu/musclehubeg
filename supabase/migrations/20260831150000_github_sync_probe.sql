-- ============================================================
-- 20260831150000_github_sync_probe.sql
-- Phase 61 — GitHub→Supabase auto-apply PROBE (safe marker only)
-- Purpose: verify that the owner's new Supabase GitHub integration
--          applies migrations automatically from the main branch.
-- Contains NO product changes. Safe to keep; can be dropped later.
-- Naming: 14-digit timestamp prefix = the format the GitHub
--         integration recognizes (older RUN_ON_SUPABASE_* files
--         were manual-run files and are intentionally ignored).
-- ============================================================

create table if not exists public.gh_sync_probe (
  id int primary key,
  note text not null,
  created_at timestamptz not null default now()
);

insert into public.gh_sync_probe (id, note)
values (1, 'github-sync-probe 2026-08-31 — applied automatically from main branch')
on conflict (id) do nothing;
