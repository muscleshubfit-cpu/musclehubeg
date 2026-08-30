-- ============================================================================
-- RUN_ON_SUPABASE_0045_COACHING_PRODUCT_FIX_TEST_ACCOUNTS.sql
-- MuscleHubEG — migration 0045 (owner run: Supabase SQL Editor, single paste,
-- single transaction, ONE final grid at the end — the editor shows the last
-- statement's grid only).
--
-- OWNER COMPLAINT (2026-08-30): «منتج كوتشينج لا تفعل شىء»
-- ROOT CAUSES (live-verified against prod data):
--   1. The /coaching page sold LEGACY products Starter ($20) / Elite ($40).
--      6 REAL subscriptions (Aug 11–27) were created with tier='starter' or
--      'elite' — but the tier resolver (server + client) only knows
--      premium / pro / coaching, so every one of those paying clients
--      resolved as FREE: they paid and got nothing.
--   2. The $39.99 site-coaching product could never be bought:
--      /checkout?tier=coaching rendered a dead "back to memberships" page.
--
-- PART A — COACHING PRODUCT FIX (data + guard):
--   A1. Remap legacy rows to the model tiers:
--         subscriptions.tier            starter → premium,  elite → pro
--         subscription_requests.plan_tier  same mapping
--       Mapping rationale (owner model decree 2026-08-30): Starter/Elite
--       were the site's paid access products; premium ($14.99) and pro
--       ($29.99) are the same products' successors. Elite buyers paid MORE
--       than pro's monthly price, so elite → pro loses nobody anything.
--   A2. CHECK guard: subscriptions.tier restricted to the model tiers
--       ('premium','pro','coaching') so the dead tiers can never come back
--       through ANY writer (RPC, RLS-insert, service role, editor).
--       Added inside a DO block with an exception handler: if unexpected
--       tier values still exist the constraint is skipped and the final
--       grid shows the offending values instead of hard-failing the run.
--
-- PART B — TEST ACCOUNTS (owner request): «ضيف فى داشبورد الادمن طريقة
--           للتعليم على الحسابات وزرار مسح»
--   B1. profiles.is_test_account boolean NOT NULL DEFAULT false — the flag
--       the new admin Accounts surface (/admin/accounts) toggles; test
--       accounts get a visible badge in the admin dashboard.
--   B2. profiles_update_admin RLS policy (public.is_admin(), same idiom as
--       0043) — defense-in-depth so admins can toggle the flag even when a
--       future code path uses the anon client instead of the service role.
--       NOTE: the delete half of the feature runs through the service-role
--       API route (/api/admin/accounts DELETE → auth.admin.deleteUser with
--       FK cascades) — no RLS policy can express that, by design.
--
-- IDEMPOTENT: safe to re-run (IF NOT EXISTS / conditional DO blocks).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- PART A1 — legacy tier remap (row counts captured for the final grid)
-- ─────────────────────────────────────────────────────────────────────────

create temp table if not exists _mh0045_probe (
  k text primary key,
  v text
) on commit drop;

delete from _mh0045_probe;

do $$
declare
  v_subs      bigint := 0;
  v_reqs      bigint := 0;
  v_n         bigint;
begin
  update public.subscriptions set tier = 'premium' where tier = 'starter';
  get diagnostics v_n = row_count; v_subs := v_subs + v_n;

  update public.subscriptions set tier = 'pro' where tier = 'elite';
  get diagnostics v_n = row_count; v_subs := v_subs + v_n;

  update public.subscription_requests set plan_tier = 'premium' where plan_tier = 'starter';
  get diagnostics v_n = row_count; v_reqs := v_reqs + v_n;

  update public.subscription_requests set plan_tier = 'pro' where plan_tier = 'elite';
  get diagnostics v_n = row_count; v_reqs := v_reqs + v_n;

  insert into _mh0045_probe values
    ('remapped_subscription_rows', v_subs::text),
    ('remapped_request_rows',      v_reqs::text);
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- PART A2 — tier guard (never fail the run; outcome lands in the final grid)
-- ─────────────────────────────────────────────────────────────────────────

-- Remaining distinct tiers BEFORE the guard attempt (audit visibility).
do $$
declare
  r record;
  bad text;
begin
  bad := '';
  for r in
    select tier, count(*)::int as n
    from public.subscriptions
    where tier not in ('premium', 'pro', 'coaching')
    group by tier
  loop
    bad := bad || format('%s(x%s) ', r.tier, r.n);
  end loop;
  insert into _mh0045_probe values
    ('unexpected_tier_values_before_guard', nullif(bad, ''));
end $$;

do $$
begin
  begin
    alter table public.subscriptions
      add constraint subscriptions_tier_model_guard
      check (tier in ('premium', 'pro', 'coaching'));
    insert into _mh0045_probe values ('tier_guard_added', 'true');
  exception when others then
    insert into _mh0045_probe values
      ('tier_guard_added', 'false: ' || sqlerrm);
  end;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- PART B1 — test-account flag
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists is_test_account boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────
-- PART B2 — admin update policy (is_admin idiom, mirrors 0043)
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- FINAL GRID — the ONLY output the owner sees (single statement, one grid):
--   remapped_subscription_rows   → how many legacy subs were fixed (expect 6)
--   remapped_request_rows        → legacy pending/approved requests fixed
--   tier_values_now              → distinct subscription tiers after remap
--   unexpected_tier_values       → must be NULL (else guard was skipped)
--   tier_guard_added             → true = dead tiers blocked at DB level
--   test_flag_present            → true
--   test_flag_total / test_flag_on
--   admin_update_policy_present  → true
-- ============================================================================

select
  (select coalesce(v, '0') from _mh0045_probe
    where k = 'remapped_subscription_rows')                    as remapped_subscription_rows,
  (select coalesce(v, '0') from _mh0045_probe
    where k = 'remapped_request_rows')                         as remapped_request_rows,
  (select string_agg(tier, ', ') from
    (select distinct tier from public.subscriptions) d)        as tier_values_now,
  (select v from _mh0045_probe
    where k = 'unexpected_tier_values_before_guard')           as unexpected_tier_values,
  (select v from _mh0045_probe
    where k = 'tier_guard_added')                              as tier_guard_added,
  (select count(*)::text from public.profiles
    where is_test_account)                                     as test_flag_on,
  (select count(*)::text from public.profiles)                 as test_flag_total,
  exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename   = 'profiles'
      and policyname  = 'profiles_update_admin'
  )                                                            as admin_update_policy_present;

-- END OF SCRIPT 0045
