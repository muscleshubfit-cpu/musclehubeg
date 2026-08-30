-- ============================================================================
-- MuscleHubEG — RUN ON SUPABASE — 0044 — subscription_requests POLICY SWEEP
-- ============================================================================
-- WHY (live-test evidence 2026-08-30):
--   The live authenticated walkthrough (5 fresh test accounts) PROVED that a
--   COACH can SELECT and UPDATE subscription_requests rows of users he is
--   NOT assigned to — e.g. the historical row 739a99f9… AND freshly created
--   pending requests. Plain clients correctly see only their own rows and
--   anon sees nothing, so the leak is staff-scoped.
--   The repo has NO such policy: 0010/0030/0030C used the "Coaches can %"
--   names (all dropped by 0043) and 0043's sr_admin_* use is_admin().
--   The 0043 verify matched policyname like 'Coaches can %' ONLY — so a
--   policy with ANY OTHER NAME (ad-hoc, exists only in the live DB, not in
--   any migration file) slipped past that gate. The sweep below removes
--   every policy regardless of its name and shows the culprit's exact name
--   in the final grid.
--
-- WHY IT MATTERS (attack chain):
--   A coach able to UPDATE subscription_requests could flip a pending row
--   to 'approved' and then call extend_subscription(…, p_request_id=…)
--   (0042 evidence gate) to activate a subscription WITHOUT the wallet
--   debit. Closing the SELECT/UPDATE leak closes that chain at the DB.
--
-- WHAT IT DOES
--   PART 1  BEFORE capture (temp tables, die with the session):
--           - every policy on public.subscription_requests (name/cmd/roles
--             + first 120 chars of qual / with_check)
--           - informational: schema-wide list of policies whose text
--             references is_staff( / is_coach( / is_coach_over( — shown in
--             the grid as probe_* but NOT touched by this migration
--             (any follow-up there is a separate decision).
--   PART 2  SWEEP: drops EVERY policy on subscription_requests whose name
--           is not on the whitelist, then rebuilds the five canonical
--           policies from scratch (exact 0010/0043 wording):
--             client: "Users can submit subscription requests" (insert-own)
--                     "Users can view their own subscription requests"
--                     (select-own — status tracking)
--             admin:  sr_admin_select / sr_admin_update / sr_admin_delete
--                     (using public.is_admin())
--           → notify pgrst, reload schema.
--   PART 3  ONE final grid (SQL Editor shows the last grid only):
--           probe BEFORE + sweep result + verify AFTER in a single row.
--
-- SAFETY
--   - Idempotent: re-running converges to the same whitelist state.
--   - No tables created/dropped; no grants changed; no data modified.
--   - Single transaction: any error rolls the whole script back.
--   - The app cannot break: payment review is admin-only by design
--     (/admin/payments + AdminPaymentsView + 0043 RLS). Coaches have no
--     legitimate read of subscription_requests anywhere in the code — the
--     mystery policy is precisely the leak 0043 meant to close.
--
-- PASTE SAFETY: open the RAW url (never the GitHub blob page) → select all
--   → Supabase SQL Editor → clear → paste → Ctrl+End must show:
--     END OF SCRIPT 0044
--   → Run → expect ONE grid, ONE row:
--     sweep_dropped_count >= 1 (the leaky policy/-ies, names in
--     sweep_dropped_names + full BEFORE inventory in probe_before_policies)
--     whitelist_only = t, admin_select/update/delete_present = t,
--     client_insert/select_present = t, staff_fn_refs_on_sr = 0,
--     rpc_pending_admin_only = t, types_remaining_mismatch = 0
-- ============================================================================

-- ============================================================
-- PART 1 — BEFORE state capture (temp, dies with the session)
-- ============================================================
create temp table sr_policies_before as
select policyname, cmd, roles,
       left(coalesce(qual, ''), 120)       as qual_head,
       left(coalesce(with_check, ''), 120) as with_check_head
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'subscription_requests';

create temp table sr_dropped as
select policyname, cmd from sr_policies_before where false;

-- informational only: staff-function references in policies anywhere
create temp table staff_fn_policies as
select tablename, policyname, cmd
from pg_catalog.pg_policies
where schemaname = 'public'
  and ( coalesce(qual, '')       ilike '%is_staff(%'
     or coalesce(qual, '')       ilike '%is_coach(%'
     or coalesce(with_check, '') ilike '%is_staff(%'
     or coalesce(with_check, '') ilike '%is_coach(%' );

-- ============================================================
-- PART 2 — SWEEP: whitelist-only on subscription_requests
-- ============================================================
do $sweep$
declare
  r record;
begin
  -- 2a. drop everything whose name is not on the whitelist
  for r in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename  = 'subscription_requests'
      and policyname not in (
        'Users can submit subscription requests',
        'Users can view their own subscription requests',
        'sr_admin_select',
        'sr_admin_update',
        'sr_admin_delete'
      )
  loop
    execute format(
      'drop policy if exists %I on public.subscription_requests',
      r.policyname
    );
    insert into sr_dropped (policyname, cmd)
      select r.policyname, cmd from sr_policies_before
      where policyname = r.policyname;
  end loop;

  -- 2b. canonical rebuild of the five whitelist policies (drop + create)
  execute $p$drop policy if exists "Users can submit subscription requests"
    on public.subscription_requests$p$;
  execute $p$create policy "Users can submit subscription requests"
    on public.subscription_requests for insert
    to authenticated
    with check (auth.uid() = user_id)$p$;

  execute $p$drop policy if exists "Users can view their own subscription requests"
    on public.subscription_requests$p$;
  execute $p$create policy "Users can view their own subscription requests"
    on public.subscription_requests for select
    to authenticated
    using (auth.uid() = user_id)$p$;

  execute $p$drop policy if exists sr_admin_select
    on public.subscription_requests$p$;
  execute $p$create policy sr_admin_select
    on public.subscription_requests for select
    to authenticated
    using (public.is_admin())$p$;

  execute $p$drop policy if exists sr_admin_update
    on public.subscription_requests$p$;
  execute $p$create policy sr_admin_update
    on public.subscription_requests for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin())$p$;

  execute $p$drop policy if exists sr_admin_delete
    on public.subscription_requests$p$;
  execute $p$create policy sr_admin_delete
    on public.subscription_requests for delete
    to authenticated
    using (public.is_admin())$p$;
end
$sweep$;

notify pgrst, 'reload schema';

-- ============================================================
-- PART 3 — ONE grid: probe (BEFORE) + sweep + verify (AFTER)
-- ============================================================
select
  (select count(*) from sr_policies_before)                        as probe_before_policy_count,
  (select coalesce(string_agg(policyname || ' [' || cmd || '] ' || qual_head, ' ||| '), '(none)')
     from sr_policies_before)                                      as probe_before_policies,

  (select count(*) from sr_dropped)                                as sweep_dropped_count,
  (select coalesce(string_agg(policyname || ' [' || cmd || ']', ' ||| '), '(nothing to drop)')
     from sr_dropped)                                              as sweep_dropped_names,

  (select not exists (
     select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'subscription_requests'
        and policyname not in (
          'Users can submit subscription requests',
          'Users can view their own subscription requests',
          'sr_admin_select', 'sr_admin_update', 'sr_admin_delete'
        )
   ))                                                              as whitelist_only,

  exists (select 1 from pg_catalog.pg_policies
           where schemaname='public' and tablename='subscription_requests'
             and policyname='sr_admin_select')                     as admin_select_present,
  exists (select 1 from pg_catalog.pg_policies
           where schemaname='public' and tablename='subscription_requests'
             and policyname='sr_admin_update')                     as admin_update_present,
  exists (select 1 from pg_catalog.pg_policies
           where schemaname='public' and tablename='subscription_requests'
             and policyname='sr_admin_delete')                     as admin_delete_present,
  exists (select 1 from pg_catalog.pg_policies
           where schemaname='public' and tablename='subscription_requests'
             and policyname='Users can submit subscription requests') as client_insert_present,
  exists (select 1 from pg_catalog.pg_policies
           where schemaname='public' and tablename='subscription_requests'
             and policyname='Users can view their own subscription requests') as client_select_present,

  (select count(*) from pg_catalog.pg_policies
    where schemaname='public' and tablename='subscription_requests'
      and ( coalesce(qual,'')       ilike any(array['%is_staff(%','%is_coach(%','%is_coach_over(%'])
         or coalesce(with_check,'') ilike any(array['%is_staff(%','%is_coach(%','%is_coach_over(%']) )
  )                                                                as staff_fn_refs_on_sr,

  (select count(*) from staff_fn_policies)                         as probe_staff_fn_policies_schema_wide,
  (select coalesce(string_agg(tablename || '.' || policyname || ' [' || cmd || ']', ' | '), '(none)')
     from staff_fn_policies)                                       as probe_staff_fn_policy_names,

  (select position('case when public.is_admin() then' in
     coalesce(pg_get_functiondef('public.get_coach_client_list()'::regprocedure), '')) > 0
   and position('else 0 end::int' in
     coalesce(pg_get_functiondef('public.get_coach_client_list()'::regprocedure), '')) > 0
  )                                                                as rpc_pending_admin_only,

  (select count(*) from public.subscriptions
    where (tier = 'coaching'
            and coalesce(subscription_type, '') <> 'coaching')
       or (tier in ('premium','pro')
            and coalesce(subscription_type, '') <> 'membership')
  )                                                                as types_remaining_mismatch;

-- END OF SCRIPT 0044
