-- ============================================================================
-- 0058 — ADMIN EXTERNAL PLANS (Phase 71, owner request 2026-09-01)
-- ============================================================================
-- Owner request:
--   «ضيف فى داشبورد الادمن طريقة توليد خطط تدريب وتغذية خارج الاعضاء
--    مع كتابة التفاصيل يدوى»
--   = a manual plan-writing tool in the admin console for people who are
--   NOT members. The regular plans table cannot hold them (client_id is
--   NOT NULL → every row must belong to a registered profile).
--
-- Design:
--   - external_plans: one row per plan (workout | meal) hand-typed by an
--     admin for an external person (name + optional contact written manually).
--   - content jsonb = { text: string } — same shape as plans.content, so
--     copy/download formatting stays trivial.
--   - ADMIN-ONLY: RLS grants every verb to is_admin() and nobody else.
--     The app reaches it through /api/admin/external-plans (requireAdmin +
--     service role) — RLS is defense in depth (post-0055 posture).
--   - UNLIMITED: no caps, no quotas — owner decree «الادمن بلا حدود في كل
--     وظائف الموقع».
-- All statements idempotent — safe to re-run.
-- ============================================================================

-- ============================================================
-- 1. Table
-- ============================================================
create table if not exists public.external_plans (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  person_contact text,
  plan_type text not null check (plan_type in ('workout','meal')),
  title text not null,
  notes text,
  content jsonb not null default '{"text": ""}'::jsonb,
  status text not null default 'final' check (status in ('draft','final')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_external_plans_type
  on public.external_plans(plan_type);
create index if not exists idx_external_plans_created
  on public.external_plans(created_at desc);

-- ============================================================
-- 2. RLS — admin only, every verb
-- ============================================================
alter table public.external_plans enable row level security;

drop policy if exists external_plans_admin_all on public.external_plans;
create policy external_plans_admin_all
  on public.external_plans
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 3. updated_at maintenance (same helper the affiliate tables use)
-- ============================================================
drop trigger if exists trg_external_plans_updated_at on public.external_plans;
create trigger trg_external_plans_updated_at
  before update on public.external_plans
  for each row execute function public.update_updated_at();

-- ============================================================
-- 4. Reload PostgREST schema cache (new table must be visible
--    to the REST layer immediately)
-- ============================================================
notify pgrst, 'reload schema';
