-- =====================================================================
-- RUN ON SUPABASE — 0043 PAYMENTS ADMIN-ONLY + MODEL REALIGNMENT
-- (owner decree 2026-08-30: terminology separation + «تم» on plan 6)
-- =====================================================================
-- OWNER MODEL (final, documented in AGENTS.md law 10):
--   1) SITE COACHING / كوتشينج الموقع (B2C — ADMIN ONLY):
--      everything sold on /memberships (premium, pro, the site's own
--      coaching product). Client pays THE SITE (PayPal auto-activate,
--      or manual InstaPay/Vodafone Cash + receipt → subscription_requests).
--      ONLY THE ADMIN reviews those requests. Coaches never see them.
--   2) COACH SYSTEM / نظام المدربين (B2B — external, per coach):
--      the coach collects from HIS client OUTSIDE the site, activates
--      from the client page (/api/coach/subscriptions/activate), the
--      site debits the coach WALLET ($6/month, $16/3-months) and logs
--      coach_payments. Repeated wallet debits = duration extensions /
--      renewals. Coaches NEVER see or review site payment requests.
--
-- THIS MIGRATION:
--   PART 1  subscription_requests RLS → review is ADMIN-ONLY.
--           Drops the three coach policies (0010/0030 lineage) and
--           adds explicit admin policies. Client insert-own and
--           select-own are untouched (the checkout flow still works).
--   PART 2  get_coach_client_list(): pending_payments is now a real
--           count for ADMINS ONLY — coaches always get 0 (the pill,
--           the tab counter and the banner disappear for them).
--   PART 3  OLD-DATA REALIGNMENT: subscriptions.subscription_type is
--           normalized to the tier (coaching → 'coaching', premium/pro
--           → 'membership'). The pre-fix state is captured in a temp
--           probe table so the final grid shows WHAT EXISTED before
--           the fix + confirmation that nothing is left mismatched.
--   PART 4  ONE final grid (editor shows the last grid only): probe
--           numbers + verify booleans, all in a single row.
--
-- SAFETY: idempotent; no tables dropped; no grants changed except the
--   re-grant of the rebuilt RPC. Temp probe table dies with session.
-- PASTE SAFETY: raw url only → SQL Editor → Ctrl+End must show:
--   END OF SCRIPT 0043   → Run → expect ONE grid, ONE row:
--     coach_policies_gone=t, admin_policies_present=t,
--     client_policies_intact=t, rpc_pending_admin_only=t,
--     types_remaining_mismatch=0  (+ probe_* columns showing old state)
-- =====================================================================

-- ============================================================
-- PART 0 — capture the OLD state BEFORE any change (probe)
-- ============================================================
create temp table probe_0043 as
select
  (select count(*) from public.subscription_requests)::int
    as probe_requests_total,
  (select count(*) from public.subscription_requests
     where status = 'pending')::int
    as probe_pending_total,
  (select count(*) from public.subscription_requests
     where status = 'pending' and plan_tier = 'coaching')::int
    as probe_pending_coaching,
  (select count(*) from public.subscription_requests
     where status = 'pending' and plan_tier in ('premium','pro'))::int
    as probe_pending_site_memberships,
  (select count(*) from public.subscription_requests
     where status = 'approved')::int
    as probe_approved_total,
  (select count(*) from public.subscription_requests
     where status = 'rejected')::int
    as probe_rejected_total,
  -- Old-loophole evidence: coaches who activated SITE memberships
  -- via the pre-0042 guard (tier recorded in the coach ledger).
  (select count(*) from public.coach_payments
     where tier <> 'coaching')::int
    as probe_coach_ledger_non_coaching,
  -- Old-data misalignment: subscription_type not matching the tier.
  (select count(*) from public.subscriptions
     where (tier = 'coaching'
             and coalesce(subscription_type, '') <> 'coaching')
        or (tier in ('premium','pro')
             and coalesce(subscription_type, '') <> 'membership'))::int
    as probe_type_mismatches;

-- ============================================================
-- PART 1 — subscription_requests RLS: review moves to ADMIN
-- ============================================================
drop policy if exists "Coaches can view subscription requests"
  on public.subscription_requests;
drop policy if exists "Coaches can review subscription requests"
  on public.subscription_requests;
drop policy if exists "Coaches can delete subscription requests"
  on public.subscription_requests;

-- Admin review surface (browser: /admin/payments → reviewSubscriptionRequest)
drop policy if exists sr_admin_select on public.subscription_requests;
create policy sr_admin_select
  on public.subscription_requests for select
  to authenticated
  using (public.is_admin());

drop policy if exists sr_admin_update on public.subscription_requests;
create policy sr_admin_update
  on public.subscription_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists sr_admin_delete on public.subscription_requests;
create policy sr_admin_delete
  on public.subscription_requests for delete
  to authenticated
  using (public.is_admin());

-- (Client insert-own / select-own from 0010 stay as-is — checkout flow.)

-- ============================================================
-- PART 2 — get_coach_client_list(): pending_payments = admin-only
--          (same signature/columns as 0041; only this column changes)
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

    -- 0043 MODEL: site payment requests are the ADMIN's business.
    -- Coaches always get 0 → the pending-payment pill, tab counter
    -- and review banner disappear from every coach dashboard.
    case when public.is_admin() then
    (
      select count(*)
      from public.subscription_requests sr
      where sr.user_id = p.id and sr.status = 'pending'
    )::int
    else 0 end::int,

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
-- PART 3 — old-data realignment: subscription_type follows the tier
-- ============================================================
update public.subscriptions
   set subscription_type = 'coaching'
 where tier = 'coaching'
   and coalesce(subscription_type, '') <> 'coaching';

update public.subscriptions
   set subscription_type = 'membership'
 where tier in ('premium','pro')
   and coalesce(subscription_type, '') <> 'membership';

notify pgrst, 'reload schema';

-- ============================================================
-- PART 4 — ONE grid: probe (old state) + verify (new state)
-- ============================================================
select
  probe.probe_requests_total,
  probe.probe_pending_total,
  probe.probe_pending_coaching,
  probe.probe_pending_site_memberships,
  probe.probe_approved_total,
  probe.probe_rejected_total,
  probe.probe_coach_ledger_non_coaching,
  probe.probe_type_mismatches,

  (select not exists (
     select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'subscription_requests'
        and policyname like 'Coaches can %'
   )) as coach_policies_gone,

  (select count(*) from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_requests'
      and policyname in ('sr_admin_select','sr_admin_update','sr_admin_delete')
  ) = 3 as admin_policies_present,

  (select count(*) from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_requests'
      and policyname in ('Users can submit subscription requests',
                         'Users can view their own subscription requests')
  ) = 2 as client_policies_intact,

  (select position('case when public.is_admin() then' in
     coalesce(pg_get_functiondef('public.get_coach_client_list()'::regprocedure), '')) > 0
   and position('else 0 end::int' in
     coalesce(pg_get_functiondef('public.get_coach_client_list()'::regprocedure), '')) > 0
  ) as rpc_pending_admin_only,

  (select count(*) from public.subscriptions
    where (tier = 'coaching'
            and coalesce(subscription_type, '') <> 'coaching')
       or (tier in ('premium','pro')
            and coalesce(subscription_type, '') <> 'membership')
  ) as types_remaining_mismatch

from probe_0043 probe;

-- END OF SCRIPT 0043
