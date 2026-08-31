-- ============================================================
-- 20260831160000_github_sync_probe_pr.sql
-- Phase 61 — probe #2: PR-merge trigger test (safe marker only)
-- Applied via PR merge into main if the integration triggers on merge.
-- ============================================================

create table if not exists public.gh_sync_probe (
  id int primary key,
  note text not null,
  created_at timestamptz not null default now()
);

insert into public.gh_sync_probe (id, note)
values (2, 'github-sync-probe-pr-merge 2026-08-31 — applied via PR merge into main')
on conflict (id) do nothing;
