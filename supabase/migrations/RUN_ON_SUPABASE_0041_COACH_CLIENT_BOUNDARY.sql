-- =====================================================================
-- RUN ON SUPABASE — 0041 COACH CLIENT BOUNDARY (owner decrees 2026-08-30)
-- =====================================================================
-- OWNER REPORTS:
--   (1) «المدرب شايف اشتراك العميل فى الموقع نفسه (عضويات الموقع) ده خطأ»
--   (2) «المدرب قدر يولد خطط للعميل بدون ما يدفع او يفعل اشتراك العميل»
-- APP SIDE (this commit): plan gen + manual plans gated on ACTIVE coaching
--   sub (/api/ai/jobs + /api/plans/normalize); coach activates coaching ONLY.
-- THIS MIGRATION closes both holes at DB level:
--   A. get_coach_client_list(): coach → ONLY coaching sub columns;
--      admin → best tier. (Also: status now reads the SAME row as tier.)
--   B. subscriptions RLS: coach selects coaching rows only; direct
--      insert/update REVOKED (it bypassed the wallet debit) — the only
--      door is /api/coach/subscriptions/activate (service role + wallet).
--   C. plans RLS: coach inserts (manual + AI draft) need an ACTIVE
--      coaching subscription; admins exempt.
-- Idempotent (drop+create). No tables dropped, no grants changed.
-- REV 2 (2026-08-30): VERIFY section fixed — information_schema.policies
--   does NOT exist in Postgres → pg_policies; plans_insert_coach is a
--   POLICY, not a function → verified via pg_policies.with_check.
--   DDL (Parts A/B/C) untouched. First run rolled back (single txn) —
--   RE-RUN THE WHOLE SCRIPT.
-- PASTE SAFETY: raw url only → SQL Editor → Ctrl+End must show:
--   END OF SCRIPT 0041   → Run → expect: Success. No rows returned
-- =====================================================================

-- ============================================================
-- PART A — get_coach_client_list(): role-aware subscription columns
-- ============================================================
create or replace function public.get_coach_client_list()
returns table (
  client_id uuid,
  client_email text,
  client_full_name text,
  client_phone text,
  client_avatar_url text,
  client_created_at timestamptz,
  sub_tier text,
  sub_status text,
  sub_end_date timestamptz,
  sub_months int,
  pending_payments int,
  nutri_q_status text,
  fit_q_status text,
  assigned_coach_id uuid,
  assigned_coach_name text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.created_at,

    -- 0041 BOUNDARY: coach → coaching sub only; admin → best tier.
    -- All four sub_* columns read the SAME row (old bug: mismatch).
    (
      select s.tier
      from public.subscriptions s
      where s.client_id = p.id
        and (public.is_admin() or s.tier = 'coaching')
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ),
    (
      select s.status
      from public.subscriptions s
      where s.client_id = p.id
        and (public.is_admin() or s.tier = 'coaching')
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ),
    (
      select s.end_date
      from public.subscriptions s
      where s.client_id = p.id
        and (public.is_admin() or s.tier = 'coaching')
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ),
    (
      select s.months
      from public.subscriptions s
      where s.client_id = p.id
        and (public.is_admin() or s.tier = 'coaching')
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ),

    (
      select count(*)
      from public.subscription_requests sr
      where sr.user_id = p.id and sr.status = 'pending'
    )::int,

    (
      select nq.status
      from public.nutrition_questionnaires nq
      where nq.client_id = p.id
      limit 1
    ),

    (
      select fq.status
      from public.fitness_questionnaires fq
      where fq.client_id = p.id
      limit 1
    ),

    ca.coach_id,
    cp.full_name

  from public.profiles p
  left join public.coach_assignments ca on ca.client_id = p.id
  left join public.profiles cp on cp.id = ca.coach_id
  where p.role = 'client'
    and (public.is_admin() or ca.coach_id = auth.uid())
  order by p.created_at desc
$$;

grant execute on function public.get_coach_client_list() to authenticated;

-- ============================================================
-- PART B — subscriptions RLS: coach sees coaching rows only;
--          direct insert/update revoked (wallet route is the only door)
-- ============================================================
drop policy if exists subs_select_owner_or_coach on public.subscriptions;
create policy subs_select_owner_or_coach
  on public.subscriptions for select
  using (
    auth.uid() = client_id
    or public.is_admin()
    or (public.is_coach_over(client_id) and tier = 'coaching')
  );

drop policy if exists subs_insert_self_or_coach on public.subscriptions;
create policy subs_insert_self_or_coach
  on public.subscriptions for insert
  with check (auth.uid() = client_id or public.is_admin());

drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- PART C — plans RLS: coach inserts need an ACTIVE coaching sub
--          (manual plans + AI draft materialization from the browser)
-- ============================================================
drop policy if exists plans_insert_coach on public.plans;
create policy plans_insert_coach
  on public.plans for insert
  with check (
    public.is_coach_over(client_id)
    and (
      public.is_admin()
      or exists (
        select 1 from public.subscriptions s
        where s.client_id = client_id
          and s.tier = 'coaching'
          and s.status = 'active'
          and (s.end_date is null or s.end_date > now())
      )
    )
  );

notify pgrst, 'reload schema';

-- ============================================================
-- VERIFY (run after paste)
-- ============================================================
-- V1: RPC rebuilt → expect t
select position('0041' in coalesce(pg_get_functiondef('public.get_coach_client_list()'::regprocedure),'')) > 0 as rpc_rebuilt;

-- V2: subscriptions policies → expect the 3 rows below
-- (pg_policies — information_schema.policies does not exist in Postgres)
select policyname, cmd
from pg_catalog.pg_policies
where schemaname = 'public' and tablename = 'subscriptions'
  and policyname in ('subs_select_owner_or_coach','subs_insert_self_or_coach','subs_update_self_or_coach')
order by 1;

-- V3: plans insert policy rebuilt → expect t
-- (plans_insert_coach is a POLICY, not a function → check with_check)
select position('exists (' in coalesce(with_check,'')) > 0 as plans_gate_active
from pg_catalog.pg_policies
where schemaname = 'public' and tablename = 'plans'
  and policyname = 'plans_insert_coach';

-- V4 (app-level): coach opens his client list → premium/pro rows gone.

-- END OF SCRIPT 0041
